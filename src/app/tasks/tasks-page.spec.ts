import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom, take } from 'rxjs';
import { routes } from '../app.routes';
import { Task } from './task.types';
import { TasksPage } from './tasks-page';

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
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        provideLocationMocks(),
      ],
    })
      .overrideProvider(MatSnackBar, { useValue: snackBar })
      .compileComponents();
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  async function openPage(url = '/tasks') {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl(url, TasksPage);
    const http = TestBed.inject(HttpTestingController);
    const element = harness.routeNativeElement!;
    return { harness, page, http, element };
  }

  it.each(['new', 'in_progress', 'done'] as const)(
    'restores the %s filter from a direct URL with one initial request',
    async (status) => {
      const { harness, page, http, element } = await openPage(`/tasks?status=${status}`);
      http.expectOne(`http://localhost:3000/tasks?status=${status}`).flush([{ ...task, status }]);
      harness.detectChanges();

      expect(page.selectedStatus()).toBe(status);
      expect(element.querySelector('mat-select')?.textContent).toContain(
        { new: 'New', in_progress: 'In Progress', done: 'Done' }[status],
      );
      expect(element.textContent).toContain(task.title);
    },
  );

  it('falls back to all tasks for an unknown URL status', async () => {
    const { harness, page, http, element } = await openPage('/tasks?status=unknown');
    http.expectOne('http://localhost:3000/tasks').flush([task]);
    harness.detectChanges();

    expect(page.selectedStatus()).toBe('all');
    expect(element.querySelector('mat-select')?.textContent).toContain('All tasks');
    expect(element.textContent).toContain(task.title);
  });

  it('writes the status to the URL, preserves other parameters and removes status for all', async () => {
    const { harness, page, http } = await openPage('/tasks?status=new&keep=yes');
    const router = TestBed.inject(Router);
    http.expectOne('http://localhost:3000/tasks?status=new').flush([task]);

    await page.selectStatus('done');
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);
    expect(router.parseUrl(router.url).queryParams).toEqual({ status: 'done', keep: 'yes' });

    await page.selectStatus('all');
    http.expectOne('http://localhost:3000/tasks').flush([task]);
    harness.detectChanges();
    expect(router.parseUrl(router.url).queryParams).toEqual({ keep: 'yes' });
    expect(page.selectedStatus()).toBe('all');
  });

  it('restores the filter and requests the matching list on Back and Forward', async () => {
    const { harness, page, http, element } = await openPage();
    const router = TestBed.inject(Router);
    const location = TestBed.inject(Location);
    router.setUpLocationChangeListener();
    http.expectOne('http://localhost:3000/tasks').flush([]);

    await page.selectStatus('new');
    http.expectOne('http://localhost:3000/tasks?status=new').flush([task]);
    await page.selectStatus('done');
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);

    const backNavigation = firstValueFrom(
      router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      ),
    );
    location.back();
    await backNavigation;
    http.expectOne('http://localhost:3000/tasks?status=new').flush([task]);
    harness.detectChanges();
    expect(page.selectedStatus()).toBe('new');
    expect(element.textContent).toContain(task.title);

    const forwardNavigation = firstValueFrom(
      router.events.pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      ),
    );
    location.forward();
    await forwardNavigation;
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);
    harness.detectChanges();
    expect(page.selectedStatus()).toBe('done');
    expect(element.textContent).toContain('No tasks with this status.');
  });

  it('cancels the previous load when filters change quickly', async () => {
    const { harness, page, http, element } = await openPage();
    http.expectOne('http://localhost:3000/tasks').flush([]);

    await page.selectStatus('new');
    const oldRequest = http.expectOne('http://localhost:3000/tasks?status=new');
    await page.selectStatus('done');
    expect(oldRequest.cancelled).toBe(true);

    const doneTask = { ...task, title: 'Completed task', status: 'done' as const };
    http.expectOne('http://localhost:3000/tasks?status=done').flush([doneTask]);
    harness.detectChanges();
    expect(element.textContent).toContain(doneTask.title);
    expect(element.textContent).not.toContain(task.title);
    expect(page.selectedStatus()).toBe('done');
  });

  it('does not reload the list when only an unrelated URL parameter changes', async () => {
    const { harness, http, element } = await openPage('/tasks?status=new');
    http.expectOne('http://localhost:3000/tasks?status=new').flush([task]);

    await TestBed.inject(Router).navigateByUrl('/tasks?status=new&keep=yes');
    harness.detectChanges();
    http.expectNone(() => true);
    expect(element.textContent).toContain(task.title);
  });

  it('distinguishes an empty list from an empty filter result', async () => {
    const { harness, page, http, element } = await openPage();

    http.expectOne('http://localhost:3000/tasks').flush([]);
    harness.detectChanges();
    expect(element.textContent).toContain('No tasks yet.');

    await page.selectStatus('done');
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);
    harness.detectChanges();
    expect(element.textContent).toContain('No tasks with this status.');
  });

  it('retries a failed load with the selected filter', async () => {
    const { harness, page, http, element } = await openPage();
    http.expectOne('http://localhost:3000/tasks').flush([]);

    await page.selectStatus('new');
    http.expectOne('http://localhost:3000/tasks?status=new').flush('Unavailable', {
      status: 500,
      statusText: 'Server Error',
    });
    harness.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Could not load tasks.');

    page.retryLoad();
    http.expectOne('http://localhost:3000/tasks?status=new').flush([task]);
    harness.detectChanges();
    expect(element.textContent).toContain('Prepare report');
  });

  it('changes the displayed sort order without another HTTP request', async () => {
    const { harness, page, http, element } = await openPage();
    const newerTask: Task = {
      ...task,
      id: 2,
      title: 'Newer task',
      createdAt: '2026-10-02T09:30:00.000Z',
    };
    harness.detectChanges();
    http.expectOne('http://localhost:3000/tasks').flush([task, newerTask]);
    harness.detectChanges();

    const titles = () =>
      [...element.querySelectorAll('mat-card-title')].map((title) => title.textContent?.trim());
    expect(titles()).toEqual(['Newer task', 'Prepare report']);

    page.sortOrder$.next('oldest');
    harness.detectChanges();

    expect(titles()).toEqual(['Prepare report', 'Newer task']);
    http.expectNone('http://localhost:3000/tasks');
  });

  it('opens the dialog from the filters and confirms creation under the active filter', async () => {
    const { harness, page, http, element } = await openPage();
    http.expectOne('http://localhost:3000/tasks').flush([]);

    await page.selectStatus('done');
    http.expectOne('http://localhost:3000/tasks?status=done').flush([]);

    element.querySelector<HTMLButtonElement>('.create-task-button')!.click();
    harness.detectChanges();
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
    harness.detectChanges();
    expect(element.textContent).toContain('No tasks with this status.');
  });

  it('does not reload or confirm creation when the dialog is cancelled', async () => {
    const { harness, page, http, element } = await openPage();
    http.expectOne('http://localhost:3000/tasks').flush([task]);
    harness.detectChanges();

    element.querySelector<HTMLButtonElement>('.create-task-button')!.click();
    harness.detectChanges();
    const ref = TestBed.inject(MatDialog).openDialogs[0];
    const closed = firstValueFrom(ref.afterClosed());
    ref.close();
    await closed;

    http.expectNone('http://localhost:3000/tasks');
    expect(snackBar.open).not.toHaveBeenCalled();
    harness.detectChanges();
    expect(element.textContent).toContain('Prepare report');
    expect(TestBed.inject(MatDialog).openDialogs).toHaveLength(0);
  });

  it('blocks a duplicate status request and keeps the old status after a failure', async () => {
    const { harness, page, http, element } = await openPage();
    const otherTask = { ...task, id: 2, title: 'Second task' };
    http.expectOne('http://localhost:3000/tasks').flush([task, otherTask]);
    harness.detectChanges();

    const change = { id: 1, status: 'in_progress' as const };
    element.querySelector<HTMLButtonElement>('mat-card button[matbutton="filled"]')!.click();
    const firstPatch = http.expectOne('http://localhost:3000/tasks/1');
    expect(firstPatch.request.method).toBe('PATCH');
    expect(firstPatch.request.body).toEqual({ status: 'in_progress' });
    page.updateTaskStatus(change);
    http.expectNone('http://localhost:3000/tasks/1');
    harness.detectChanges();
    const buttons = element.querySelectorAll<HTMLButtonElement>(
      'mat-card button[matbutton="filled"]',
    );
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);

    firstPatch.flush('Unavailable', { status: 500, statusText: 'Server Error' });
    harness.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not update the task status.',
    );
    expect(element.querySelector('mat-card')?.textContent).toContain('New');
    expect(
      element.querySelector<HTMLButtonElement>('mat-card button[matbutton="filled"]')?.disabled,
    ).toBe(false);

    page.updateTaskStatus(change);
    http.expectOne('http://localhost:3000/tasks/1').flush({ ...task, status: 'in_progress' });
    http
      .expectOne('http://localhost:3000/tasks')
      .flush([{ ...task, status: 'in_progress' }, otherTask]);
    harness.detectChanges();
    expect(element.querySelector('mat-card button[matbutton="filled"]')?.textContent).toContain(
      'Done',
    );

    page.updateTaskStatus({ id: 1, status: 'done' });
    http.expectOne('http://localhost:3000/tasks/1').flush({ ...task, status: 'done' });
    http.expectOne('http://localhost:3000/tasks').flush([{ ...task, status: 'done' }, otherTask]);
    harness.detectChanges();
    const completedCard = [...element.querySelectorAll('mat-card')].find((card) =>
      card.textContent?.includes('Prepare report'),
    );
    expect(completedCard?.querySelector('button[matbutton="filled"]')).toBeNull();
    expect(completedCard?.textContent).toContain('Done');
  });

  it('renders creation time in the browser timezone', async () => {
    const { harness, page, http, element } = await openPage();
    http.expectOne('http://localhost:3000/tasks').flush([task]);
    harness.detectChanges();

    const localHour = String(new Date(task.createdAt).getHours()).padStart(2, '0');
    expect(element.querySelector('.created-at')?.textContent).toContain(
      `01.10.2026 ${localHour}:30`,
    );
  });
});
