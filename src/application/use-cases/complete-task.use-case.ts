import { type DomainError } from '../../domain/errors/domain-error.js';
import { TaskNotFoundError } from '../../domain/errors/task-not-found.error.js';
import { type EventPublisher } from '../../domain/ports/driven/event-publisher.port.js';
import { type TaskRepository } from '../../domain/ports/driven/task-repository.port.js';
import { TaskId } from '../../domain/value-objects/task-id.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import { type CompleteTaskInput } from '../dtos/complete-task.dto.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';
import { toTaskResponse } from '../mappers/task-to-response.mapper.js';
import { type CompleteTaskPort } from '../ports/complete-task.port.js';
import { type Result, err, ok } from '../shared/result.js';

export class CompleteTaskUseCase implements CompleteTaskPort {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CompleteTaskInput): Promise<Result<TaskResponse, DomainError>> {
    try {
      const taskId = TaskId.fromString(input.taskId);
      const userId = UserId.fromString(input.userId);

      const task = await this.taskRepository.findById(taskId);

      if (!task || !task.userId.equals(userId)) {
        return err(new TaskNotFoundError(input.taskId));
      }

      task.complete();

      await this.taskRepository.save(task);
      await this.eventPublisher.publishAll(task.pullDomainEvents());

      return ok(toTaskResponse(task));
    } catch (error) {
      if (error instanceof Error) {
        return err(error as DomainError);
      }
      return err(new TaskNotFoundError(input.taskId));
    }
  }
}
