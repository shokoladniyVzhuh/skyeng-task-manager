import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CreateTaskData, StatusFilter, Task, TaskStatus } from './task.types';

@Injectable({ providedIn: 'root' })
export class TasksApi {
  private readonly http = inject(HttpClient);
  private readonly tasksUrl = 'http://localhost:3000/tasks';

  getTasks(status: StatusFilter): Observable<Task[]> {
    const params: Record<string, string> = status === 'all' ? {} : { status };

    return this.http.get<Task[]>(this.tasksUrl, { params });
  }

  createTask(data: CreateTaskData): Observable<Task> {
    return this.http.post<Task>(this.tasksUrl, {
      title: data.title,
      description: data.description,
      status: 'new',
      createdAt: new Date().toISOString(),
    });
  }

  updateTaskStatus(id: number, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${this.tasksUrl}/${id}`, { status });
  }
}
