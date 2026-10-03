import { sortTasks } from './sort-tasks';
import { SortOrder, Task } from './task.types';

describe('sortTasks', () => {
  const early: Task = {
    id: 1,
    title: 'Early task',
    status: 'new',
    createdAt: '2026-10-01T09:00:00.000Z',
  };
  const middle: Task = {
    ...early,
    id: 2,
    title: 'Middle task',
    createdAt: '2026-10-01T11:00:00.000+01:00',
  };
  const late: Task = {
    ...early,
    id: 3,
    title: 'Late task',
    createdAt: '2026-10-01T10:30:00.000Z',
  };
  const tasks = [middle, late, early];

  it.each<[SortOrder, number[]]>([
    ['oldest', [1, 2, 3]],
    ['newest', [3, 2, 1]],
  ])('sorts %s by the actual creation time, including timezone offsets', (order, expected) => {
    expect(sortTasks(tasks, order).map((task) => task.id)).toEqual(expected);
  });

  it('returns a new array without changing the original order', () => {
    const original = Object.freeze([...tasks]);

    const result = sortTasks(original, 'oldest');

    expect(original.map((task) => task.id)).toEqual([2, 3, 1]);
    expect(result).not.toBe(original);
    expect(result.map((task) => task.id)).toEqual([1, 2, 3]);
  });

  it('handles an empty list in either order', () => {
    expect(sortTasks([], 'oldest')).toEqual([]);
    expect(sortTasks([], 'newest')).toEqual([]);
  });
});
