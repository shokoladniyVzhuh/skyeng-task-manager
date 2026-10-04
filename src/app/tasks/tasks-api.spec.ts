import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { StatusFilter, Task } from './task.types';
import { TasksApi } from './tasks-api';

describe('TasksApi', () => {
  const task: Task = {
    id: 1,
    title: 'Prepare report',
    status: 'new',
    createdAt: '2026-10-01T09:30:00.000Z',
  };
  let api: TasksApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TasksApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each<StatusFilter>(['all', 'new', 'in_progress', 'done'])(
    'requests the server-side %s filter',
    async (status) => {
      const result = firstValueFrom(api.getTasks(status));
      const url = `http://localhost:3000/tasks${status === 'all' ? '' : `?status=${status}`}`;
      const request = http.expectOne(url);
      expect(request.request.method).toBe('GET');
      const response = [{ ...task, status: status === 'all' ? 'new' : status }];
      request.flush(response);
      expect(await result).toEqual(response);
    },
  );

  it('creates a new task with a client timestamp and returns the server-assigned ID', async () => {
    const startedAt = Date.now();
    const result = firstValueFrom(api.createTask({ title: task.title, description: 'Details' }));
    const request = http.expectOne('http://localhost:3000/tasks');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: task.title,
      description: 'Details',
      status: 'new',
      createdAt: expect.any(String),
    });
    const timestamp = Date.parse(request.request.body.createdAt);
    expect(timestamp).toBeGreaterThanOrEqual(startedAt);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
    expect(new Date(timestamp).toISOString()).toBe(request.request.body.createdAt);

    const created = { ...request.request.body, id: 7 };
    request.flush(created);
    expect(await result).toEqual(created);
  });

  it('creates a task without an optional description', async () => {
    const result = firstValueFrom(api.createTask({ title: task.title }));
    const request = http.expectOne('http://localhost:3000/tasks');
    expect(JSON.parse(request.request.serializeBody() as string)).not.toHaveProperty('description');
    request.flush(task);
    expect(await result).toEqual(task);
  });

  it('patches only the status at the task URL and returns the updated task', async () => {
    const result = firstValueFrom(api.updateTaskStatus(task.id, 'in_progress'));
    const request = http.expectOne('http://localhost:3000/tasks/1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'in_progress' });
    const updated = { ...task, status: 'in_progress' as const };
    request.flush(updated);
    expect(await result).toEqual(updated);
  });

  it('propagates a server error so the page can show a retry action', async () => {
    const result = firstValueFrom(api.getTasks('new'));
    const rejected = expect(result).rejects.toMatchObject({ status: 500 });
    http.expectOne('http://localhost:3000/tasks?status=new').flush('Unavailable', {
      status: 500,
      statusText: 'Server Error',
    });
    await rejected;
  });
});
