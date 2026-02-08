import { DomainError } from './domain-error.js';

export class TaskNotFoundError extends DomainError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, 'TASK_NOT_FOUND');
  }
}
