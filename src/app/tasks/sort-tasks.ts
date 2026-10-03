import { SortOrder, Task } from './task.types';

export function sortTasks(tasks: readonly Task[], order: SortOrder): Task[] {
  return [...tasks].sort((a, b) => {
    const difference = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    return order === 'oldest' ? difference : -difference;
  });
}
