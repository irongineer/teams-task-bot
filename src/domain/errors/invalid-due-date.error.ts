import { DomainError } from './domain-error.js';

export class InvalidDueDateError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_DUE_DATE');
  }
}
