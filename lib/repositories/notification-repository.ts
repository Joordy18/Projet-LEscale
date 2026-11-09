import type { NewNotification, Notification } from '@/lib/domain/notification';

/** Contrat d'accès aux notifications (MongoDB). */
export interface NotificationRepository {
  /** Enregistre une notification. */
  create(input: NewNotification): Promise<void>;
  /** Enregistre plusieurs notifications. */
  createMany(inputs: NewNotification[]): Promise<void>;
  /** Liste les notifications d'un utilisateur, de la plus récente à la plus ancienne. */
  findByUser(userId: string, limit: number): Promise<Notification[]>;
  /** Compte les notifications non lues d'un utilisateur. */
  countUnread(userId: string): Promise<number>;
  /** Marque une notification comme lue, uniquement si elle appartient à cet utilisateur. */
  markRead(userId: string, notificationId: string, readAt: Date): Promise<void>;
  /** Marque toutes les notifications d'un utilisateur comme lues. */
  markAllRead(userId: string, readAt: Date): Promise<void>;
  /** Supprime les notifications d'un utilisateur (suppression de compte). */
  deleteByUser(userId: string): Promise<void>;
}
