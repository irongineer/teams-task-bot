import { InvalidArgumentError } from '../errors/invalid-argument.error.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReminderId {
  private constructor(public readonly value: string) {}

  static generate(): ReminderId {
    return new ReminderId(crypto.randomUUID());
  }

  static fromString(value: string): ReminderId {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidArgumentError(`Invalid ReminderId: "${value}" is not a valid UUID`);
    }
    return new ReminderId(value);
  }

  equals(other: ReminderId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
