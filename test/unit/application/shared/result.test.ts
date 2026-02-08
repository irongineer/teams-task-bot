import { describe, expect, it } from 'vitest';

import { type Result, err, ok } from '../../../../src/application/shared/result.js';

describe('Result', () => {
  describe('ok()', () => {
    it('isOk() が true を返す', () => {
      const result = ok('success');

      expect(result.isOk()).toBe(true);
    });

    it('isErr() が false を返す', () => {
      const result = ok('success');

      expect(result.isErr()).toBe(false);
    });

    it('value プロパティで値にアクセスできる', () => {
      const result = ok(42);

      expect(result.value).toBe(42);
    });

    it('オブジェクトを値として保持できる', () => {
      const data = { id: '1', name: 'test' };
      const result = ok(data);

      expect(result.value).toEqual(data);
    });
  });

  describe('err()', () => {
    it('isErr() が true を返す', () => {
      const result = err('failure');

      expect(result.isErr()).toBe(true);
    });

    it('isOk() が false を返す', () => {
      const result = err('failure');

      expect(result.isOk()).toBe(false);
    });

    it('error プロパティでエラーにアクセスできる', () => {
      const result = err(new Error('something went wrong'));

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('something went wrong');
    });
  });

  describe('型の絞り込み', () => {
    it('isOk() で型ガードが効き value に安全にアクセスできる', () => {
      const result: Result<number, string> = ok(42);

      if (result.isOk()) {
        expect(result.value).toBe(42);
      } else {
        expect.unreachable('should be Ok');
      }
    });

    it('isErr() で型ガードが効き error に安全にアクセスできる', () => {
      const result: Result<number, string> = err('failure');

      if (result.isErr()) {
        expect(result.error).toBe('failure');
      } else {
        expect.unreachable('should be Err');
      }
    });
  });
});
