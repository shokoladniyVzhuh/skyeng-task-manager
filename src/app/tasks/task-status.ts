import { TaskStatus } from './task.types';

const nextTaskStatus: Readonly<Record<TaskStatus, TaskStatus | null>> = {
  new: 'in_progress',
  in_progress: 'done',
  done: null,
};

export function getNextTaskStatus(status: TaskStatus): TaskStatus | null {
  return nextTaskStatus[status];
}

export function canChangeTaskStatus(current: TaskStatus, target: TaskStatus): boolean {
  return getNextTaskStatus(current) === target;
}
