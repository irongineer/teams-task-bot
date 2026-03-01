import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type CreateTaskInput } from '../../../../src/application/dtos/create-task.dto.js';
import { CreateTaskUseCase } from '../../../../src/application/use-cases/create-task.use-case.js';
import { type EventPublisher } from '../../../../src/domain/ports/driven/event-publisher.port.js';
import { type TaskRepository } from '../../../../src/domain/ports/driven/task-repository.port.js';

const NOW = new Date('2026-02-09T12:00:00.000Z');

function validInput(): CreateTaskInput {
  return {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    title: '買い物リストを作る',
    description: '牛乳と卵を買う',
    conversationReference: {
      conversationId: 'conv-123',
      tenantId: 'tenant-abc',
      serviceUrl: 'https://smba.trafficmanager.net/jp/',
    },
  };
}

function createMockTaskRepository(): TaskRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    delete: vi.fn(),
  };
}

function createMockEventPublisher(): EventPublisher {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    publishAll: vi.fn().mockResolvedValue(undefined),
  };
}

describe('CreateTaskUseCase', () => {
  let useCase: CreateTaskUseCase;
  let taskRepository: TaskRepository;
  let eventPublisher: EventPublisher;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    taskRepository = createMockTaskRepository();
    eventPublisher = createMockEventPublisher();
    useCase = new CreateTaskUseCase(taskRepository, eventPublisher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('正常系', () => {
    it('有効な入力でタスクを作成できる', async () => {
      const input = validInput();
      const result = await useCase.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe('買い物リストを作る');
        expect(result.value.description).toBe('牛乳と卵を買う');
        expect(result.value.status).toBe('pending');
        expect(result.value.userId).toBe(input.userId);
        expect(result.value.createdAt).toBe(NOW.toISOString());
        expect(result.value.updatedAt).toBe(NOW.toISOString());
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
        expect(result.value.reminders).toEqual([]);
      }
    });

    it('TaskRepository.save() が呼ばれる', async () => {
      await useCase.execute(validInput());

      expect(taskRepository.save).toHaveBeenCalledTimes(1);
    });

    it('EventPublisher.publishAll() が TaskCreated イベント付きで呼ばれる', async () => {
      await useCase.execute(validInput());

      expect(eventPublisher.publishAll).toHaveBeenCalledTimes(1);
      const events = vi.mocked(eventPublisher.publishAll).mock.calls[0][0];
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('task.created');
    });

    it('dueDate を指定してタスクを作成できる', async () => {
      const input: CreateTaskInput = {
        ...validInput(),
        dueDate: '2026-02-15T00:00:00.000Z',
      };
      const result = await useCase.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.dueDate).toBe('2026-02-15T00:00:00.000Z');
      }
    });

    it('description が省略された場合 undefined になる', async () => {
      const { description: _, ...input } = validInput();
      const result = await useCase.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.description).toBeUndefined();
      }
    });
  });

  describe('異常系', () => {
    it('title が空文字列の場合 err が返る', async () => {
      const input: CreateTaskInput = { ...validInput(), title: '' };
      const result = await useCase.execute(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_ARGUMENT');
      }
    });

    it('title が空文字列の場合 save() は呼ばれない', async () => {
      const input: CreateTaskInput = { ...validInput(), title: '' };
      await useCase.execute(input);

      expect(taskRepository.save).not.toHaveBeenCalled();
    });

    it('dueDate が過去日付の場合 InvalidDueDateError が返る', async () => {
      const input: CreateTaskInput = {
        ...validInput(),
        dueDate: '2026-02-01T00:00:00.000Z',
      };
      const result = await useCase.execute(input);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_DUE_DATE');
      }
    });

    it('TaskRepository.save() が失敗した場合 err が返る', async () => {
      vi.mocked(taskRepository.save).mockRejectedValue(new Error('DB connection failed'));
      const result = await useCase.execute(validInput());

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toBe('DB connection failed');
      }
    });
  });
});
