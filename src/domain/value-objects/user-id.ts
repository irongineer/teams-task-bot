import { InvalidArgumentError } from '../errors/invalid-argument.error.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UserId {
  private constructor(public readonly value: string) {}

  static generate(): UserId {
    return new UserId(crypto.randomUUID());
  }

  static fromString(value: string): UserId {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidArgumentError(`Invalid UserId: "${value}" is not a valid UUID`);
    }
    return new UserId(value);
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
