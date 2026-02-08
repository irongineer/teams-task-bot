import { type Task } from '../../models/task.js';
import { type TaskId } from '../../value-objects/task-id.js';
import { type UserId } from '../../value-objects/user-id.js';

export interface TaskRepository {
  save(task: Task): Promise<void>;
  findById(id: TaskId): Promise<Task | null>;
  findByUserId(userId: UserId): Promise<Task[]>;
  delete(id: TaskId): Promise<void>;
}
