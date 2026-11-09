import { describe, expect, it } from 'vitest';
import {
  formatSlot,
  getLocalParts,
  parseLocalDateTime,
  startOfLocalDay,
  toLocalInputValue,
} from '@/lib/domain/time';

describe('parseLocalDateTime', () => {
  it('convertit une heure d’été de Paris en UTC', () => {
    expect(parseLocalDateTime('2026-10-12T10:00')?.toISOString()).toBe('2026-10-12T08:00:00.000Z');
  });

  it('convertit une heure d’hiver de Paris en UTC', () => {
    expect(parseLocalDateTime('2026-12-01T10:00')?.toISOString()).toBe('2026-12-01T09:00:00.000Z');
  });

  it('refuse un format invalide', () => {
    expect(parseLocalDateTime('12/10/2026 10:00')).toBeNull();
  });

  it('refuse une heure qui n’existe pas lors du passage à l’heure d’été', () => {
    expect(parseLocalDateTime('2026-03-29T02:30')).toBeNull();
  });
});

describe('getLocalParts', () => {
  it('donne le jour et l’heure dans le fuseau de Paris', () => {
    expect(getLocalParts(new Date('2026-10-12T08:30:00Z'))).toEqual({
      weekday: 1,
      hour: 10,
      minute: 30,
    });
  });
});

describe('toLocalInputValue', () => {
  it('est l’inverse de parseLocalDateTime', () => {
    const value = '2026-11-03T14:15';

    expect(toLocalInputValue(parseLocalDateTime(value)!)).toBe(value);
  });
});

describe('startOfLocalDay', () => {
  it('retourne minuit heure de Paris', () => {
    expect(startOfLocalDay(new Date('2026-10-12T08:30:00Z')).toISOString()).toBe(
      '2026-10-11T22:00:00.000Z',
    );
  });

  it('gère le décalage en jours', () => {
    expect(startOfLocalDay(new Date('2026-10-12T08:30:00Z'), 1).toISOString()).toBe(
      '2026-10-12T22:00:00.000Z',
    );
  });
});

describe('formatSlot', () => {
  it('regroupe un créneau d’une même journée', () => {
    const text = formatSlot(new Date('2026-10-13T07:00:00Z'), new Date('2026-10-13T10:00:00Z'));

    expect(text).toContain('mardi 13 octobre 2026');
    expect(text).toContain('09:00');
    expect(text).toContain('12:00');
  });
});
