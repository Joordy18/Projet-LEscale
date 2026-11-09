import { expect } from 'vitest';
import { DomainError, type DomainErrorCode } from '@/lib/domain/errors';

/** Vérifie qu'une promesse échoue avec une erreur métier du code attendu. */
export async function expectDomainError(
  promise: Promise<unknown>,
  code: DomainErrorCode,
  messagePart?: string | RegExp,
): Promise<void> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );

  expect(error).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);

  if (messagePart) {
    expect((error as DomainError).message).toMatch(messagePart);
  }
}
