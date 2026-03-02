import { type DomainError } from '../../domain/errors/domain-error.js';
import { type TaskRepository } from '../../domain/ports/driven/task-repository.port.js';
import { UserId } from '../../domain/value-objects/user-id.js';
import { type ListTasksInput } from '../dtos/list-tasks.dto.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';
import { toTaskResponse } from '../mappers/task-to-response.mapper.js';
import { type ListTasksPort } from '../ports/list-tasks.port.js';
import { type Result, ok } from '../shared/result.js';

export class ListTasksUseCase implements ListTasksPort {
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
