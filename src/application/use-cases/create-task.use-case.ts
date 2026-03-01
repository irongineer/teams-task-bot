import { type DomainError } from '../../domain/errors/domain-error.js';
import { InvalidArgumentError } from '../../domain/errors/invalid-argument.error.js';
import { Task } from '../../domain/models/task.js';
import { type EventPublisher } from '../../domain/ports/driven/event-publisher.port.js';
import { type TaskRepository } from '../../domain/ports/driven/task-repository.port.js';
import { ConversationReference } from '../../domain/value-objects/conversation-reference.js';
import { DueDate } from '../../domain/value-objects/due-date.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import { type CreateTaskInput } from '../dtos/create-task.dto.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';
import { type CreateTaskPort } from '../ports/create-task.port.js';
import { type Result, err, ok } from '../shared/result.js';

function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id.value,
    userId: task.userId.value,
    title: task.title,
    description: task.description,
    status: task.status.value,
    dueDate: task.dueDate?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    reminders: [],
  };
}

export class CreateTaskUseCase implements CreateTaskPort {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreateTaskInput): Promise<Result<TaskResponse, DomainError>> {
    try {
      if (!input.title.trim()) {
        return err(new InvalidArgumentError('title must not be empty'));
      }

      const userId = UserId.fromString(input.userId);

      const dueDate = input.dueDate ? DueDate.create(new Date(input.dueDate)) : undefined;

      const conversationReference = ConversationReference.create({
        conversationId: input.conversationReference.conversationId,
        serviceUrl: input.conversationReference.serviceUrl,
      });

      const task = Task.create({
        userId,
        title: input.title,
        description: input.description,
        dueDate,
        conversationReference,
      });

      await this.taskRepository.save(task);
      await this.eventPublisher.publishAll(task.pullDomainEvents());

      return ok(toTaskResponse(task));
    } catch (error) {
      if (error instanceof Error) {
        return err(error as DomainError);
      }
      return err(new InvalidArgumentError('Unknown error'));
    }
  }
}
