import { forbiddenError, unauthenticatedError } from './errors';
import type { Actor, Role } from './user';

/** Actions protégées de l'application, regroupées par famille. */
export type Permission =
  | 'reservation:create'
  | 'reservation:cancel-any'
  | 'reservation:decide'
  | 'catalogue:manage'
  | 'maintenance:manage'
  | 'activity:read'
  | 'dashboard:read'
  | 'user:manage';

const staff: readonly Role[] = ['MANAGER', 'ADMIN'];

const permissionRoles: Record<Permission, readonly Role[]> = {
  'reservation:create': ['MEMBER', 'MANAGER', 'ADMIN'],
  'reservation:cancel-any': staff,
  'reservation:decide': staff,
  'catalogue:manage': staff,
  'maintenance:manage': staff,
  'activity:read': staff,
  'dashboard:read': staff,
  'user:manage': ['ADMIN'],
};

/**
 * Indique si une personne peut effectuer une action.
 *
 * @param actor Personne connectée, ou `null` pour un visiteur.
 * @param permission Action demandée.
 */
export function can(actor: Actor | null, permission: Permission): boolean {
  return actor !== null && permissionRoles[permission].includes(actor.role);
}

/**
 * Vérifie qu'une personne peut effectuer une action.
 *
 * @param actor Personne connectée, ou `null` pour un visiteur.
 * @param permission Action demandée.
 * @throws DomainError `UNAUTHENTICATED` pour un visiteur, `FORBIDDEN` si le rôle ne suffit pas.
 */
export function assertCan(actor: Actor | null, permission: Permission): asserts actor is Actor {
  if (actor === null) {
    throw unauthenticatedError();
  }

  if (!can(actor, permission)) {
    throw forbiddenError();
  }
}
