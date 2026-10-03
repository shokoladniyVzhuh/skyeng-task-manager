import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Filters } from './components/filters/filters';
import { Tasks } from './components/tasks/tasks';
import { Header } from './layout/header/header';

@Component({
  imports: [RouterOutlet, Header, Filters, Tasks],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <app-header />
    <app-filters />
    <app-tasks />
    <router-outlet />
  `,
})
export class App {
  protected readonly title = signal('task-manager');
}
