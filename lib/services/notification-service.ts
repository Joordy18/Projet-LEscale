import { unauthenticatedError } from '@/lib/domain/errors';
import type { NewNotification, Notification } from '@/lib/domain/notification';
import type { Actor } from '@/lib/domain/user';
import type { NotificationRepository } from '@/lib/repositories/notification-repository';
import type { Clock } from './clock';

/** Nombre maximal de notifications affichées. */
export const NOTIFICATION_LIMIT = 50;

/** Service des notifications dans l'application (EF-11). */
export class NotificationService {
  /**
   * @param repository Repository des notifications.
   * @param clock Horloge utilisée pour dater les lectures.
   */
  constructor(
    private readonly repository: NotificationRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Envoie des notifications. Comme pour le journal, une panne du stockage ne
   * fait pas échouer l'action métier qui les a déclenchées.
   *
   * @param notifications Notifications à enregistrer.
   */
  async send(...notifications: NewNotification[]): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    try {
      await this.repository.createMany(notifications);
    } catch (error) {
      console.error('Notifications indisponibles', error);
    }
  }

  /**
   * Liste les notifications de la personne connectée.
   *
   * @param actor Personne connectée.
   */
  async listMine(actor: Actor | null): Promise<Notification[]> {
    if (!actor) {
      throw unauthenticatedError();
    }

    return this.repository.findByUser(actor.id, NOTIFICATION_LIMIT);
  }

  /**
   * Compte les notifications non lues de la personne connectée.
   *
   * @param actor Personne connectée, ou `null` pour un visiteur (0 notification).
   */
  async countUnread(actor: Actor | null): Promise<number> {
    if (!actor) {
      return 0;
    }

    try {
      return await this.repository.countUnread(actor.id);
    } catch (error) {
      console.error('Notifications indisponibles', error);
      return 0;
    }
  }

  /**
   * Marque une notification comme lue. Seules les notifications de la
   * personne connectée sont concernées.
   *
   * @param actor Personne connectée.
   * @param notificationId Notification à marquer.
   */
  async markRead(actor: Actor | null, notificationId: string): Promise<void> {
    if (!actor) {
      throw unauthenticatedError();
    }

    await this.repository.markRead(actor.id, notificationId, this.clock());
  }

  /**
   * Marque toutes les notifications de la personne connectée comme lues.
   *
   * @param actor Personne connectée.
   */
  async markAllRead(actor: Actor | null): Promise<void> {
    if (!actor) {
      throw unauthenticatedError();
    }

    await this.repository.markAllRead(actor.id, this.clock());
  }
}
