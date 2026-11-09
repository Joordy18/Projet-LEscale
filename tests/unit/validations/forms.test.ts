import { describe, expect, it } from 'vitest';
import { accountSchema } from '@/lib/validations/forms';

const account = {
  firstName: 'Alice',
  lastName: 'Martin',
  email: 'alice@lescale.test',
  role: 'MEMBER',
};

describe('accountSchema', () => {
  it('accepte un mot de passe de 12 caractères', () => {
    expect(accountSchema.safeParse({ ...account, password: 'Abcdefgh1234' }).success).toBe(true);
  });

  it('refuse un mot de passe trop court ou fait uniquement d’espaces', () => {
    expect(accountSchema.safeParse({ ...account, password: 'court' }).success).toBe(false);
    expect(accountSchema.safeParse({ ...account, password: ' '.repeat(12) }).success).toBe(false);
  });
});
