import { type DomainEvent } from './domain-event.js';

interface ReminderScheduledPayload {
  readonly taskId: string;
  readonly reminderId: string;
  readonly scheduledAt: string;
}

export class ReminderScheduledEvent implements DomainEvent {
  readonly eventName = 'reminder.scheduled' as const;
  readonly occurredAt: Date;
  readonly payload: ReminderScheduledPayload;

  constructor(payload: ReminderScheduledPayload, occurredAt: Date = new Date()) {
    this.payload = payload;
    this.occurredAt = occurredAt;
  }
}
