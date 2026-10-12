import { beforeEach, describe, expect, it } from 'vitest';
import { createHarness, at, type Harness } from '../../support/harness';
import { expectDomainError } from '../../support/expect-domain-error';

let h: Harness;

beforeEach(() => {
  h = createHarness();
});

const period = {
  resourceId: 'room',
  startsAt: at('2026-10-14T00:00'),
  endsAt: at('2026-10-16T00:00'),
  reason: 'Remplacement du vidéoprojecteur',
};

describe('MaintenanceService.schedule', () => {
  it('EF-10 : un gestionnaire déclare une maintenance', async () => {
    const outcome = await h.services.maintenances.schedule(h.actors.manager, period);

    expect(outcome.period).toMatchObject({ resourceId: 'room', createdById: 'manager' });
    expect(outcome.cancelledReservations).toBe(0);
  });

  it('refuse une maintenance qui commence dans plus d’un an ou dure plus d’un an', async () => {
    await expectDomainError(
      h.services.maintenances.schedule(h.actors.manager, {
        ...period,
        startsAt: at('2028-01-01T00:00'),
        endsAt: at('2028-01-02T00:00'),
      }),
      'VALIDATION',
      /dans l’année/,
    );
    await expectDomainError(
      h.services.maintenances.schedule(h.actors.manager, {
        ...period,
        endsAt: at('2027-12-31T00:00'),
      }),
      'VALIDATION',
      /dans l’année/,
    );
  });

  it('un adhérent ne peut pas déclarer de maintenance (sécurité)', async () => {
    await expectDomainError(h.services.maintenances.schedule(h.actors.alice, period), 'FORBIDDEN');
  });

  it('R5 / RC-06 : annule les réservations concernées et prévient les adhérents', async () => {
    const reservation = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      startsAt: at('2026-10-15T09:00'),
      endsAt: at('2026-10-15T11:00'),
    });
    const outside = await h.services.reservations.reserve(h.actors.bob, {
      resourceId: 'room',
      startsAt: at('2026-10-20T09:00'),
      endsAt: at('2026-10-20T11:00'),
    });

    const outcome = await h.services.maintenances.schedule(h.actors.manager, period);
    const items = h.repositories.reservations.items;

    expect(outcome.cancelledReservations).toBe(1);
    expect(items.find((item) => item.id === reservation.id)?.status).toBe('CANCELLED');
    expect(items.find((item) => item.id === outside.id)?.status).toBe('CONFIRMED');
    expect(h.repositories.notificationRepository.items).toContainEqual(
      expect.objectContaining({
        userId: 'alice',
        type: 'RESERVATION_CANCELLED_BY_MAINTENANCE',
        message: expect.stringContaining('Remplacement du vidéoprojecteur'),
      }),
    );
  });

  it('refuse une période inversée, passée ou sans motif', async () => {
    await expectDomainError(
      h.services.maintenances.schedule(h.actors.manager, {
        ...period,
        startsAt: period.endsAt,
        endsAt: period.startsAt,
      }),
      'VALIDATION',
    );
    await expectDomainError(
      h.services.maintenances.schedule(h.actors.manager, {
        ...period,
        startsAt: at('2026-10-01T00:00'),
        endsAt: at('2026-10-02T00:00'),
      }),
      'VALIDATION',
    );
    await expectDomainError(
      h.services.maintenances.schedule(h.actors.manager, { ...period, reason: ' ' }),
      'VALIDATION',
    );
  });

  it('refuse une maintenance qui chevauche une autre', async () => {
    await h.services.maintenances.schedule(h.actors.manager, period);

    await expectDomainError(
      h.services.maintenances.schedule(h.actors.manager, {
        ...period,
        startsAt: at('2026-10-15T00:00'),
        endsAt: at('2026-10-18T00:00'),
      }),
      'CONFLICT',
    );
  });

  it('refuse une ressource inconnue', async () => {
    await expectDomainError(
      h.services.maintenances.schedule(h.actors.manager, { ...period, resourceId: 'nope' }),
      'NOT_FOUND',
    );
  });
});

describe('MaintenanceService.cancel (RC-07)', () => {
  it('annule une maintenance et rouvre la ressource à la réservation', async () => {
    const { period: created } = await h.services.maintenances.schedule(h.actors.manager, period);

    await h.services.maintenances.cancel(h.actors.manager, created.id);

    await expect(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        startsAt: at('2026-10-15T09:00'),
        endsAt: at('2026-10-15T11:00'),
      }),
    ).resolves.toBeDefined();
  });

  it('refuse une maintenance inconnue ou un adhérent', async () => {
    await expectDomainError(h.services.maintenances.cancel(h.actors.manager, 'nope'), 'NOT_FOUND');
    await expectDomainError(h.services.maintenances.cancel(h.actors.alice, 'nope'), 'FORBIDDEN');
  });
});
