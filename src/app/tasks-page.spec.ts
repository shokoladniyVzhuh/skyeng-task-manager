import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { TasksPage } from './tasks-page';
import { Task } from './task.types';

describe('TasksPage', () => {
  const snackBar = { open: vi.fn() };
  const task: Task = {
    id: 1,
    title: 'Prepare report',
    status: 'new',
    createdAt: '2026-10-01T09:30:00.000Z',
  };

  beforeEach(async () => {
    snackBar.open.mockReset();

    await TestBed.configureTestingModule({
      imports: [TasksPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('distinguishes an empty list from an empty filter result', () => {
    const fixture = TestBed.createComponent(TasksPage);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    http.expectOne('http://localhost:3000/tasks').flush([]);
    fixture.detectChanges();
    expect(element.textContent).toContain('No tasks yet.');

    fixture.componentInstance.statusFilter$.next('done');
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);
    fixture.detectChanges();
    expect(element.textContent).toContain('No tasks with this status.');
  });

  it('retries a failed load with the selected filter', () => {
    const fixture = TestBed.createComponent(TasksPage);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne('http://localhost:3000/tasks').flush([]);

    fixture.componentInstance.statusFilter$.next('new');
    http.expectOne('http://localhost:3000/tasks?status=new').flush('Unavailable', {
      status: 500,
      statusText: 'Server Error',
    });
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Could not load tasks.');

    fixture.componentInstance.retryLoad();
    http.expectOne('http://localhost:3000/tasks?status=new').flush([task]);
    fixture.detectChanges();
    expect(element.textContent).toContain('Prepare report');
  });

  it('opens the dialog from the filters and confirms creation under the active filter', async () => {
    const fixture = TestBed.createComponent(TasksPage);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne('http://localhost:3000/tasks').flush([]);

    fixture.componentInstance.statusFilter$.next('done');
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);

    element.querySelector<HTMLButtonElement>('.create-task-button')!.click();
    fixture.detectChanges();
    const dialog = TestBed.inject(MatDialog);
    expect(dialog.openDialogs).toHaveLength(1);
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('app-create-task-dialog')).not.toBeNull();

    const ref = dialog.openDialogs[0];
    const closed = firstValueFrom(ref.afterClosed());
    ref.close(task);
    await closed;

    expect(snackBar.open).toHaveBeenCalledWith('Task created.', undefined, { duration: 4000 });
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);
    fixture.detectChanges();
    expect(element.textContent).toContain('No tasks with this status.');
  });

  it('does not reload or confirm creation when the dialog is cancelled', async () => {
    const fixture = TestBed.createComponent(TasksPage);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne('http://localhost:3000/tasks').flush([task]);
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.create-task-button')!.click();
    fixture.detectChanges();
    const ref = TestBed.inject(MatDialog).openDialogs[0];
    const closed = firstValueFrom(ref.afterClosed());
    ref.close();
    await closed;

    http.expectNone('http://localhost:3000/tasks');
    expect(snackBar.open).not.toHaveBeenCalled();
    fixture.detectChanges();
    expect(element.textContent).toContain('Prepare report');
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
  });

  it('blocks a duplicate status request and keeps the old status after a failure', () => {
    const fixture = TestBed.createComponent(TasksPage);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    const otherTask = { ...task, id: 2, title: 'Second task' };
    http.expectOne('http://localhost:3000/tasks').flush([task, otherTask]);
    fixture.detectChanges();

    const change = { id: 1, status: 'in_progress' as const };
    fixture.componentInstance.updateTaskStatus(change);
    const firstPatch = http.expectOne('http://localhost:3000/tasks/1');
    expect(firstPatch.request.method).toBe('PATCH');
    fixture.componentInstance.updateTaskStatus(change);
    http.expectNone('http://localhost:3000/tasks/1');
    fixture.detectChanges();
    const buttons = element.querySelectorAll<HTMLButtonElement>('mat-card button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);

    firstPatch.flush('Unavailable', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not update the task status.',
    );
    expect(element.querySelector('mat-card')?.textContent).toContain('New');
    expect(element.querySelector<HTMLButtonElement>('mat-card button')?.disabled).toBe(false);

    fixture.componentInstance.updateTaskStatus(change);
    http.expectOne('http://localhost:3000/tasks/1').flush({ ...task, status: 'in_progress' });
    http
      .expectOne('http://localhost:3000/tasks')
      .flush([{ ...task, status: 'in_progress' }, otherTask]);
    fixture.detectChanges();
    expect(element.querySelector('mat-card')?.textContent).toContain('Move to Done');

    fixture.componentInstance.updateTaskStatus({ id: 1, status: 'done' });
    http.expectOne('http://localhost:3000/tasks/1').flush({ ...task, status: 'done' });
    http.expectOne('http://localhost:3000/tasks').flush([{ ...task, status: 'done' }, otherTask]);
    fixture.detectChanges();
    const completedCard = [...element.querySelectorAll('mat-card')].find((card) =>
      card.textContent?.includes('Prepare report'),
    );
    expect(completedCard?.querySelector('button')).toBeNull();
  });

  it('renders creation time in the browser timezone', () => {
    const fixture = TestBed.createComponent(TasksPage);
    const http = TestBed.inject(HttpTestingController);
    const element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
    http.expectOne('http://localhost:3000/tasks').flush([task]);
    fixture.detectChanges();

    const localHour = String(new Date(task.createdAt).getHours()).padStart(2, '0');
    expect(element.querySelector('.created-at')?.textContent).toContain(
      `01.10.2026 ${localHour}:30`,
    );
  });
});
