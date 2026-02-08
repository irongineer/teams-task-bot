import { describe, expect, it } from 'vitest';

import { InvalidArgumentError } from '../../../../src/domain/errors/invalid-argument.error.js';
import { ReminderId } from '../../../../src/domain/value-objects/reminder-id.js';

describe('ReminderId', () => {
  describe('generate()', () => {
    it('有効な UUID が生成される', () => {
      const reminderId = ReminderId.generate();

      expect(reminderId.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('呼び出すたびに異なる ID が生成される', () => {
      const id1 = ReminderId.generate();
      const id2 = ReminderId.generate();

      expect(id1.value).not.toBe(id2.value);
    });
  });

  describe('fromString()', () => {
    it('有効な UUID 文字列から復元できる', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const reminderId = ReminderId.fromString(uuid);

      expect(reminderId.value).toBe(uuid);
    });

    it('無効な文字列を渡すと InvalidArgumentError を投げる', () => {
      expect(() => ReminderId.fromString('not-a-uuid')).toThrow(InvalidArgumentError);
    });

    it('空文字列を渡すと InvalidArgumentError を投げる', () => {
      expect(() => ReminderId.fromString('')).toThrow(InvalidArgumentError);
    });

    it('エラーメッセージに無効な値が含まれる', () => {
      expect(() => ReminderId.fromString('bad')).toThrow(
        'Invalid ReminderId: "bad" is not a valid UUID',
      );
    });
  });

  describe('equals()', () => {
    it('同じ値なら true を返す', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const id1 = ReminderId.fromString(uuid);
      const id2 = ReminderId.fromString(uuid);

      expect(id1.equals(id2)).toBe(true);
    });

    it('異なる値なら false を返す', () => {
      const id1 = ReminderId.fromString('550e8400-e29b-41d4-a716-446655440000');
      const id2 = ReminderId.fromString('660e8400-e29b-41d4-a716-446655440000');

      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('UUID 文字列を返す', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const reminderId = ReminderId.fromString(uuid);

      expect(reminderId.toString()).toBe(uuid);
    });
  });
});
