import { type DomainError } from '../../errors/domain-error.js';

import { type Result } from './result.js';

export interface ScheduleReminderInputDto {
  readonly taskId: string;
  readonly userId: string;
  readonly scheduledAt: string;
}

export interface ScheduleReminderResponseDto {
  readonly reminderId: string;
  readonly taskId: string;
  readonly scheduledAt: string;
}

export interface ScheduleReminderPort {
  execute(dto: ScheduleReminderInputDto): Promise<Result<ScheduleReminderResponseDto, DomainError>>;
}
