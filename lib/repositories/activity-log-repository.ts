import type { ActivityEntry, NewActivityEntry } from '@/lib/domain/notification';

/** Contrat d'accès au journal d'activité (MongoDB). */
export interface ActivityLogRepository {
  /** Ajoute une entrée au journal. */
  append(input: NewActivityEntry): Promise<void>;
  /** Liste les entrées, de la plus récente à la plus ancienne. */
  findRecent(limit: number, skip: number): Promise<ActivityEntry[]>;
  /** Compte les entrées conservées. */
  count(): Promise<number>;
}
