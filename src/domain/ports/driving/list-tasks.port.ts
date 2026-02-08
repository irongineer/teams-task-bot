import { type DomainError } from '../../errors/domain-error.js';

import { type TaskResponseDto } from './create-task.port.js';
import { type Result } from './result.js';

export interface ListTasksInputDto {
  readonly userId: string;
  readonly status?: string;
}

export interface ListTasksPort {
  execute(dto: ListTasksInputDto): Promise<Result<TaskResponseDto[], DomainError>>;
}
