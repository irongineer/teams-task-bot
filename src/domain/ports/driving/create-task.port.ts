import { type DomainError } from '../../errors/domain-error.js';

import { type Result } from './result.js';

export interface CreateTaskInputDto {
  readonly userId: string;
  readonly title: string;
  readonly description?: string;
  readonly dueDate?: string;
  readonly conversationReference: {
    readonly conversationId: string;
    readonly serviceUrl: string;
    readonly channelId?: string;
  };
}

export interface TaskResponseDto {
  readonly id: string;
  readonly shortId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string | undefined;
  readonly status: string;
  readonly dueDate: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateTaskPort {
  execute(dto: CreateTaskInputDto): Promise<Result<TaskResponseDto, DomainError>>;
}
