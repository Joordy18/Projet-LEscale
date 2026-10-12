import type { User } from '@/lib/domain/user';
import { getServices } from '@/lib/services';
import { accountSchema, activationSchema, roleChangeSchema } from '@/lib/validations/forms';
import { executeForm, type Result } from './execute';
import { requireUser } from './session';

/** Charge tous les comptes pour l'administration. */
export async function loadUsers(): Promise<{ users: User[]; currentUserId: string }> {
  const user = await requireUser('user:manage', '/admin/comptes');

  return {
    users: await getServices().users.list({ id: user.id, role: user.role }),
    currentUserId: user.id,
  };
}

/**
 * Crée un compte (EF-02).
 *
 * @param formData Identité, mot de passe initial et rôle.
 */
export function createAccount(formData: FormData): Promise<Result<User>> {
  return executeForm(accountSchema, formData, (actor, input) =>
    getServices().users.create(actor, input),
  );
}

/**
 * Change le rôle d'un compte (EF-02).
 *
 * @param formData Identifiant du compte et nouveau rôle.
 */
export function changeRole(formData: FormData): Promise<Result<User>> {
  return executeForm(roleChangeSchema, formData, (actor, { userId, role }) =>
    getServices().users.changeRole(actor, userId, role),
  );
}

/**
 * Active ou désactive un compte (EF-02, R7).
 *
 * @param formData Identifiant du compte et état souhaité.
 */
export function setUserActive(formData: FormData): Promise<Result<User>> {
  return executeForm(activationSchema, formData, (actor, { userId, isActive }) =>
    getServices().users.setActive(actor, userId, isActive),
  );
}
