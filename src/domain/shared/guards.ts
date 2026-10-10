import { DomainError } from './DomainError';

export function assertNonEmpty(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new DomainError(`${field} is required`);
  return trimmed;
}

export function assertValidDate(value: Date, field: string): Date {
  if (Number.isNaN(value.getTime())) throw new DomainError(`${field} is not a valid date`);
  return value;
}
