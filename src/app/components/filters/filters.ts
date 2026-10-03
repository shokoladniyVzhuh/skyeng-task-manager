import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatOption, MatSelect } from '@angular/material/select';
import { SortOrder, StatusFilter } from '../../task.types';

@Component({
  imports: [MatFormField, MatLabel, MatSelect, MatOption, MatButtonModule],
  selector: 'app-filters',
  template: `
    <div class="filters">
      <div class="select-status">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Status</mat-label>
          <mat-select [value]="status()" (selectionChange)="changeStatus.emit($event.value)">
            <mat-option value="all">All tasks</mat-option>
            <mat-option value="new">New</mat-option>
            <mat-option value="in_progress">In Progress</mat-option>
            <mat-option value="done">Done</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <div class="select-novelty">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Sort Order</mat-label>
          <mat-select [value]="order()" (selectionChange)="changeOrder.emit($event.value)">
            <mat-option value="newest">Newest first</mat-option>
            <mat-option value="oldest">Oldest first</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <button matButton="tonal" class="create-task-button" (click)="createRequested.emit()">
        Create new task
      </button>
    </div>
  `,
  styleUrl: 'filters.css',
})
export class Filters {
  readonly status = input.required<StatusFilter>();
  readonly order = input.required<SortOrder>();

  readonly changeStatus = output<StatusFilter>();
  readonly changeOrder = output<SortOrder>();

  readonly createRequested = output<void>();
}
