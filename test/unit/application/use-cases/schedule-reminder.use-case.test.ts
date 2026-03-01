import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ScheduleReminderInput } from '../../../../src/application/dtos/schedule-reminder.dto.js';
import { ScheduleReminderUseCase } from '../../../../src/application/use-cases/schedule-reminder.use-case.js';
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
const FUTURE_DATE = '2026-02-15T09:00:00.000Z';
const PAST_DATE = '2026-02-01T00:00:00.000Z';

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

describe('ScheduleReminderUseCase', () => {
  let useCase: ScheduleReminderUseCase;
  let taskRepository: TaskRepository;
  let eventPublisher: EventPublisher;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    taskRepository = createMockTaskRepository();
    eventPublisher = createMockEventPublisher();
    useCase = new ScheduleReminderUseCase(taskRepository, eventPublisher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('正常系', () => {
    it('タスクにリマインダーをスケジュールできる', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(buildTask());

      const input: ScheduleReminderInput = {
        taskId: TASK_ID,
        userId: USER_ID,
        scheduledAt: FUTURE_DATE,
      };
      const result = await useCase.execute(input);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.taskId).toBe(TASK_ID);
        expect(result.value.scheduledAt).toBe(FUTURE_DATE);
        expect(result.value.reminderId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });

    it('TaskRepository.save() が呼ばれる', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(buildTask());

      await useCase.execute({ taskId: TASK_ID, userId: USER_ID, scheduledAt: FUTURE_DATE });

      expect(taskRepository.save).toHaveBeenCalledTimes(1);
    });

    it('EventPublisher.publishAll() が ReminderScheduled イベント付きで呼ばれる', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(buildTask());

      await useCase.execute({ taskId: TASK_ID, userId: USER_ID, scheduledAt: FUTURE_DATE });

      expect(eventPublisher.publishAll).toHaveBeenCalledTimes(1);
      const events = vi.mocked(eventPublisher.publishAll).mock.calls[0][0];
      expect(events.some((e) => e.eventName === 'reminder.scheduled')).toBe(true);
    });
  });

  describe('異常系', () => {
    it('存在しないタスク ID の場合 TaskNotFoundError が返る', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(null);

      const result = await useCase.execute({
        taskId: TASK_ID,
        userId: USER_ID,
        scheduledAt: FUTURE_DATE,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });

    it('他のユーザーのタスクにスケジュールしようとした場合エラーが返る', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(
        buildTask({ userId: OTHER_USER_ID }),
      );

      const result = await useCase.execute({
        taskId: TASK_ID,
        userId: USER_ID,
        scheduledAt: FUTURE_DATE,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_NOT_FOUND');
      }
    });

    it('完了済みタスクにスケジュールしようとした場合エラーが返る', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(
        buildTask({ status: TaskStatus.completed() }),
      );

      const result = await useCase.execute({
        taskId: TASK_ID,
        userId: USER_ID,
        scheduledAt: FUTURE_DATE,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TASK_ALREADY_COMPLETED');
      }
    });

    it('過去の日時を指定した場合エラーが返る', async () => {
      vi.mocked(taskRepository.findById).mockResolvedValue(buildTask());

      const result = await useCase.execute({
        taskId: TASK_ID,
        userId: USER_ID,
        scheduledAt: PAST_DATE,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('INVALID_ARGUMENT');
      }
    });
  });
});
