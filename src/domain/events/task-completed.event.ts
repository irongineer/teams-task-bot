import { type DomainEvent } from './domain-event.js';

interface TaskCompletedPayload {
  readonly taskId: string;
  readonly userId: string;
  readonly completedAt: string;
}

export class TaskCompletedEvent implements DomainEvent {
  readonly eventName = 'task.completed' as const;
  readonly occurredAt: Date;
  readonly payload: TaskCompletedPayload;

  constructor(payload: TaskCompletedPayload, occurredAt: Date = new Date()) {
    this.payload = payload;
    this.occurredAt = occurredAt;
  }
}
