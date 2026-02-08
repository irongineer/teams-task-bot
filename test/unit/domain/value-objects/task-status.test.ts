import { describe, expect, it } from 'vitest';

import { InvalidArgumentError } from '../../../../src/domain/errors/invalid-argument.error.js';
import { InvalidStatusTransitionError } from '../../../../src/domain/errors/invalid-status-transition.error.js';
import { TaskStatus } from '../../../../src/domain/value-objects/task-status.js';

describe('TaskStatus', () => {
  describe('create()', () => {
    it.each(['pending', 'in_progress', 'completed'])('"%s" で作成できる', (value) => {
      const status = TaskStatus.create(value);

      expect(status.value).toBe(value);
    });

    it('無効な文字列を渡すと InvalidArgumentError を投げる', () => {
      expect(() => TaskStatus.create('invalid')).toThrow(InvalidArgumentError);
    });

    it('エラーメッセージに無効な値と有効な値一覧が含まれる', () => {
      expect(() => TaskStatus.create('done')).toThrow(
        'Invalid TaskStatus: "done". Must be one of: pending, in_progress, completed',
      );
    });
  });

  describe('ファクトリメソッド', () => {
    it('pending() で pending ステータスを生成できる', () => {
      expect(TaskStatus.pending().value).toBe('pending');
    });

    it('inProgress() で in_progress ステータスを生成できる', () => {
      expect(TaskStatus.inProgress().value).toBe('in_progress');
    });

    it('completed() で completed ステータスを生成できる', () => {
      expect(TaskStatus.completed().value).toBe('completed');
    });
  });

  describe('transitionTo() — 許可される遷移', () => {
    it('pending → in_progress', () => {
      const result = TaskStatus.pending().transitionTo(TaskStatus.inProgress());

      expect(result.value).toBe('in_progress');
    });

    it('pending → completed', () => {
      const result = TaskStatus.pending().transitionTo(TaskStatus.completed());

      expect(result.value).toBe('completed');
    });

    it('in_progress → completed', () => {
      const result = TaskStatus.inProgress().transitionTo(TaskStatus.completed());

      expect(result.value).toBe('completed');
    });
  });

  describe('transitionTo() — 禁止される遷移', () => {
    it('completed → pending', () => {
      expect(() => TaskStatus.completed().transitionTo(TaskStatus.pending())).toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('completed → in_progress', () => {
      expect(() => TaskStatus.completed().transitionTo(TaskStatus.inProgress())).toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('completed → completed', () => {
      expect(() => TaskStatus.completed().transitionTo(TaskStatus.completed())).toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('in_progress → pending', () => {
      expect(() => TaskStatus.inProgress().transitionTo(TaskStatus.pending())).toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('エラーメッセージに遷移元と遷移先が含まれる', () => {
      expect(() => TaskStatus.completed().transitionTo(TaskStatus.pending())).toThrow(
        'Cannot transition from "completed" to "pending"',
      );
    });
  });

  describe('同一ステータスへの遷移', () => {
    it('pending → pending は禁止', () => {
      expect(() => TaskStatus.pending().transitionTo(TaskStatus.pending())).toThrow(
        InvalidStatusTransitionError,
      );
    });

    it('in_progress → in_progress は禁止', () => {
      expect(() => TaskStatus.inProgress().transitionTo(TaskStatus.inProgress())).toThrow(
        InvalidStatusTransitionError,
      );
    });
  });

  describe('クエリメソッド', () => {
    it('isPending() — pending なら true', () => {
      expect(TaskStatus.pending().isPending()).toBe(true);
      expect(TaskStatus.inProgress().isPending()).toBe(false);
      expect(TaskStatus.completed().isPending()).toBe(false);
    });

    it('isInProgress() — in_progress なら true', () => {
      expect(TaskStatus.inProgress().isInProgress()).toBe(true);
      expect(TaskStatus.pending().isInProgress()).toBe(false);
      expect(TaskStatus.completed().isInProgress()).toBe(false);
    });

    it('isCompleted() — completed なら true', () => {
      expect(TaskStatus.completed().isCompleted()).toBe(true);
      expect(TaskStatus.pending().isCompleted()).toBe(false);
      expect(TaskStatus.inProgress().isCompleted()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('同じ値なら true を返す', () => {
      expect(TaskStatus.pending().equals(TaskStatus.pending())).toBe(true);
    });

    it('異なる値なら false を返す', () => {
      expect(TaskStatus.pending().equals(TaskStatus.completed())).toBe(false);
    });
  });

  describe('toString()', () => {
    it('ステータス文字列を返す', () => {
      expect(TaskStatus.pending().toString()).toBe('pending');
      expect(TaskStatus.inProgress().toString()).toBe('in_progress');
      expect(TaskStatus.completed().toString()).toBe('completed');
    });
  });
});
