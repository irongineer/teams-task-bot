import { describe, expect, it } from 'vitest';

import { InvalidArgumentError } from '../../../../src/domain/errors/invalid-argument.error.js';
import { ConversationReference } from '../../../../src/domain/value-objects/conversation-reference.js';

const VALID_PROPS = {
  conversationId: 'conv-id-123',
  serviceUrl: 'https://smba.trafficmanager.net/jp/',
};

describe('ConversationReference', () => {
  describe('create()', () => {
    it('必須プロパティのみで作成できる', () => {
      const ref = ConversationReference.create(VALID_PROPS);

      expect(ref.conversationId).toBe(VALID_PROPS.conversationId);
      expect(ref.serviceUrl).toBe(VALID_PROPS.serviceUrl);
      expect(ref.channelId).toBeUndefined();
    });

    it('channelId を含めて作成できる', () => {
      const ref = ConversationReference.create({
        ...VALID_PROPS,
        channelId: 'msteams',
      });

      expect(ref.channelId).toBe('msteams');
    });

    it('conversationId が空文字列なら InvalidArgumentError を投げる', () => {
      expect(() =>
        ConversationReference.create({ ...VALID_PROPS, conversationId: '' }),
      ).toThrow(InvalidArgumentError);
      expect(() =>
        ConversationReference.create({ ...VALID_PROPS, conversationId: '' }),
      ).toThrow('conversationId must not be empty');
    });

    it('serviceUrl が空文字列なら InvalidArgumentError を投げる', () => {
      expect(() => ConversationReference.create({ ...VALID_PROPS, serviceUrl: '' })).toThrow(
        InvalidArgumentError,
      );
      expect(() => ConversationReference.create({ ...VALID_PROPS, serviceUrl: '' })).toThrow(
        'serviceUrl must not be empty',
      );
    });
  });

  describe('equals()', () => {
    it('全プロパティが同じなら true を返す', () => {
      const r1 = ConversationReference.create(VALID_PROPS);
      const r2 = ConversationReference.create(VALID_PROPS);

      expect(r1.equals(r2)).toBe(true);
    });

    it('channelId を含めて全プロパティが同じなら true を返す', () => {
      const props = { ...VALID_PROPS, channelId: 'msteams' };
      const r1 = ConversationReference.create(props);
      const r2 = ConversationReference.create(props);

      expect(r1.equals(r2)).toBe(true);
    });

    it('conversationId が異なれば false を返す', () => {
      const r1 = ConversationReference.create(VALID_PROPS);
      const r2 = ConversationReference.create({ ...VALID_PROPS, conversationId: 'other' });

      expect(r1.equals(r2)).toBe(false);
    });

    it('serviceUrl が異なれば false を返す', () => {
      const r1 = ConversationReference.create(VALID_PROPS);
      const r2 = ConversationReference.create({
        ...VALID_PROPS,
        serviceUrl: 'https://other.example.com/',
      });

      expect(r1.equals(r2)).toBe(false);
    });

    it('channelId の有無が異なれば false を返す', () => {
      const r1 = ConversationReference.create(VALID_PROPS);
      const r2 = ConversationReference.create({ ...VALID_PROPS, channelId: 'msteams' });

      expect(r1.equals(r2)).toBe(false);
    });
  });
});
