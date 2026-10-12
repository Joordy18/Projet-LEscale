import bcrypt from 'bcryptjs';

/** Contrat de hachage des mots de passe. */
export interface PasswordHasher {
  /** Calcule l'empreinte d'un mot de passe. */
  hash(password: string): Promise<string>;
  /** Compare un mot de passe à une empreinte. */
  verify(password: string, hash: string): Promise<boolean>;
}

/** Hachage bcrypt avec sel intégré. */
export class BcryptPasswordHasher implements PasswordHasher {
  /**
   * @param rounds Coût du hachage (12 en production, plus bas dans les tests).
   */
  constructor(private readonly rounds = 12) {}

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
