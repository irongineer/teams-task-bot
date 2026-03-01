import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type CompleteTaskInput } from '../../../../src/application/dtos/complete-task.dto.js';
import { CompleteTaskUseCase } from '../../../../src/application/use-cases/complete-task.use-case.js';
import { Task } from '../../../../src/domain/models/task.js';
import { type EventPublisher } from '../../../../src/domain/ports/driven/event-publisher.port.js';
import { type TaskRepository } from '../../../../src/domain/ports/driven/task-repository.port.js';
import { ConversationReference } from '../../../../src/domain/value-objects/conversation-reference.js';
import { TaskId } from '../../../../src/domain/value-objects/task-id.js';
import { TaskStatus } from '../../../../src/domain/value-objects/task-status.js';
import { UserId } from '../../../../src/domain/value-objects/user-id.js';

const NOW = new Date('2026-02-09T12:00:00.000Z');
const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '660e8400-e29b-41d4-a716-446655440000';
const TASK_ID = '770e8400-e29b-41d4-a716-446655440000';

function buildTask(overrides: { userId?: string; status?: TaskStatus } = {}): Task {
  return Task.reconstruct({
    id: TaskId.fromString(TASK_ID),
    userId: UserId.fromString(overrides.userId ?? USER_ID),
    title: 'テストタスク',
    status: overrides.status ?? TaskStatus.pending(),
    conversationReference: ConversationReference.create({
      conversationId: 'conv-1',
      serviceUrl: 'https://smba.trafficmanager.net/jp/',
    }),
    reminders: [],
    createdAt: new Date('2026-02-01T00:00:00.000Z'),
    updatedAt: new Date('2026-02-01T00:00:00.000Z'),
  });
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

describe('CompleteTaskUseCase', () => {
  let useCase: CompleteTaskUseCase;
  let taskRepository: TaskRepository;
  let eventPublisher: EventPublisher;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    taskRepository = createMockTaskRepository();
    eventPublisher = createMockEventPublisher();
    useCase = new CompleteTaskUseCase(taskRepository, eventPublisher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('正常系', () => {
    it('pending のタスクを completed に変更できる', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(buildTask());

      const input: CompleteTaskInput = { taskId: TASK_ID, userId: USER_ID };
      const result = await useCase.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('completed');
        expect(result.value.id).toBe(TASK_ID);
        expect(result.value.updatedAt).toBe(NOW.toISOString());
      }
    });

    it('TaskRepository.save() が更新されたタスクで呼ばれる', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(buildTask());

      await useCase.execute({ taskId: TASK_ID, userId: USER_ID });

      expect(taskRepository.save).toHaveBeenCalledTimes(1);
      const savedTask = vi.mocked(taskRepository.save).mock.calls[0][0];
      expect(savedTask.status.isCompleted()).toBe(true);
    });

    it('EventPublisher.publishAll() が TaskCompleted イベント付きで呼ばれる', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(buildTask());

      await useCase.execute({ taskId: TASK_ID, userId: USER_ID });

      expect(eventPublisher.publishAll).toHaveBeenCalledTimes(1);
      const events = vi.mocked(eventPublisher.publishAll).mock.calls[0][0];
      expect(events).toHaveLength(1);
      expect(events[0].eventName).toBe('task.completed');
    });

    it('in_progress のタスクも completed に変更できる', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(
        buildTask({ status: TaskStatus.inProgress() }),
      );

      const result = await useCase.execute({ taskId: TASK_ID, userId: USER_ID });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.status).toBe('completed');
      }
    });
  });

  describe('異常系', () => {
    it('存在しないタスク ID の場合 TaskNotFoundError が返る', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);

      const result = await useCase.execute({ taskId: TASK_ID, userId: USER_ID });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });

    it('存在しない場合 save() は呼ばれない', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);

      await useCase.execute({ taskId: TASK_ID, userId: USER_ID });

      expect(taskRepository.save).not.toHaveBeenCalled();
    });

    it('既に completed のタスクの場合 TaskAlreadyCompletedError が返る', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(
        buildTask({ status: TaskStatus.completed() }),
      );

      const result = await useCase.execute({ taskId: TASK_ID, userId: USER_ID });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_ALREADY_COMPLETED');
      }
    });

    it('他のユーザーのタスクを完了しようとした場合エラーが返る', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(
        buildTask({ userId: OTHER_USER_ID }),
      );

      const result = await useCase.execute({ taskId: TASK_ID, userId: USER_ID });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });
  });
});
