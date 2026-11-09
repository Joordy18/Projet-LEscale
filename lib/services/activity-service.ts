import { assertCan } from '@/lib/domain/permissions';
import type { ActivityEntry, NewActivityEntry } from '@/lib/domain/notification';
import { fullName, type Actor } from '@/lib/domain/user';
import type { ActivityLogRepository } from '@/lib/repositories/activity-log-repository';
import type { UserRepository } from '@/lib/repositories/user-repository';

/** Auteur des actions déclenchées automatiquement par l'application. */
export const SYSTEM_AUTHOR = 'system';

/** Nombre d'entrées affichées par page du journal. */
export const ACTIVITY_PAGE_SIZE = 25;

/** Service du journal d'activité (EF-12). */
export class ActivityService {
  /**
   * @param repository Repository du journal d'activité.
   * @param users Repository des comptes, pour afficher le nom des auteurs.
   */
  constructor(
    private readonly repository: ActivityLogRepository,
    private readonly users: UserRepository,
  ) {}

  /**
   * Enregistre une action importante. L'échec de l'écriture du journal est
   * signalé dans les logs serveur mais ne fait pas échouer l'action métier
   * déjà effectuée.
   *
   * @param entry Auteur, action et cible.
   */
  async record(entry: NewActivityEntry): Promise<void> {
    try {
      await this.repository.append(entry);
    } catch (error) {
      console.error('Journal d’activité indisponible', error);
    }
  }

  /**
   * Liste une page du journal, de la plus récente à la plus ancienne.
   *
   * @param actor Personne connectée.
   * @param page Numéro de page, à partir de 1.
   */
  async list(
    actor: Actor | null,
    page = 1,
  ): Promise<{
    entries: ActivityEntry[];
    total: number;
    pageSize: number;
    authorNames: Record<string, string>;
  }> {
    assertCan(actor, 'activity:read');

    const safePage = Math.max(1, Math.floor(page));
    const [entries, total] = await Promise.all([
      this.repository.findRecent(ACTIVITY_PAGE_SIZE, (safePage - 1) * ACTIVITY_PAGE_SIZE),
      this.repository.count(),
    ]);

    const authors = await this.users.findByIds([
      ...new Set(entries.map((entry) => entry.authorId)),
    ]);
    const authorNames = Object.fromEntries(authors.map((user) => [user.id, fullName(user)]));

    return { entries, total, pageSize: ACTIVITY_PAGE_SIZE, authorNames };
  }
}
