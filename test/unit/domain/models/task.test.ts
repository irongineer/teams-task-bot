import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskAlreadyCompletedError } from '../../../../src/domain/errors/task-already-completed.error.js';
import { TaskCompletedEvent } from '../../../../src/domain/events/task-completed.event.js';
import { TaskCreatedEvent } from '../../../../src/domain/events/task-created.event.js';
import { Task } from '../../../../src/domain/models/task.js';
import { ConversationReference } from '../../../../src/domain/value-objects/conversation-reference.js';
import { DueDate } from '../../../../src/domain/value-objects/due-date.js';
import { TaskId } from '../../../../src/domain/value-objects/task-id.js';
import { TaskStatus } from '../../../../src/domain/value-objects/task-status.js';
import { UserId } from '../../../../src/domain/value-objects/user-id.js';

const NOW = new Date('2026-02-09T12:00:00.000Z');

function createConversationReference() {
  return ConversationReference.create({
    conversationId: 'conv-123',
    serviceUrl: 'https://smba.trafficmanager.net/jp/',
  });
}

function createDefaultProps() {
  return {
    userId: UserId.fromString('550e8400-e29b-41d4-a716-446655440000'),
    title: 'テストタスク',
    conversationReference: createConversationReference(),
  };
}

describe('Task', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create()', () => {
    it('TaskId が自動生成される', () => {
      const task = Task.create(createDefaultProps());

      expect(task.id).toBeInstanceOf(TaskId);
      expect(task.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('status が pending で初期化される', () => {
      const task = Task.create(createDefaultProps());

      expect(task.status.equals(TaskStatus.pending())).toBe(true);
    });

    it('プロパティが正しく設定される', () => {
      const props = {
        ...createDefaultProps(),
        description: 'タスクの説明',
      };

      const task = Task.create(props);

      expect(task.userId.equals(props.userId)).toBe(true);
      expect(task.title).toBe('テストタスク');
      expect(task.description).toBe('タスクの説明');
    });

    it('description が省略された場合 undefined になる', () => {
      const task = Task.create(createDefaultProps());

      expect(task.description).toBeUndefined();
    });

    it('dueDate を設定できる', () => {
      const dueDate = DueDate.create(new Date('2026-02-15T00:00:00.000Z'));
      const task = Task.create({ ...createDefaultProps(), dueDate });

      expect(task.dueDate?.equals(dueDate)).toBe(true);
    });

    it('reminders は空配列で初期化される', () => {
      const task = Task.create(createDefaultProps());

      expect(task.reminders).toEqual([]);
    });

    it('createdAt と updatedAt が現在時刻で設定される', () => {
      const task = Task.create(createDefaultProps());

      expect(task.createdAt).toEqual(NOW);
      expect(task.updatedAt).toEqual(NOW);
    });

    it('TaskCreatedEvent が生成される', () => {
      const task = Task.create(createDefaultProps());
      const events = task.pullDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TaskCreatedEvent);

      const event = events[0] as TaskCreatedEvent;
      expect(event.eventName).toBe('task.created');
      expect(event.payload.taskId).toBe(task.id.value);
      expect(event.payload.userId).toBe(task.userId.value);
      expect(event.payload.title).toBe('テストタスク');
    });
  });

  describe('reconstruct()', () => {
    it('全プロパティを引数から復元できる', () => {
      const id = TaskId.fromString('660e8400-e29b-41d4-a716-446655440000');
      const userId = UserId.fromString('550e8400-e29b-41d4-a716-446655440000');
      const createdAt = new Date('2026-02-01T00:00:00.000Z');
      const updatedAt = new Date('2026-02-05T00:00:00.000Z');

      const task = Task.reconstruct({
        id,
        userId,
        title: '復元タスク',
        description: '説明',
        status: TaskStatus.inProgress(),
        conversationReference: createConversationReference(),
        reminders: [],
        createdAt,
        updatedAt,
      });

      expect(task.id.equals(id)).toBe(true);
      expect(task.title).toBe('復元タスク');
      expect(task.status.equals(TaskStatus.inProgress())).toBe(true);
      expect(task.createdAt).toEqual(createdAt);
      expect(task.updatedAt).toEqual(updatedAt);
    });

    it('ドメインイベントが生成されない', () => {
      const task = Task.reconstruct({
        id: TaskId.fromString('660e8400-e29b-41d4-a716-446655440000'),
        userId: UserId.fromString('550e8400-e29b-41d4-a716-446655440000'),
        title: '復元タスク',
        status: TaskStatus.pending(),
        conversationReference: createConversationReference(),
        reminders: [],
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      });

      expect(task.pullDomainEvents()).toHaveLength(0);
    });
  });

  describe('complete()', () => {
    it('status が completed に遷移する', () => {
      const task = Task.create(createDefaultProps());

      task.complete();

      expect(task.status.equals(TaskStatus.completed())).toBe(true);
    });

    it('updatedAt が更新される', () => {
      const task = Task.create(createDefaultProps());

      vi.setSystemTime(new Date('2026-02-10T00:00:00.000Z'));
      task.complete();

      expect(task.updatedAt).toEqual(new Date('2026-02-10T00:00:00.000Z'));
    });

    it('TaskCompletedEvent が生成される', () => {
      const task = Task.create(createDefaultProps());
      task.pullDomainEvents(); // TaskCreated をクリア

      task.complete();

      const events = task.pullDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TaskCompletedEvent);

      const event = events[0] as TaskCompletedEvent;
      expect(event.eventName).toBe('task.completed');
      expect(event.payload.taskId).toBe(task.id.value);
      expect(event.payload.userId).toBe(task.userId.value);
    });

    it('完了済みを再度 complete() すると TaskAlreadyCompletedError を投げる', () => {
      const task = Task.create(createDefaultProps());
      task.complete();

      expect(() => task.complete()).toThrow(TaskAlreadyCompletedError);
    });

    it('in_progress からも complete() できる', () => {
      const task = Task.reconstruct({
        id: TaskId.fromString('660e8400-e29b-41d4-a716-446655440000'),
        userId: UserId.fromString('550e8400-e29b-41d4-a716-446655440000'),
        title: '進行中タスク',
        status: TaskStatus.inProgress(),
        conversationReference: createConversationReference(),
        reminders: [],
        createdAt: new Date('2026-02-01T00:00:00.000Z'),
        updatedAt: new Date('2026-02-01T00:00:00.000Z'),
      });

      task.complete();

      expect(task.status.equals(TaskStatus.completed())).toBe(true);
    });
  });

  describe('isCompleted()', () => {
    it('completed なら true を返す', () => {
      const task = Task.create(createDefaultProps());
      task.complete();

      expect(task.isCompleted()).toBe(true);
    });

    it('pending なら false を返す', () => {
      const task = Task.create(createDefaultProps());

      expect(task.isCompleted()).toBe(false);
    });
  });

  describe('isOverdue()', () => {
    it('dueDate を過ぎていたら true を返す', () => {
      const dueDate = DueDate.create(new Date('2026-02-10T00:00:00.000Z'));
      const task = Task.create({ ...createDefaultProps(), dueDate });

      vi.setSystemTime(new Date('2026-02-11T00:00:00.000Z'));

      expect(task.isOverdue()).toBe(true);
    });

    it('dueDate 前なら false を返す', () => {
      const dueDate = DueDate.create(new Date('2026-02-10T00:00:00.000Z'));
      const task = Task.create({ ...createDefaultProps(), dueDate });

      expect(task.isOverdue()).toBe(false);
    });

    it('dueDate が未設定なら false を返す', () => {
      const task = Task.create(createDefaultProps());

      expect(task.isOverdue()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('同じ id なら true を返す', () => {
      const id = TaskId.fromString('660e8400-e29b-41d4-a716-446655440000');
      const base = {
        userId: UserId.fromString('550e8400-e29b-41d4-a716-446655440000'),
        status: TaskStatus.pending(),
        conversationReference: createConversationReference(),
        reminders: [],
        createdAt: NOW,
        updatedAt: NOW,
      };

      const t1 = Task.reconstruct({ ...base, id, title: 'タスクA' });
      const t2 = Task.reconstruct({ ...base, id, title: 'タスクB' });

      expect(t1.equals(t2)).toBe(true);
    });

    it('異なる id なら false を返す', () => {
      const t1 = Task.create(createDefaultProps());
      const t2 = Task.create(createDefaultProps());

      expect(t1.equals(t2)).toBe(false);
    });
  });

  describe('pullDomainEvents()', () => {
    it('イベントを返してクリアする', () => {
      const task = Task.create(createDefaultProps());

      const first = task.pullDomainEvents();
      expect(first).toHaveLength(1);

      const second = task.pullDomainEvents();
      expect(second).toHaveLength(0);
    });

    it('複数イベントが蓄積される', () => {
      const task = Task.create(createDefaultProps());
      task.complete();

      const events = task.pullDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toBeInstanceOf(TaskCreatedEvent);
      expect(events[1]).toBeInstanceOf(TaskCompletedEvent);
    });
  });
});
