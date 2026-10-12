import { can } from './permissions';
import type { Reservation } from './reservation';
import { isActiveStatus } from './reservation';
import type { ResourceCategory } from './resource';
import { DAY_MS, HOUR_MS, getLocalParts } from './time';
import type { Actor } from './user';

/** R1 : nombre maximal de réservations à venir par adhérent et par catégorie. */
export const MAX_UPCOMING_PER_CATEGORY = 3;

/** R3 : délai maximal entre la demande et le début de la réservation, en jours. */
export const MAX_ADVANCE_DAYS = 30;

/** R4 : préavis minimal d'annulation par l'adhérent, en heures. */
export const MIN_CANCEL_NOTICE_HOURS = 24;

/**
 * R2 : durée maximale d'une réservation. Une salle est réservée quatre heures
 * au maximum, le matériel et le véhicule trois jours. Le studio n'est pas
 * précisé par le client : il suit la règle des salles (hypothèse à valider).
 */
export const maxDurationMs: Record<ResourceCategory, number> = {
  ROOM: 4 * HOUR_MS,
  STUDIO: 4 * HOUR_MS,
  VEHICLE: 3 * DAY_MS,
  EQUIPMENT: 3 * DAY_MS,
};

/**
 * RC-03 : temps de battement entre deux réservations d'une même ressource, en
 * minutes. Le client n'a pas encore tranché (RL-01) : aucun battement n'est
 * appliqué tant que la durée par catégorie n'est pas confirmée.
 */
export const bufferMinutes: Record<ResourceCategory, number> = {
  ROOM: 0,
  STUDIO: 0,
  VEHICLE: 0,
  EQUIPMENT: 0,
};

/**
 * RC-01 : le tiers-lieu est ouvert du lundi au samedi de 8 h à 20 h. Le
 * matériel et le véhicule peuvent chevaucher les heures de fermeture.
 */
export const openingHours = { openMinute: 8 * 60, closeMinute: 20 * 60, closedWeekday: 0 };

const categoriesBoundToOpeningHours: readonly ResourceCategory[] = ['ROOM', 'STUDIO'];

/** Règle de gestion enfreinte, avec le message affiché à l'utilisateur. */
export type RuleViolation = {
  rule: 'TIME' | 'R1' | 'R2' | 'R3' | 'R4' | 'RC-01' | 'STATUS';
  message: string;
};

/** Données nécessaires pour contrôler une nouvelle réservation. */
export type ReservationCheckInput = {
  category: ResourceCategory;
  startsAt: Date;
  endsAt: Date;
  now: Date;
  /** Réservations à venir et demandes en attente déjà détenues dans cette catégorie. */
  upcomingCount: number;
};

function formatDuration(ms: number): string {
  const days = ms / DAY_MS;

  return Number.isInteger(days) && days >= 1
    ? `${days} jour${days > 1 ? 's' : ''}`
    : `${ms / HOUR_MS} heures`;
}

/**
 * Contrôle une nouvelle réservation au regard des règles R1, R2, R3 et RC-01.
 * Les règles qui dépendent d'autres données (chevauchement, maintenance R5)
 * sont contrôlées par le service avec les données de la ressource.
 *
 * @param input Créneau demandé et situation de l'adhérent.
 * @returns La liste des règles enfreintes, vide si la demande est recevable.
 */
