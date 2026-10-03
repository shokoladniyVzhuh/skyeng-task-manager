import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { CreateTaskDialog } from './create-task-dialog';

describe('CreateTaskDialog', () => {
  const dialogRef = { disableClose: false, close: vi.fn() };

  beforeEach(async () => {
    dialogRef.disableClose = false;
    dialogRef.close.mockReset();

    await TestBed.configureTestingModule({
      imports: [CreateTaskDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();
  });

  it('shows a validation error for a title made of spaces', async () => {
    const fixture = TestBed.createComponent(CreateTaskDialog);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const title = element.querySelector<HTMLInputElement>('input[name="title"]')!;

    expect(element.querySelector('mat-error')).toBeNull();

    title.value = '   ';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    title.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('mat-error')?.textContent).toContain('Enter a task title.');
    http.expectNone('http://localhost:3000/tasks');
  });

  it('keeps the draft after a failed POST and closes only after a successful retry', async () => {
    const fixture = TestBed.createComponent(CreateTaskDialog);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const title = element.querySelector<HTMLInputElement>('input[name="title"]')!;
    const description = element.querySelector<HTMLTextAreaElement>('textarea[name="description"]')!;
    const form = element.querySelector<HTMLFormElement>('form')!;

    title.value = 'New task';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    description.value = 'Draft description';
    description.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    const firstRequest = http.expectOne('http://localhost:3000/tasks');
    expect(firstRequest.request.method).toBe('POST');
    expect(firstRequest.request.body).toMatchObject({
      title: 'New task',
      description: 'Draft description',
      status: 'new',
    });
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(true);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    http.expectNone('http://localhost:3000/tasks');

    firstRequest.flush('Server unavailable', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(title.value).toBe('New task');
    expect(description.value).toBe('Draft description');
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Could not create the task.',
    );
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    const retryRequest = http.expectOne('http://localhost:3000/tasks');
    const createdTask = { id: 2, ...retryRequest.request.body };
    retryRequest.flush(createdTask);

    expect(dialogRef.close).toHaveBeenCalledExactlyOnceWith(createdTask);
    http.verify();
  });
});
