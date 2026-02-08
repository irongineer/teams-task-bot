import { DomainError } from './domain-error.js';

export class TaskAlreadyCompletedError extends DomainError {
  constructor(taskId: string) {
    super(`Task is already completed: ${taskId}`, 'TASK_ALREADY_COMPLETED');
  }
}
