import { AsyncPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { CreateTaskDialog } from './create-task-dialog/create-task-dialog';
import { TaskFilters } from './task-filters/task-filters';
import { TaskList } from './task-list/task-list';

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

import { sortTasks } from './sort-tasks';
import { SortOrder, StatusFilter, Task, TaskStatus } from './task.types';
import { TasksApi } from './tasks-api';

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

function parseStatusFilter(value: string | null): StatusFilter {
  switch (value) {
    case 'new':
    case 'in_progress':
    case 'done':
      return value;
    default:
      return 'all';
  }
}

@Component({
  imports: [AsyncPipe, MatButtonModule, MatSnackBarModule, TaskFilters, TaskList],
  selector: 'app-tasks-page',
  styleUrl: './tasks-page.scss',
  template: `
    <app-task-filters
      [status]="selectedStatus()"
      [order]="sortOrder$.value"
      (changeStatus)="selectStatus($event)"
      (changeOrder)="sortOrder$.next($event)"
      (createRequested)="openCreateTaskDialog()"
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
        <p>{{ selectedStatus() === 'all' ? 'No tasks yet.' : 'No tasks with this status.' }}</p>
      } @else {
        <app-task-list
          [tasks]="state.tasks"
          [pendingStatusIds]="pendingStatusIds()"
          (changeTaskStatus)="updateTaskStatus($event)"
        />
      }
    }
  `,
})
export class TasksPage {
  private readonly tasksApi = inject(TasksApi);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly statusFilter$ = this.route.queryParamMap.pipe(
    map((params) => parseStatusFilter(params.get('status'))),
    distinctUntilChanged(),
  );
  readonly selectedStatus = toSignal(this.statusFilter$, {
    initialValue: parseStatusFilter(this.route.snapshot.queryParamMap.get('status')),
  });

  readonly sortOrder$ = new BehaviorSubject<SortOrder>('newest');

  readonly statusChangeError = signal<string | null>(null);
  readonly pendingStatusIds = signal<ReadonlySet<number>>(new Set());
  private readonly reloadTasks$ = new Subject<void>();

  updateTaskStatus(change: { id: number; status: TaskStatus }) {
    if (this.pendingStatusIds().has(change.id)) return;

    this.statusChangeError.set(null);
    this.pendingStatusIds.update((ids) => new Set(ids).add(change.id));

    this.tasksApi
      .updateTaskStatus(change.id, change.status)
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

  openCreateTaskDialog() {
    const ref = this.dialog.open<CreateTaskDialog, undefined, Task>(CreateTaskDialog, {
      width: '500px',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((result) => {
      if (result === undefined) return;

      this.reloadTasks$.next();
      this.snackBar.open('Task created.', undefined, { duration: 4000 });
    });
  }

  retryLoad() {
    this.reloadTasks$.next();
  }

  private readonly loadedState$ = combineLatest([
    this.statusFilter$,
    this.reloadTasks$.pipe(startWith(undefined)),
  ]).pipe(
    switchMap(([status]) => {
      return this.tasksApi.getTasks(status).pipe(
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

  selectStatus(status: StatusFilter): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: status === 'all' ? null : status,
      },
      queryParamsHandling: 'merge',
    });
  }
}
