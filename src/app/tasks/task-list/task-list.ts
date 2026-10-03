import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import {
  MatCard,
  MatCardContent,
  MatCardFooter,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';

import { MatAnchor } from '@angular/material/button';
import { canChangeTaskStatus, getNextTaskStatus } from '../task-status';
import { Task, TaskStatus } from '../task.types';

@Component({
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardFooter,
    MatAnchor,
    DatePipe,
  ],
  selector: 'app-task-list',
  template: `
    <div class="tasks">
      @for (task of tasks(); track task.id) {
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ task.title }}</mat-card-title>
          </mat-card-header>

          @if (task.description) {
            <mat-card-content>{{ task.description }}</mat-card-content>
          }

          <mat-card-footer>
            <div>
              <span class="task-status">{{ statusLabels[task.status] }}</span>
              @if (nextStatus(task.status); as next) {
                <button
                  type="button"
                  matButton="outlined"
                  [disabled]="pendingStatusIds().has(task.id)"
                  (click)="requestStatusChange(task, next)"
                >
                  Move to {{ statusLabels[next] }}
                </button>
              }
            </div>
            <span class="created-at">
              {{ task.createdAt | date: 'dd.MM.yyyy HH:mm' }}
            </span>
          </mat-card-footer>
        </mat-card>
      }
    </div>
  `,
  styleUrl: './task-list.css',
})
export class TaskList {
  readonly tasks = input.required<Task[]>();
  readonly pendingStatusIds = input.required<ReadonlySet<number>>();

  readonly statusLabels: Record<TaskStatus, string> = {
    new: 'New',
    in_progress: 'In Progress',
    done: 'Done',
  };

  readonly nextStatus = getNextTaskStatus;

  readonly changeTaskStatus = output<{
    id: number;
    status: TaskStatus;
  }>();

  requestStatusChange(task: Task, target: TaskStatus) {
    if (this.pendingStatusIds().has(task.id) || !canChangeTaskStatus(task.status, target)) {
      return;
    }

    this.changeTaskStatus.emit({
      id: task.id,
      status: target,
    });
  }
}
