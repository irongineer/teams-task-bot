import { TaskAlreadyCompletedError } from '../errors/task-already-completed.error.js';
import { type DomainEvent } from '../events/domain-event.js';
import { TaskCompletedEvent } from '../events/task-completed.event.js';
import { TaskCreatedEvent } from '../events/task-created.event.js';
import { type ConversationReference } from '../value-objects/conversation-reference.js';
import { type DueDate } from '../value-objects/due-date.js';
import { TaskId } from '../value-objects/task-id.js';
import { TaskStatus } from '../value-objects/task-status.js';
import { type UserId } from '../value-objects/user-id.js';

export interface CreateTaskProps {
  userId: UserId;
  title: string;
  description?: string;
  dueDate?: DueDate;
  conversationReference: ConversationReference;
}

export interface ReconstructTaskProps {
  id: TaskId;
  userId: UserId;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: DueDate;
  conversationReference: ConversationReference;
  reminders: readonly DomainEvent[];
  createdAt: Date;
  updatedAt: Date;
}

export class Task {
  readonly id: TaskId;
  readonly userId: UserId;
  readonly title: string;
  readonly description: string | undefined;
  readonly conversationReference: ConversationReference;
  readonly reminders: readonly unknown[];
  readonly createdAt: Date;

  private _status: TaskStatus;
  private _updatedAt: Date;
  private _domainEvents: DomainEvent[] = [];

  private constructor(props: {
    id: TaskId;
    userId: UserId;
    title: string;
    description?: string;
    status: TaskStatus;
    dueDate?: DueDate;
    conversationReference: ConversationReference;
    reminders: readonly unknown[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.title = props.title;
    this.description = props.description;
    this._status = props.status;
    this._dueDate = props.dueDate;
    this.conversationReference = props.conversationReference;
    this.reminders = props.reminders;
    this.createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  private _dueDate: DueDate | undefined;

  get status(): TaskStatus {
    return this._status;
  }

  get dueDate(): DueDate | undefined {
    return this._dueDate;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  static create(props: CreateTaskProps): Task {
    const id = TaskId.generate();
    const now = new Date();

    const task = new Task({
      id,
      userId: props.userId,
      title: props.title,
      description: props.description,
      status: TaskStatus.pending(),
      dueDate: props.dueDate,
      conversationReference: props.conversationReference,
      reminders: [],
      createdAt: now,
      updatedAt: now,
    });

    task._domainEvents.push(
      new TaskCreatedEvent({
        taskId: id.value,
        userId: props.userId.value,
        title: props.title,
      }),
    );

    return task;
  }

  static reconstruct(props: ReconstructTaskProps): Task {
    return new Task({
      id: props.id,
      userId: props.userId,
      title: props.title,
      description: props.description,
      status: props.status,
      dueDate: props.dueDate,
      conversationReference: props.conversationReference,
      reminders: props.reminders,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  complete(): void {
    if (this._status.isCompleted()) {
      throw new TaskAlreadyCompletedError(this.id.value);
    }

    this._status = this._status.transitionTo(TaskStatus.completed());
    this._updatedAt = new Date();

    this._domainEvents.push(
      new TaskCompletedEvent({
        taskId: this.id.value,
        userId: this.userId.value,
        completedAt: this._updatedAt.toISOString(),
      }),
    );
  }

  isCompleted(): boolean {
    return this._status.isCompleted();
  }

  isOverdue(): boolean {
    return this._dueDate?.isOverdue() ?? false;
  }

  equals(other: Task): boolean {
    return this.id.equals(other.id);
  }

  pullDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }
}
