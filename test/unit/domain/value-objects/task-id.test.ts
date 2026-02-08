import { describe, expect, it } from 'vitest';

import { InvalidArgumentError } from '../../../../src/domain/errors/invalid-argument.error.js';
import { TaskId } from '../../../../src/domain/value-objects/task-id.js';

describe('TaskId', () => {
  describe('generate()', () => {
    it('有効な UUID が生成される', () => {
      const taskId = TaskId.generate();

      expect(taskId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('呼び出すたびに異なる ID が生成される', () => {
      const id1 = TaskId.generate();
      const id2 = TaskId.generate();

      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('fromString()', () => {
    it('有効な UUID 文字列から復元できる', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const taskId = TaskId.fromString(uuid);

      expect(taskId.value).toBe(uuid);
    });

    it('無効な文字列を渡すと InvalidArgumentError を投げる', () => {
      expect(() => TaskId.fromString('not-a-uuid')).toThrow(InvalidArgumentError);
    });

    it('空文字列を渡すと InvalidArgumentError を投げる', () => {
      expect(() => TaskId.fromString('')).toThrow(InvalidArgumentError);
    });

    it('エラーメッセージに無効な値が含まれる', () => {
      expect(() => TaskId.fromString('bad')).toThrow('Invalid TaskId: "bad" is not a valid UUID');
    });
  });

  describe('shortId', () => {
    it('UUID の先頭 8 文字を返す', () => {
      const taskId = TaskId.fromString('550e8400-e29b-41d4-a716-446655440000');

      expect(taskId.shortId).toBe('550e8400');
    });
  });

  describe('equals()', () => {
    it('同じ値なら true を返す', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id1 = TaskId.fromString(uuid);
      const id2 = TaskId.fromString(uuid);

      expect(id1.equals(id2)).toBe(true);
    });

    it('異なる値なら false を返す', () => {
      const id1 = TaskId.fromString('550e8400-e29b-41d4-a716-446655440000');
      const id2 = TaskId.fromString('660e8400-e29b-41d4-a716-446655440000');

      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('UUID 文字列を返す', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const taskId = TaskId.fromString(uuid);

      expect(taskId.toString()).toBe(uuid);
    });
  });
});
