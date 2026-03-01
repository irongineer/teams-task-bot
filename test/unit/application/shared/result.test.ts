import { describe, expect, it } from 'vitest';

import {
  type Result,
  err,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  unwrap,
} from '../../../../src/application/shared/result.js';

describe('Result', () => {
  describe('ok()', () => {
    it('ok: true を返す', () => {
      const result = ok('success');

      expect(result.ok).toBe(true);
    });

    it('value プロパティで値にアクセスできる', () => {
      const result = ok(42);

      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('オブジェクトを値として保持できる', () => {
      const data = { id: '1', name: 'test' };
      const result = ok(data);

      if (result.ok) {
        expect(result.value).toEqual(data);
      }
    });
  });

  describe('err()', () => {
    it('ok: false を返す', () => {
      const result = err('failure');

      expect(result.ok).toBe(false);
    });

    it('error プロパティでエラーにアクセスできる', () => {
      const result = err(new Error('something went wrong'));

      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe('something went wrong');
      }
    });
  });

  describe('isOk()', () => {
    it('Ok なら true を返す', () => {
      expect(isOk(ok(42))).toBe(true);
    });

    it('Err なら false を返す', () => {
      expect(isOk(err('failure'))).toBe(false);
    });

    it('型ガードが効き value に安全にアクセスできる', () => {
      const result: Result<number, string> = ok(42);

      if (isOk(result)) {
        expect(result.value).toBe(42);
      } else {
        expect.unreachable('should be Ok');
      }
    });
  });

  describe('isErr()', () => {
    it('Err なら true を返す', () => {
      expect(isErr(err('failure'))).toBe(true);
    });

    it('Ok なら false を返す', () => {
      expect(isErr(ok(42))).toBe(false);
    });

    it('型ガードが効き error に安全にアクセスできる', () => {
      const result: Result<number, string> = err('failure');

      if (isErr(result)) {
        expect(result.error).toBe('failure');
      } else {
        expect.unreachable('should be Err');
      }
    });
  });

  describe('map()', () => {
    it('Ok の値を変換する', () => {
      const result = map(ok(2), (v) => v * 3);

      expect(result).toEqual({ ok: true, value: 6 });
    });

    it('Err はそのまま返す', () => {
      const result: Result<number, string> = err('failure');
      const mapped = map(result, (v) => v * 3);

      expect(mapped).toEqual({ ok: false, error: 'failure' });
    });
  });

  describe('mapErr()', () => {
    it('Err のエラーを変換する', () => {
      const result: Result<number, string> = err('failure');
      const mapped = mapErr(result, (e) => new Error(e));

      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBeInstanceOf(Error);
        expect(mapped.error.message).toBe('failure');
      }
    });

    it('Ok はそのまま返す', () => {
      const result = ok(42);
      const mapped = mapErr(result, (e: string) => new Error(e));

      expect(mapped).toEqual({ ok: true, value: 42 });
    });
  });

  describe('unwrap()', () => {
    it('Ok なら値を返す', () => {
      expect(unwrap(ok(42))).toBe(42);
    });

    it('Err なら throw する', () => {
      expect(() => unwrap(err(new Error('boom')))).toThrow('boom');
    });
  });
});
