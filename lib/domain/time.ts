/**
 * Fuseau horaire de référence de L'Escale (hypothèse H-04 du dossier
 * d'analyse). Les dates sont stockées en UTC et affichées dans ce fuseau.
 */
export const APP_TIME_ZONE = 'Europe/Paris';

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** Jour de la semaine (0 = dimanche) et heure locale dans le fuseau de l'application. */
export type LocalParts = { weekday: number; hour: number; minute: number };

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Décompose une date dans le fuseau de l'application.
 *
 * @param date Instant à décomposer.
 */
export function getLocalParts(date: Date): LocalParts {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    weekday: weekdays.indexOf(parts.weekday),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

const offsetFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function offsetAt(date: Date): number {
  const parts = Object.fromEntries(
    offsetFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convertit une date et une heure saisies dans le fuseau de l'application
 * (champ `datetime-local`, par exemple `2026-10-15T09:00`) en instant UTC.
 *
 * @param value Date et heure au format `YYYY-MM-DDTHH:mm`.
 * @returns L'instant correspondant, ou `null` si la valeur est invalide.
 */
export function parseLocalDateTime(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  // Deux passes suffisent pour absorber le changement d'heure.
  const first = guess - offsetAt(new Date(guess));
  const result = new Date(guess - offsetAt(new Date(first)));
  const roundTrip = getLocalParts(result);

  return roundTrip.hour === hour && roundTrip.minute === minute ? result : null;
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: APP_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dayFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: APP_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: APP_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

/** Formate un instant pour l'affichage, par exemple « jeudi 15 octobre 2026 à 09:00 ». */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

/**
 * Formate un créneau, par exemple « jeudi 15 octobre 2026 · 09:00 – 12:00 ».
 * Si le créneau dépasse un jour, les deux dates complètes sont affichées.
 */
export function formatSlot(startsAt: Date, endsAt: Date): string {
  const startDay = dayFormatter.format(startsAt);

  if (startDay === dayFormatter.format(endsAt)) {
    return `${startDay} · ${timeFormatter.format(startsAt)} – ${timeFormatter.format(endsAt)}`;
  }

  return `${formatDateTime(startsAt)} → ${formatDateTime(endsAt)}`;
}

/** Retourne la valeur `YYYY-MM-DDTHH:mm` d'un instant, pour préremplir un champ `datetime-local`. */
export function toLocalInputValue(date: Date): string {
  const parts = Object.fromEntries(
    offsetFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/**
 * Retourne le début (minuit, heure locale) du jour qui contient un instant,
 * décalé d'un nombre de jours.
 *
 * @param date Instant de référence.
 * @param offsetDays Nombre de jours à ajouter (0 pour le jour même).
 */
export function startOfLocalDay(date: Date, offsetDays = 0): Date {
  const [year, month, day] = toLocalInputValue(date).slice(0, 10).split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1, day + offsetDays));
  const iso = target.toISOString().slice(0, 10);

  return parseLocalDateTime(`${iso}T00:00`) ?? target;
}
