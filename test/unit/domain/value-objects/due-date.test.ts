import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InvalidDueDateError } from '../../../../src/domain/errors/invalid-due-date.error.js';
import { DueDate } from '../../../../src/domain/value-objects/due-date.js';

const NOW = new Date('2026-02-09T12:00:00.000Z');

describe('DueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('create()', () => {
    it('未来の日付で作成できる', () => {
      const future = new Date('2026-02-10T12:00:00.000Z');
      const dueDate = DueDate.create(future);

      expect(dueDate.value).toEqual(future);
    });

    it('現在時刻と同じ日時で作成できる', () => {
      const dueDate = DueDate.create(NOW);

      expect(dueDate.value).toEqual(NOW);
    });

    it('過去の日付を渡すと InvalidDueDateError を投げる', () => {
      const past = new Date('2026-02-08T12:00:00.000Z');

      expect(() => DueDate.create(past)).toThrow(InvalidDueDateError);
    });

    it('エラーメッセージに日付が含まれる', () => {
      const past = new Date('2026-02-08T12:00:00.000Z');

      expect(() => DueDate.create(past)).toThrow('Due date must be in the future');
    });
  });

  describe('isOverdue()', () => {
    it('期日を過ぎていたら true を返す', () => {
      const future = new Date('2026-02-10T12:00:00.000Z');
      const dueDate = DueDate.create(future);

      vi.setSystemTime(new Date('2026-02-11T00:00:00.000Z'));

      expect(dueDate.isOverdue()).toBe(true);
    });

    it('期日前なら false を返す', () => {
      const future = new Date('2026-02-10T12:00:00.000Z');
      const dueDate = DueDate.create(future);

      expect(dueDate.isOverdue()).toBe(false);
    });

    it('期日と現在時刻が同じなら false を返す', () => {
      const future = new Date('2026-02-10T12:00:00.000Z');
      const dueDate = DueDate.create(future);

      vi.setSystemTime(new Date('2026-02-10T12:00:00.000Z'));

      expect(dueDate.isOverdue()).toBe(false);
    });
  });

  describe('equals()', () => {
    it('同じ日時なら true を返す', () => {
      const date = new Date('2026-02-10T12:00:00.000Z');
      const d1 = DueDate.create(date);
      const d2 = DueDate.create(date);

      expect(d1.equals(d2)).toBe(true);
    });

    it('異なる日時なら false を返す', () => {
      const d1 = DueDate.create(new Date('2026-02-10T12:00:00.000Z'));
      const d2 = DueDate.create(new Date('2026-02-11T12:00:00.000Z'));

      expect(d1.equals(d2)).toBe(false);
    });
  });

  describe('toISOString()', () => {
    it('ISO 8601 形式の文字列を返す', () => {
      const date = new Date('2026-02-10T12:00:00.000Z');
      const dueDate = DueDate.create(date);

      expect(dueDate.toISOString()).toBe('2026-02-10T12:00:00.000Z');
    });
  });
});
