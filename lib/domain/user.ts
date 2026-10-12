/** Rôles fonctionnels (ADR 005). Le visiteur est l'absence de session. */
export const roles = ['MEMBER', 'MANAGER', 'ADMIN'] as const;

export type Role = (typeof roles)[number];

/** Libellés affichés pour chaque rôle. */
export const roleLabels: Record<Role, string> = {
  MEMBER: 'Adhérent',
  MANAGER: 'Gestionnaire',
  ADMIN: 'Administrateur',
};

/** Longueur minimale d'un mot de passe. */
export const MIN_PASSWORD_LENGTH = 12;

/** Utilisateur tel qu'il est exposé à l'application (sans mot de passe). */
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
};

/** Utilisateur avec son empreinte de mot de passe, réservé à l'authentification. */
export type UserCredentials = User & { passwordHash: string };

/** Personne qui effectue une action : identifiée côté serveur à partir de la session. */
export type Actor = { id: string; role: Role };

/**
 * Retourne le nom complet d'un utilisateur.
 *
 * @param user Utilisateur concerné.
 */
export function fullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`;
}

/**
 * Retire l'empreinte du mot de passe d'un compte.
 *
 * @param credentials Compte avec son empreinte de mot de passe.
 */
export function toPublicUser(credentials: UserCredentials): User {
  return {
    id: credentials.id,
    firstName: credentials.firstName,
    lastName: credentials.lastName,
    email: credentials.email,
    role: credentials.role,
    isActive: credentials.isActive,
  };
}
