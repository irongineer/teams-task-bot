import { InvalidDueDateError } from '../errors/invalid-due-date.error.js';

export class DueDate {
  private constructor(public readonly value: Date) {}

  static create(date: Date, now: Date = new Date()): DueDate {
    if (date.getTime() < now.getTime()) {
      throw new InvalidDueDateError(
        `Due date must be in the future: ${date.toISOString()} is before ${now.toISOString()}`,
      );
    }
    return new DueDate(date);
  }

  isOverdue(now: Date = new Date()): boolean {
    return this.value.getTime() < now.getTime();
  }

  equals(other: DueDate): boolean {
    return this.value.getTime() === other.value.getTime();
  }

  toISOString(): string {
    return this.value.toISOString();
  }
}
