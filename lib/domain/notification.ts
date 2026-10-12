export const notificationTypes = [
  'REQUEST_CREATED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'RESERVATION_CANCELLED',
  'RESERVATION_CANCELLED_BY_MAINTENANCE',
  'RESERVATION_EXPIRED',
  'ACCOUNT_DEACTIVATED',
] as const;

export type NotificationType = (typeof notificationTypes)[number];

/** Notification affichée dans l'application (stockée dans MongoDB). */
export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Page à ouvrir depuis la notification, relative à l'application. */
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/** Données nécessaires pour créer une notification. */
export type NewNotification = Omit<Notification, 'id' | 'readAt' | 'createdAt'>;

/** Action enregistrée dans le journal d'activité (EF-12). */
export const activityActions = [
  'USER_CREATED',
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'USER_REACTIVATED',
  'USER_DELETED',
  'RESOURCE_CREATED',
  'RESOURCE_UPDATED',
  'RESOURCE_ARCHIVED',
  'RESOURCE_RESTORED',
  'RESERVATION_CREATED',
  'RESERVATION_APPROVED',
  'RESERVATION_REJECTED',
  'RESERVATION_CANCELLED',
  'RESERVATION_EXPIRED',
  'MAINTENANCE_SCHEDULED',
  'MAINTENANCE_CANCELLED',
] as const;

export type ActivityAction = (typeof activityActions)[number];

/** Libellés affichés dans le journal. */
export const activityActionLabels: Record<ActivityAction, string> = {
  USER_CREATED: 'Compte créé',
  USER_ROLE_CHANGED: 'Rôle modifié',
  USER_DEACTIVATED: 'Compte désactivé',
  USER_REACTIVATED: 'Compte réactivé',
  USER_DELETED: 'Compte supprimé',
  RESOURCE_CREATED: 'Ressource créée',
  RESOURCE_UPDATED: 'Ressource modifiée',
  RESOURCE_ARCHIVED: 'Ressource retirée',
  RESOURCE_RESTORED: 'Ressource rétablie',
  RESERVATION_CREATED: 'Réservation créée',
  RESERVATION_APPROVED: 'Demande validée',
  RESERVATION_REJECTED: 'Demande refusée',
  RESERVATION_CANCELLED: 'Réservation annulée',
  RESERVATION_EXPIRED: 'Demande expirée',
  MAINTENANCE_SCHEDULED: 'Maintenance planifiée',
  MAINTENANCE_CANCELLED: 'Maintenance annulée',
};

/** Entrée du journal d'activité : auteur, action, cible et date. */
export type ActivityEntry = {
  id: string;
  authorId: string;
  action: ActivityAction;
  targetType: 'User' | 'Resource' | 'Reservation' | 'MaintenancePeriod';
  targetId: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: Date;
};

/** Données nécessaires pour enregistrer une entrée du journal. */
export type NewActivityEntry = Omit<ActivityEntry, 'id' | 'createdAt'>;
