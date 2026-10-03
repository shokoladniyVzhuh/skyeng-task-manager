import { Component } from '@angular/core';
import { Header } from './layout/header/header';
import { TasksPage } from './tasks-page';

@Component({
  imports: [Header, TasksPage],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <app-header />
    <app-tasks-page />
  `,
})
export class App {}
