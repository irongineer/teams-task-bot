import { type Task } from '../../domain/models/task.js';
import { type TaskResponse } from '../dtos/task-response.dto.js';

export function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id.value,
    userId: task.userId.value,
    title: task.title,
    description: task.description,
    status: task.status.value,
    dueDate: task.dueDate?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    reminders: task.reminders.map((r) => ({
      id: r.id.value,
      scheduledAt: r.scheduledAt.toISOString(),
      sentAt: r.sentAt?.toISOString(),
    })),
  };
}
