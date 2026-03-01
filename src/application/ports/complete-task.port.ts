import { type DomainError } from '../../domain/errors/domain-error.js';
import { type CompleteTaskInput } from '../dtos/complete-task.dto.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';
import { type Result } from '../shared/result.js';

export interface CompleteTaskPort {
  execute(input: CompleteTaskInput): Promise<Result<TaskResponse, DomainError>>;
}
