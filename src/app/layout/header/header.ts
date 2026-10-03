import { DatePipe } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';

@Component({
  imports: [DatePipe],
  selector: 'app-header',
  template: `
    <header>
      <h1>TaskManager</h1>

      <p>{{ now() | date: 'dd.MM.yyyy HH:mm:ss' }}</p>
    </header>
  `,
  styleUrl: 'header.css',
})
export class Header implements OnDestroy {
  readonly now = signal(new Date());

  private readonly timer = setInterval(() => {
    this.now.set(new Date());
  }, 1000);

  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