export function checkReservationRules(input: ReservationCheckInput): RuleViolation[] {
  const { category, startsAt, endsAt, now, upcomingCount } = input;
  const violations: RuleViolation[] = [];

  if (!(startsAt < endsAt)) {
    return [{ rule: 'TIME', message: 'La fin du créneau doit être postérieure à son début.' }];
  }

  if (startsAt <= now) {
    violations.push({ rule: 'TIME', message: 'Le créneau doit commencer dans le futur.' });
  }

  if (startsAt.getTime() > now.getTime() + MAX_ADVANCE_DAYS * DAY_MS) {
    violations.push({
      rule: 'R3',
      message: `Une réservation ne peut pas commencer plus de ${MAX_ADVANCE_DAYS} jours à l’avance.`,
    });
  }

  if (endsAt.getTime() - startsAt.getTime() > maxDurationMs[category]) {
    violations.push({
      rule: 'R2',
      message: `Cette catégorie se réserve ${formatDuration(maxDurationMs[category])} au maximum.`,
    });
  }

  if (upcomingCount >= MAX_UPCOMING_PER_CATEGORY) {
    violations.push({
      rule: 'R1',
      message: `Vous avez déjà ${MAX_UPCOMING_PER_CATEGORY} réservations ou demandes à venir dans cette catégorie.`,
    });
  }

  if (categoriesBoundToOpeningHours.includes(category) && !isWithinOpeningHours(startsAt, endsAt)) {
    violations.push({
      rule: 'RC-01',
      message: 'Ce créneau doit être compris entre 8 h et 20 h, du lundi au samedi.',
    });
  }

  return violations;
}

/**
 * Indique si un créneau tient dans les horaires d'ouverture (RC-01).
 *
 * @param startsAt Début du créneau.
 * @param endsAt Fin du créneau.
 */
export function isWithinOpeningHours(startsAt: Date, endsAt: Date): boolean {
  if (endsAt.getTime() - startsAt.getTime() >= DAY_MS) {
    return false;
  }

  const start = getLocalParts(startsAt);
  const end = getLocalParts(endsAt);
  const startMinute = start.hour * 60 + start.minute;
  const endMinute = end.hour * 60 + end.minute;

  return (
    start.weekday === end.weekday &&
    start.weekday !== openingHours.closedWeekday &&
    startMinute >= openingHours.openMinute &&
    endMinute <= openingHours.closeMinute
  );
}

/**
 * Indique si deux créneaux se chevauchent, en tenant compte d'un temps de
 * battement entre les deux.
 *
 * @param a Premier créneau.
 * @param b Second créneau.
 * @param bufferMs Temps de battement exigé entre deux créneaux, en millisecondes.
 */
export function slotsConflict(
  a: Pick<Reservation, 'startsAt' | 'endsAt'>,
  b: Pick<Reservation, 'startsAt' | 'endsAt'>,
  bufferMs = 0,
): boolean {
  return (
    a.startsAt.getTime() < b.endsAt.getTime() + bufferMs &&
    b.startsAt.getTime() < a.endsAt.getTime() + bufferMs
  );
}

/** Données nécessaires pour contrôler une annulation. */
export type CancellationCheckInput = {
  actor: Actor;
  reservation: Pick<Reservation, 'userId' | 'startsAt' | 'endsAt' | 'status'>;
  now: Date;
};

/**
 * Contrôle l'annulation d'une réservation (R4). Un adhérent annule sa propre
 * réservation jusqu'à 24 heures avant son début ; au-delà, seul un
 * gestionnaire peut l'annuler. Une réservation terminée ou déjà traitée ne
 * s'annule plus.
 *
 * @param input Personne, réservation et instant de la demande.
 * @returns `null` si l'annulation est autorisée, sinon la règle enfreinte.
 */
export function checkCancellation(input: CancellationCheckInput): RuleViolation | null {
  const { actor, reservation, now } = input;

  if (!isActiveStatus(reservation.status)) {
    return { rule: 'STATUS', message: 'Cette réservation n’est plus active.' };
  }

  if (reservation.endsAt <= now) {
    return { rule: 'STATUS', message: 'Cette réservation est terminée.' };
  }

  if (can(actor, 'reservation:cancel-any')) {
    return null;
  }

  if (reservation.startsAt.getTime() - now.getTime() < MIN_CANCEL_NOTICE_HOURS * HOUR_MS) {
    return {
      rule: 'R4',
      message: `Une réservation s’annule jusqu’à ${MIN_CANCEL_NOTICE_HOURS} heures avant son début. Contactez un gestionnaire.`,
    };
  }

  return null;
}
