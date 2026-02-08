import { DomainError } from './domain-error.js';

export class InvalidArgumentError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_ARGUMENT');
  }
}
