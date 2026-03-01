import { type DomainError } from '../../domain/errors/domain-error.js';
import { type Task } from '../../domain/models/task.js';
import { type TaskRepository } from '../../domain/ports/driven/task-repository.port.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import { type ListTasksInput } from '../dtos/list-tasks.dto.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';
import { type Result, ok } from '../shared/result.js';

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

export class ListTasksUseCase {
  constructor(private readonly taskRepository: TaskRepository) {}

  async execute(input: ListTasksInput): Promise<Result<TaskResponse[], DomainError>> {
    const userId = UserId.fromString(input.userId);

    let tasks = await this.taskRepository.findByUserId(userId);

    if (input.statusFilter) {
      tasks = tasks.filter((task) => task.status.value === input.statusFilter);
    }

    return ok(tasks.map(toTaskResponse));
  }
}
