import { canChangeTaskStatus, getNextTaskStatus } from './task-status';
import { TaskStatus } from './task.types';

describe('getNextTaskStatus', () => {
  it.each<[TaskStatus, TaskStatus | null]>([
    ['new', 'in_progress'],
    ['in_progress', 'done'],
    ['done', null],
  ])('returns the next status for %s', (current, expected) => {
    expect(getNextTaskStatus(current)).toBe(expected);
  });
});

describe('canChangeTaskStatus', () => {
  it.each<[TaskStatus, TaskStatus, boolean]>([
    ['new', 'new', false],
    ['new', 'in_progress', true],
    ['new', 'done', false],
    ['in_progress', 'new', false],
    ['in_progress', 'in_progress', false],
    ['in_progress', 'done', true],
    ['done', 'new', false],
    ['done', 'in_progress', false],
    ['done', 'done', false],
  ])('checks the transition from %s to %s: allowed = %s', (current, target, expected) => {
    expect(canChangeTaskStatus(current, target)).toBe(expected);
  });
});
