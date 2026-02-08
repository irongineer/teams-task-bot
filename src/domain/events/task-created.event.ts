import { type DomainEvent } from './domain-event.js';

interface TaskCreatedPayload {
  readonly taskId: string;
  readonly userId: string;
  readonly title: string;
}

export class TaskCreatedEvent implements DomainEvent {
  readonly eventName = 'task.created' as const;
  readonly occurredAt: Date;
  readonly payload: TaskCreatedPayload;

  constructor(payload: TaskCreatedPayload, occurredAt: Date = new Date()) {
    this.payload = payload;
    this.occurredAt = occurredAt;
  }
}
