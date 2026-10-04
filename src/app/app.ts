import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './layout/header/header';
@Component({
  imports: [Header, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  template: `
    <app-header />
    <router-outlet />
  `,
})
export class App {}
