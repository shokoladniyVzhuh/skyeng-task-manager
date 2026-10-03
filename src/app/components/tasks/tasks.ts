import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';

@Component({
  imports: [AsyncPipe],
  selector: 'app-tasks',
  template: `
    <div>
      @if (tasks$ | async; as tasks) {
        @for (task of tasks; track task.id) {
          <h3>{{ task.title }}</h3>
          @if (task.description) {
            <p>{{ task.description }}</p>
          }
        }
      } @else {
        <p>Loading...</p>
      }
    </div>
  `,
  styles: ``,
})
export class Tasks {
  tasksUrl = 'http://localhost:3000/tasks';
  private http = inject(HttpClient);

  tasks$ = this.http.get<Task[]>(this.tasksUrl);
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  createdAt: string;
}
