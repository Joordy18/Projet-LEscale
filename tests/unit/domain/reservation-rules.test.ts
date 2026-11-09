import { describe, expect, it } from 'vitest';
import {
  checkCancellation,
  checkReservationRules,
  isWithinOpeningHours,
  slotsConflict,
  type ReservationCheckInput,
} from '@/lib/domain/reservation-rules';
import { at } from '../../support/harness';

const now = at('2026-10-12T10:00');

const base: ReservationCheckInput = {
  category: 'ROOM',
  startsAt: at('2026-10-13T09:00'),
  endsAt: at('2026-10-13T12:00'),
  now,
  upcomingCount: 0,
};

const rules = (overrides: Partial<ReservationCheckInput>) =>
  checkReservationRules({ ...base, ...overrides }).map((violation) => violation.rule);

describe('checkReservationRules', () => {
  it('accepte une demande conforme', () => {
    expect(rules({})).toEqual([]);
  });

  it('R1 : refuse la quatrième réservation à venir dans une catégorie', () => {
    expect(rules({ upcomingCount: 3 })).toEqual(['R1']);
    expect(rules({ upcomingCount: 2 })).toEqual([]);
  });

  it('R2 : limite une salle à quatre heures', () => {
    expect(rules({ endsAt: at('2026-10-13T13:00') })).toEqual([]);
    expect(rules({ endsAt: at('2026-10-13T13:01') })).toEqual(['R2']);
  });

  it('R2 : limite le matériel et le véhicule à trois jours', () => {
    const start = at('2026-10-14T08:00');

    expect(rules({ category: 'VEHICLE', startsAt: start, endsAt: at('2026-10-17T08:00') })).toEqual(
      [],
    );
    expect(
      rules({ category: 'EQUIPMENT', startsAt: start, endsAt: at('2026-10-17T08:01') }),
    ).toEqual(['R2']);
  });

  it('R3 : refuse un début à plus de trente jours', () => {
    expect(rules({ startsAt: at('2026-11-11T09:00'), endsAt: at('2026-11-11T10:00') })).toEqual([]);
    expect(rules({ startsAt: at('2026-11-12T09:00'), endsAt: at('2026-11-12T10:00') })).toEqual([
      'R3',
    ]);
  });

  it('refuse un créneau dans le passé ou inversé', () => {
    expect(rules({ startsAt: at('2026-10-12T09:00'), endsAt: at('2026-10-12T11:00') })).toEqual([
      'TIME',
    ]);
    expect(rules({ startsAt: at('2026-10-13T12:00'), endsAt: at('2026-10-13T09:00') })).toEqual([
      'TIME',
    ]);
  });

  it('RC-01 : impose les horaires d’ouverture aux salles et au studio', () => {
    expect(rules({ startsAt: at('2026-10-13T07:30'), endsAt: at('2026-10-13T09:00') })).toEqual([
      'RC-01',
    ]);
    expect(
      rules({
        category: 'STUDIO',
        startsAt: at('2026-10-13T18:00'),
        endsAt: at('2026-10-13T20:30'),
      }),
    ).toEqual(['RC-01']);
    expect(rules({ startsAt: at('2026-10-18T09:00'), endsAt: at('2026-10-18T11:00') })).toEqual([
      'RC-01',
    ]);
  });

  it('RC-01 : le matériel peut être réservé hors des heures d’ouverture', () => {
    expect(
      rules({
        category: 'EQUIPMENT',
        startsAt: at('2026-10-17T18:00'),
        endsAt: at('2026-10-19T09:00'),
      }),
    ).toEqual([]);
  });
});

describe('isWithinOpeningHours', () => {
  it('accepte un créneau qui se termine à 20 h pile', () => {
    expect(isWithinOpeningHours(at('2026-10-13T16:00'), at('2026-10-13T20:00'))).toBe(true);
  });

  it('accepte le samedi et refuse le dimanche', () => {
    expect(isWithinOpeningHours(at('2026-10-17T09:00'), at('2026-10-17T10:00'))).toBe(true);
    expect(isWithinOpeningHours(at('2026-10-18T09:00'), at('2026-10-18T10:00'))).toBe(false);
  });
});

describe('slotsConflict', () => {
  const a = { startsAt: at('2026-10-13T09:00'), endsAt: at('2026-10-13T10:00') };

  it('accepte deux créneaux qui se suivent sans intervalle', () => {
    const next = { startsAt: at('2026-10-13T10:00'), endsAt: at('2026-10-13T11:00') };

    expect(slotsConflict(a, next)).toBe(false);
  });

  it('refuse un chevauchement', () => {
    const overlapping = { startsAt: at('2026-10-13T09:30'), endsAt: at('2026-10-13T11:00') };

    expect(slotsConflict(a, overlapping)).toBe(true);
  });

  it('applique un temps de battement', () => {
    const next = { startsAt: at('2026-10-13T10:10'), endsAt: at('2026-10-13T11:00') };

    expect(slotsConflict(a, next, 15 * 60 * 1000)).toBe(true);
    expect(slotsConflict(a, next, 5 * 60 * 1000)).toBe(false);
  });
});

describe('checkCancellation', () => {
  const reservation = {
    userId: 'alice',
    startsAt: at('2026-10-14T09:00'),
    endsAt: at('2026-10-14T10:00'),
    status: 'CONFIRMED' as const,
  };
  const member = { id: 'alice', role: 'MEMBER' as const };
  const manager = { id: 'manager', role: 'MANAGER' as const };

  it('R4 : l’adhérent annule jusqu’à 24 h avant le début', () => {
    expect(
      checkCancellation({ actor: member, reservation, now: at('2026-10-13T09:00') }),
    ).toBeNull();
    expect(
      checkCancellation({ actor: member, reservation, now: at('2026-10-13T09:01') })?.rule,
    ).toBe('R4');
  });

  it('R4 : un gestionnaire annule à tout moment avant la fin', () => {
    expect(
      checkCancellation({ actor: manager, reservation, now: at('2026-10-14T09:30') }),
    ).toBeNull();
    expect(
      checkCancellation({ actor: manager, reservation, now: at('2026-10-14T10:30') })?.rule,
    ).toBe('STATUS');
  });

  it('refuse d’annuler une réservation déjà traitée', () => {
    expect(
      checkCancellation({
        actor: manager,
        reservation: { ...reservation, status: 'REJECTED' },
        now,
      })?.rule,
    ).toBe('STATUS');
  });
});
