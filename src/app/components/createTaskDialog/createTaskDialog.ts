import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { CreateTaskData, Task } from '../../task.types';

@Component({
  selector: 'app-create-task-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatError,
  ],
  template: `
    <h2 mat-dialog-title>New task</h2>

    <form #taskForm="ngForm" (ngSubmit)="save(taskForm)">
      <mat-dialog-content>
        <p>What is your task about?</p>

        <mat-form-field appearance="outline">
          <mat-label>Title</mat-label>
          <input
            matInput
            #titleModel="ngModel"
            maxlength="100"
            name="title"
            [(ngModel)]="title"
            required
            [pattern]="nonWhitespacePattern"
          />
          @if (titleModel.touched || taskForm.submitted) {
            @if (titleModel.hasError('required') || titleModel.hasError('pattern')) {
              <mat-error>Enter a task title.</mat-error>
            } @else if (titleModel.hasError('maxlength')) {
              <mat-error>Title must be 100 characters or fewer.</mat-error>
            }
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput name="description" [(ngModel)]="description"></textarea>
        </mat-form-field>

        @if (saveError()) {
          <p role="alert">{{ saveError() }}</p>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button matButton type="button" mat-dialog-close [disabled]="saving()">Cancel</button>
        <button matButton="filled" type="submit" [disabled]="saving()">Create</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CreateTaskDialog {
  private readonly http = inject(HttpClient);

  private readonly dialogRef = inject(MatDialogRef<CreateTaskDialog, Task>);
  readonly nonWhitespacePattern = /\S/;

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  title = '';
  description = '';

  save(form: NgForm) {
    if (this.saving()) return;

    form.form.markAllAsTouched();
    if (form.invalid) return;

    const title = this.title.trim();

    if (!title) return;

    const taskData: CreateTaskData = {
      title,
      description: this.description.trim(),
    };

    this.saveError.set(null);
    this.saving.set(true);
    this.dialogRef.disableClose = true;

    this.http
      .post<Task>('http://localhost:3000/tasks', {
        title: taskData.title,
        description: taskData.description,
        status: 'new',
        createdAt: new Date().toISOString(),
      })
      .subscribe({
        next: (task) => {
          this.saving.set(false);
          this.dialogRef.disableClose = false;
          this.dialogRef.close(task);
        },
        error: () => {
          this.saving.set(false);
          this.dialogRef.disableClose = false;
          this.saveError.set('Could not create the task. Please try again.');
        },
      });
  }
}
