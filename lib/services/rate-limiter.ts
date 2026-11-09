import type { Clock } from './clock';

/** Résultat d'un contrôle de limitation. */
export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Limiteur de tentatives en mémoire, utilisé contre le bourrage d'identifiants
 * (OWASP A07).
 *
 * shortcut: l'état est propre à chaque instance du serveur ; avec plusieurs
 * instances, passer à un stockage partagé (Redis ou table PostgreSQL).
 */
export class RateLimiter {
  private readonly attempts = new Map<string, number[]>();

  /**
   * @param maxAttempts Nombre de tentatives autorisées dans la fenêtre.
   * @param windowMs Durée de la fenêtre, en millisecondes.
   * @param clock Horloge utilisée pour dater les tentatives.
   */
  constructor(
    private readonly maxAttempts: number,
    private readonly windowMs: number,
    private readonly clock: Clock,
  ) {}

  /**
   * Indique si une nouvelle tentative est autorisée, sans la compter.
   *
   * @param key Clé de limitation, par exemple l'adresse e-mail.
   */
  check(key: string): RateLimitResult {
    const now = this.clock().getTime();
    const recent = this.prune(key, now);

    if (recent.length < this.maxAttempts) {
      return { allowed: true };
    }

    const retryAfterMs = recent[0] + this.windowMs - now;

    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  /**
   * Enregistre une tentative échouée.
   *
   * @param key Clé de limitation.
   */
  recordFailure(key: string): void {
    const now = this.clock().getTime();
    const recent = this.prune(key, now);

    recent.push(now);
    this.attempts.set(key, recent);
  }

  /**
   * Efface les tentatives d'une clé, après une connexion réussie.
   *
   * @param key Clé de limitation.
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  private prune(key: string, now: number): number[] {
    const recent = (this.attempts.get(key) ?? []).filter((time) => now - time < this.windowMs);

    if (recent.length === 0) {
      this.attempts.delete(key);
    } else {
      this.attempts.set(key, recent);
    }

    return recent;
  }
}
