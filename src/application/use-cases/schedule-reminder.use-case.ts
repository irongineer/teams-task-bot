import { type DomainError } from '../../domain/errors/domain-error.js';
import { InvalidArgumentError } from '../../domain/errors/invalid-argument.error.js';
import { TaskNotFoundError } from '../../domain/errors/task-not-found.error.js';
import { type EventPublisher } from '../../domain/ports/driven/event-publisher.port.js';
import { type TaskRepository } from '../../domain/ports/driven/task-repository.port.js';
import { TaskId } from '../../domain/value-objects/task-id.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import {
  type ScheduleReminderInput,
  type ScheduleReminderResponse,
} from '../dtos/schedule-reminder.dto.js';
import { type ScheduleReminderPort } from '../ports/schedule-reminder.port.js';
import { type Result, err, ok } from '../shared/result.js';

export class ScheduleReminderUseCase implements ScheduleReminderPort {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    input: ScheduleReminderInput,
  ): Promise<Result<ScheduleReminderResponse, DomainError>> {
    try {
      const taskId = TaskId.fromString(input.taskId);
      const userId = UserId.fromString(input.userId);
      const scheduledAt = new Date(input.scheduledAt);

      if (scheduledAt <= new Date()) {
        return err(new InvalidArgumentError('scheduledAt must be in the future'));
      }

      const task = await this.taskRepository.findById(taskId);

      if (!task || !task.userId.equals(userId)) {
        return err(new TaskNotFoundError(input.taskId));
      }

      const reminder = task.scheduleReminder(scheduledAt);

      await this.taskRepository.save(task);
      await this.eventPublisher.publishAll(task.pullDomainEvents());

      return ok({
        reminderId: reminder.id.value,
        taskId: input.taskId,
        scheduledAt: input.scheduledAt,
      });
    } catch (error) {
      if (error instanceof Error) {
        return err(error as DomainError);
      }
      return err(new TaskNotFoundError(input.taskId));
    }
  }
}
