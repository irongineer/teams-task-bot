import { type DomainError } from '../../domain/errors/domain-error.js';
import {
  type ScheduleReminderInput,
  type ScheduleReminderResponse,
} from '../dtos/schedule-reminder.dto.js';
import { type Result } from '../shared/result.js';

export interface ScheduleReminderPort {
  execute(input: ScheduleReminderInput): Promise<Result<ScheduleReminderResponse, DomainError>>;
}
