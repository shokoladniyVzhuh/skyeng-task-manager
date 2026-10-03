export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
}

export type TaskStatus = 'new' | 'in_progress' | 'done';
export type StatusFilter = 'all' | TaskStatus;
export type SortOrder = 'newest' | 'oldest';

export interface CreateTaskData {
  title: string;
  description?: string;
}
