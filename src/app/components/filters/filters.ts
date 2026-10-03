import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-filters',
  template: `
    <div class="filters">
      <div class="dropdown-status">
        <button (click)="toggleStatus()">{{ currentStatus.name }}</button>

        @if (isOpenStatus) {
          @for (status of statuses; track status.id) {
            @if (status.id !== currentStatus.id) {
              <p (click)="selectStatus(status)">{{ status.name }}</p>
            }
          }
        }
      </div>
      <div class="novelty">
        <button (click)="toggleNovelty()">{{ currentNovelty.name }}</button>
        @if (isOpenNovelty) {
          @for (novelty of novelties; track novelty.id) {
            <p (click)="selectNovelty(novelty)">{{ novelty.name }}</p>
          }
        }
      </div>
      <button>Create new task</button>
    </div>
  `,
  styles: `
    .filter {
    }
    .dropdown-status {
    }
  `,
})
export class Filters {
  statuses: FilterItem[] = [
    {
      id: 1,
      name: 'All tasks',
    },
    {
      id: 2,
      name: 'New',
    },
    {
      id: 3,
      name: 'In process',
    },
    {
      id: 4,
      name: 'Done',
    },
  ];

  novelties: FilterItem[] = [
    {
      id: 1,
      name: 'New first',
    },
    {
      id: 2,
      name: 'Old first',
    },
  ];

  isOpenStatus = false;
  isOpenNovelty = false;

  currentStatus: FilterItem = this.statuses[0];
  currentNovelty: FilterItem = this.novelties[0];

  selectNovelty(novelty: FilterItem) {
    this.currentNovelty = novelty;
    this.toggleNovelty();
  }

  toggleNovelty() {
    this.isOpenNovelty = !this.isOpenNovelty;
  }

  selectStatus(status: FilterItem) {
    this.currentStatus = status;
    this.toggleStatus();
  }

  toggleStatus() {
    this.isOpenStatus = !this.isOpenStatus;
  }
}

interface FilterItem {
  id: number;
  name: string;
}
