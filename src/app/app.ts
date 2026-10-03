import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { Filters } from './components/filters/filters';
import { Tasks } from './components/tasks/tasks';
import { Header } from './layout/header/header';

import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  finalize,
  map,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';

import { SortOrder, StatusFilter, Task, TaskStatus } from './task.types';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
}

const loadingState: TasksState = {
  tasks: [],
  loading: true,
  error: null,
};

@Component({
  imports: [AsyncPipe, RouterOutlet, MatButtonModule, MatSnackBarModule, Header, Filters, Tasks],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <app-header />
    <app-filters
      [status]="statusFilter$.value"
      [order]="sortOrder$.value"
      (changeStatus)="statusFilter$.next($event)"
      (changeOrder)="sortOrder$.next($event)"
      (taskCreated)="onTaskCreated()"
    />

    @if (statusChangeError(); as error) {
      <p role="alert">{{ error }}</p>
    }

    @if (viewState$ | async; as state) {
      @if (state.loading) {
        <p>Loading...</p>
      } @else if (state.error) {
        <p role="alert">{{ state.error }}</p>
        <button type="button" matButton="outlined" (click)="retryLoad()">Try again</button>
      } @else if (state.tasks.length === 0) {
        <p>{{ statusFilter$.value === 'all' ? 'No tasks yet.' : 'No tasks with this status.' }}</p>
      } @else {
        <app-tasks
          [tasks]="state.tasks"
          [pendingStatusIds]="pendingStatusIds()"
          (changeTaskStatus)="updateTaskStatus($event)"
        />
      }
    }
    <router-outlet />
  `,
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);

  readonly statusFilter$ = new BehaviorSubject<StatusFilter>('all');
  readonly sortOrder$ = new BehaviorSubject<SortOrder>('newest');

  readonly statusChangeError = signal<string | null>(null);
  readonly pendingStatusIds = signal<ReadonlySet<number>>(new Set());
  private readonly reloadTasks$ = new Subject<void>();

  updateTaskStatus(change: { id: number; status: TaskStatus }) {
    if (this.pendingStatusIds().has(change.id)) return;

    this.statusChangeError.set(null);
    this.pendingStatusIds.update((ids) => new Set(ids).add(change.id));

    this.http
      .patch<Task>(`http://localhost:3000/tasks/${change.id}`, { status: change.status })
      .pipe(
        finalize(() => {
          this.pendingStatusIds.update((ids) => {
            const next = new Set(ids);
            next.delete(change.id);
            return next;
          });
        }),
      )
      .subscribe({
        next: () => {
          this.reloadTasks$.next();
        },
        error: () => {
          this.statusChangeError.set('Could not update the task status.');
        },
      });
  }

  onTaskCreated() {
    this.reloadTasks$.next();
    this.snackBar.open('Task created.', undefined, { duration: 4000 });
  }

  retryLoad() {
    this.reloadTasks$.next();
  }

  private readonly loadedState$ = combineLatest([
    this.statusFilter$.pipe(distinctUntilChanged()),
    this.reloadTasks$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([status]) => {
      const params: Record<string, string> = status === 'all' ? {} : { status };

      return this.http.get<Task[]>('http://localhost:3000/tasks', { params }).pipe(
        map((tasks): TasksState => ({
          tasks,
          loading: false,
          error: null,
        })),

        startWith(loadingState),

        catchError(() =>
          of<TasksState>({
            tasks: [],
            loading: false,
            error: 'Could not load tasks.',
          }),
        ),
      );
    }),
  );

  readonly viewState$ = combineLatest([this.loadedState$, this.sortOrder$]).pipe(
    map(([state, order]) => ({
      ...state,
      tasks: sortTasks(state.tasks, order),
    })),
  );
}

function sortTasks(tasks: Task[], order: SortOrder): Task[] {
  return [...tasks].sort((a, b) => {
    const difference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    return order === 'oldest' ? difference : -difference;
  });
}
