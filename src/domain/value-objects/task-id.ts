import { InvalidArgumentError } from '../errors/invalid-argument.error.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TaskId {
  private constructor(public readonly value: string) {}

  static generate(): TaskId {
    return new TaskId(crypto.randomUUID());
  }

  static fromString(value: string): TaskId {
    if (!UUID_REGEX.test(value)) {
      throw new InvalidArgumentError(`Invalid TaskId: "${value}" is not a valid UUID`);
    }
    return new TaskId(value);
  }

  get shortId(): string {
    return this.value.slice(0, 8);
  }

  equals(other: TaskId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
