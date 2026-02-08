import { InvalidArgumentError } from '../errors/invalid-argument.error.js';
import { InvalidStatusTransitionError } from '../errors/invalid-status-transition.error.js';

const VALID_STATUSES = ['pending', 'in_progress', 'completed'] as const;
type Status = (typeof VALID_STATUSES)[number];

const ALLOWED_TRANSITIONS: Record<Status, readonly Status[]> = {
  pending: ['in_progress', 'completed'],
  in_progress: ['completed'],
  completed: [],
};

export class TaskStatus {
  private constructor(public readonly value: Status) {}

  static create(value: string): TaskStatus {
    if (!VALID_STATUSES.includes(value as Status)) {
      throw new InvalidArgumentError(
        `Invalid TaskStatus: "${value}". Must be one of: ${VALID_STATUSES.join(', ')}`,
      );
    }
    return new TaskStatus(value as Status);
  }

  static pending(): TaskStatus {
    return new TaskStatus('pending');
  }

  static inProgress(): TaskStatus {
    return new TaskStatus('in_progress');
  }

  static completed(): TaskStatus {
    return new TaskStatus('completed');
  }

  transitionTo(next: TaskStatus): TaskStatus {
    const allowed = ALLOWED_TRANSITIONS[this.value];
    if (!allowed.includes(next.value)) {
      throw new InvalidStatusTransitionError(this.value, next.value);
    }
    return next;
  }

  isPending(): boolean {
    return this.value === 'pending';
  }

  isInProgress(): boolean {
    return this.value === 'in_progress';
  }

  isCompleted(): boolean {
    return this.value === 'completed';
  }

  equals(other: TaskStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
