import { type DomainError } from '../../domain/errors/domain-error.js';
import { type ListTasksInput } from '../dtos/list-tasks.dto.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';
import { type Result } from '../shared/result.js';

export interface ListTasksPort {
  execute(input: ListTasksInput): Promise<Result<TaskResponse[], DomainError>>;
}
