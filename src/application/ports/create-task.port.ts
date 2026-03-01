import { type DomainError } from '../../domain/errors/domain-error.js';
import { type CreateTaskInput } from '../dtos/create-task.dto.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';
import { type Result } from '../shared/result.js';

export interface CreateTaskPort {
  execute(input: CreateTaskInput): Promise<Result<TaskResponse, DomainError>>;
}
