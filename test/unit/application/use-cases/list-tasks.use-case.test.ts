import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ListTasksInput } from '../../../../src/application/dtos/list-tasks.dto.js';
import { ListTasksUseCase } from '../../../../src/application/use-cases/list-tasks.use-case.js';
import { Task } from '../../../../src/domain/models/task.js';
import { type TaskRepository } from '../../../../src/domain/ports/driven/task-repository.port.js';
import { ConversationReference } from '../../../../src/domain/value-objects/conversation-reference.js';
import { TaskId } from '../../../../src/domain/value-objects/task-id.js';
import { TaskStatus } from '../../../../src/domain/value-objects/task-status.js';
import { UserId } from '../../../../src/domain/value-objects/user-id.js';

function createMockTaskRepository(): TaskRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    delete: vi.fn(),
  };
}

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';

function buildTask(overrides: { id?: string; title?: string; status?: TaskStatus } = {}): Task {
  return Task.reconstruct({
    id: TaskId.fromString(overrides.id ?? crypto.randomUUID()),
    userId: UserId.fromString(USER_ID),
    title: overrides.title ?? 'テストタスク',
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

describe('ListTasksUseCase', () => {
  let useCase: ListTasksUseCase;
  let taskRepository: TaskRepository;

  beforeEach(() => {
    taskRepository = createMockTaskRepository();
    useCase = new ListTasksUseCase(taskRepository);
  });

  it('userId のタスク一覧を取得できる', async () => {
    const tasks = [
      buildTask({ title: 'タスク1' }),
      buildTask({ title: 'タスク2' }),
    ];
    vi.mocked(taskRepository.findByUserId).mockResolvedValue(tasks);

    const input: ListTasksInput = { userId: USER_ID };
    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0].title).toBe('タスク1');
      expect(result.value[1].title).toBe('タスク2');
      expect(result.value[0].status).toBe('pending');
      expect(result.value[0].userId).toBe(USER_ID);
      expect(result.value[0].reminders).toEqual([]);
    }

    expect(taskRepository.findByUserId).toHaveBeenCalledWith(
      expect.objectContaining({ value: USER_ID }),
    );
  });

  it('statusFilter を指定した場合、結果がフィルタリングされる', async () => {
    const tasks = [
      buildTask({ title: 'pending タスク', status: TaskStatus.pending() }),
      buildTask({ title: 'completed タスク', status: TaskStatus.completed() }),
      buildTask({ title: 'in_progress タスク', status: TaskStatus.inProgress() }),
    ];
    vi.mocked(taskRepository.findByUserId).mockResolvedValue(tasks);

    const input: ListTasksInput = { userId: USER_ID, statusFilter: 'pending' };
    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].title).toBe('pending タスク');
    }
  });

  it('タスクが0件の場合、空配列が返る', async () => {
    vi.mocked(taskRepository.findByUserId).mockResolvedValue([]);

    const input: ListTasksInput = { userId: USER_ID };
    const result = await useCase.execute(input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([]);
    }
  });
});
