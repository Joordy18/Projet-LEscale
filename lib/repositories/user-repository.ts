import type { Role, User, UserCredentials } from '@/lib/domain/user';

/** Données nécessaires pour créer un compte. */
export type NewUser = {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: Role;
};

/** Contrat d'accès aux comptes utilisateurs. */
export interface UserRepository {
  /** Retourne un compte sans son empreinte de mot de passe, ou `null`. */
  findById(id: string): Promise<User | null>;
  /** Retourne un compte avec son empreinte de mot de passe, pour l'authentification. */
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  /** Retourne les comptes portant ces identifiants. */
  findByIds(ids: readonly string[]): Promise<User[]>;
  /** Liste tous les comptes, triés par nom. */
  findAll(): Promise<User[]>;
  /** Liste les comptes actifs ayant l'un de ces rôles. */
  findActiveByRoles(roles: readonly Role[]): Promise<User[]>;
  /** Compte les comptes administrateurs actifs. */
  countActiveAdmins(): Promise<number>;
  /** Crée un compte actif. */
  create(input: NewUser): Promise<User>;
  /** Change le rôle d'un compte. */
  updateRole(id: string, role: Role): Promise<User>;
  /** Active ou désactive un compte. */
  setActive(id: string, isActive: boolean): Promise<User>;
  /** Remplace l'empreinte du mot de passe. */
  updatePasswordHash(id: string, passwordHash: string): Promise<void>;
  /** Supprime un compte ; ses réservations passées sont anonymisées. */
  delete(id: string): Promise<void>;
}
