import { type DomainError } from '../../errors/domain-error.js';

import { type TaskResponseDto } from './create-task.port.js';
import { type Result } from './result.js';

export interface CompleteTaskInputDto {
  readonly userId: string;
  readonly taskId: string;
}

export interface CompleteTaskPort {
  execute(dto: CompleteTaskInputDto): Promise<Result<TaskResponseDto, DomainError>>;
}
