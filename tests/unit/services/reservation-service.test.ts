import { beforeEach, describe, expect, it } from 'vitest';
import { createHarness, at, type Harness } from '../../support/harness';
import { expectDomainError } from '../../support/expect-domain-error';

let h: Harness;

beforeEach(() => {
  h = createHarness();
});

const slot = (day: string, from = '09:00', to = '11:00') => ({
  startsAt: at(`${day}T${from}`),
  endsAt: at(`${day}T${to}`),
});

describe('ReservationService.reserve', () => {
  it('confirme immédiatement une salle (EF-06)', async () => {
    const reservation = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14'),
    });

    expect(reservation.status).toBe('CONFIRMED');
    expect(reservation.userId).toBe('alice');
  });

  it('B05 : le studio et le véhicule deviennent des demandes en attente', async () => {
    const studio = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'studio',
      ...slot('2026-10-14'),
    });
    const vehicle = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'vehicle',
      startsAt: at('2026-10-14T08:00'),
      endsAt: at('2026-10-15T08:00'),
    });

    expect(studio.status).toBe('PENDING');
    expect(vehicle.status).toBe('PENDING');
  });

  it('prévient les gestionnaires d’une nouvelle demande (B07)', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'studio',
      ...slot('2026-10-14'),
    });

    const recipients = h.repositories.notificationRepository.items
      .filter((notification) => notification.type === 'REQUEST_CREATED')
      .map((notification) => notification.userId);

    expect(recipients.sort()).toEqual(['admin', 'manager']);
  });

  it('refuse un visiteur', async () => {
    await expectDomainError(
      h.services.reservations.reserve(null, { resourceId: 'room', ...slot('2026-10-14') }),
      'UNAUTHENTICATED',
    );
  });

  it('refuse une ressource archivée ou inconnue', async () => {
    await h.services.resources.setActive(h.actors.manager, 'room2', false);

    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room2',
        ...slot('2026-10-14'),
      }),
      'NOT_FOUND',
    );
    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'nope',
        ...slot('2026-10-14'),
      }),
      'NOT_FOUND',
    );
  });

  it('R1 : refuse la quatrième réservation à venir d’une catégorie', async () => {
    for (const day of ['2026-10-14', '2026-10-15', '2026-10-16']) {
      await h.services.reservations.reserve(h.actors.alice, { resourceId: 'room', ...slot(day) });
    }

    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room2',
        ...slot('2026-10-17'),
      }),
      'RULE_VIOLATION',
      /3 réservations/,
    );
  });

  it('R1 : les demandes en attente comptent dans le quota', async () => {
    for (const day of ['2026-10-14', '2026-10-15', '2026-10-16']) {
      await h.services.reservations.reserve(h.actors.alice, { resourceId: 'studio', ...slot(day) });
    }

    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'studio',
        ...slot('2026-10-17'),
      }),
      'RULE_VIOLATION',
    );
  });

  it('R1 : le quota est propre à chaque catégorie et à chaque adhérent', async () => {
    for (const day of ['2026-10-14', '2026-10-15', '2026-10-16']) {
      await h.services.reservations.reserve(h.actors.alice, { resourceId: 'room', ...slot(day) });
    }

    await expect(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'equipment',
        ...slot('2026-10-14'),
      }),
    ).resolves.toBeDefined();
    await expect(
      h.services.reservations.reserve(h.actors.bob, { resourceId: 'room2', ...slot('2026-10-17') }),
    ).resolves.toBeDefined();
  });

  it('R1 : une réservation annulée ne compte plus dans le quota', async () => {
    const created = [];

    for (const day of ['2026-10-14', '2026-10-15', '2026-10-16']) {
      created.push(
        await h.services.reservations.reserve(h.actors.alice, { resourceId: 'room', ...slot(day) }),
      );
    }

    await h.services.reservations.cancel(h.actors.alice, created[0].id);

    await expect(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        ...slot('2026-10-17'),
      }),
    ).resolves.toBeDefined();
  });

  it('R2 : refuse une salle réservée plus de quatre heures', async () => {
    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        ...slot('2026-10-14', '09:00', '14:00'),
      }),
      'RULE_VIOLATION',
      /4 heures/,
    );
  });

  it('R2 : accepte trois jours de matériel mais pas davantage', async () => {
    await expect(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'equipment',
        startsAt: at('2026-10-14T09:00'),
        endsAt: at('2026-10-17T09:00'),
      }),
    ).resolves.toBeDefined();
    await expectDomainError(
      h.services.reservations.reserve(h.actors.bob, {
        resourceId: 'equipment2',
        startsAt: at('2026-10-14T09:00'),
        endsAt: at('2026-10-17T09:30'),
      }),
      'RULE_VIOLATION',
      /3 jours/,
    );
  });

  it('R3 : refuse une réservation à plus de trente jours', async () => {
    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        ...slot('2026-11-20'),
      }),
      'RULE_VIOLATION',
      /30 jours/,
    );
  });

  it('RC-01 : refuse une salle le dimanche', async () => {
    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        ...slot('2026-10-18'),
      }),
      'RULE_VIOLATION',
      /8 h et 20 h/,
    );
  });

  it('refuse un créneau qui chevauche une réservation existante (B04)', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14', '09:00', '11:00'),
    });

    await expectDomainError(
      h.services.reservations.reserve(h.actors.bob, {
        resourceId: 'room',
        ...slot('2026-10-14', '10:00', '12:00'),
      }),
      'CONFLICT',
    );
  });

  it('accepte deux créneaux qui se suivent', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14', '09:00', '11:00'),
    });

    await expect(
      h.services.reservations.reserve(h.actors.bob, {
        resourceId: 'room',
        ...slot('2026-10-14', '11:00', '12:00'),
      }),
    ).resolves.toBeDefined();
  });

  it('B04 : deux demandes simultanées sur le même créneau, une seule aboutit', async () => {
    const results = await Promise.allSettled([
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        ...slot('2026-10-14'),
      }),
      h.services.reservations.reserve(h.actors.bob, { resourceId: 'room', ...slot('2026-10-14') }),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
  });

  it('un créneau refusé ou annulé libère la ressource', async () => {
    const first = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14'),
    });

    await h.services.reservations.cancel(h.actors.alice, first.id);

    await expect(
      h.services.reservations.reserve(h.actors.bob, { resourceId: 'room', ...slot('2026-10-14') }),
    ).resolves.toBeDefined();
  });

  it('R5 : refuse une ressource en maintenance sur le créneau', async () => {
    await h.services.maintenances.schedule(h.actors.manager, {
      resourceId: 'room',
      startsAt: at('2026-10-14T00:00'),
      endsAt: at('2026-10-15T00:00'),
      reason: 'Peinture',
    });

    await expectDomainError(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        ...slot('2026-10-14'),
      }),
      'RULE_VIOLATION',
      /maintenance/,
    );
  });

  it('enregistre la création dans le journal d’activité (B08)', async () => {
    const reservation = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14'),
    });

    expect(h.activityRepository.items).toContainEqual(
      expect.objectContaining({
        authorId: 'alice',
        action: 'RESERVATION_CREATED',
        targetId: reservation.id,
      }),
    );
  });
});

describe('ReservationService.cancel', () => {
  async function reserveAt(day: string, from = '09:00', to = '10:00') {
    return h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot(day, from, to),
    });
  }

  it('R4 : l’adhérent annule jusqu’à 24 h avant le début (EF-07)', async () => {
    const reservation = await reserveAt('2026-10-14');

    h.clock.now = at('2026-10-13T09:00');

    await expect(
      h.services.reservations.cancel(h.actors.alice, reservation.id),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
  });

  it('R4 : l’adhérent ne peut plus annuler à moins de 24 h du début', async () => {
    const reservation = await reserveAt('2026-10-14');

    h.clock.now = at('2026-10-13T09:30');

    await expectDomainError(
      h.services.reservations.cancel(h.actors.alice, reservation.id),
      'RULE_VIOLATION',
      /24 heures/,
    );
  });

  it('R4 : un gestionnaire annule à moins de 24 h et prévient l’adhérent', async () => {
    const reservation = await reserveAt('2026-10-14');

    h.clock.now = at('2026-10-13T20:00');
    await h.services.reservations.cancel(h.actors.manager, reservation.id);

    expect(h.repositories.notificationRepository.items).toContainEqual(
      expect.objectContaining({ userId: 'alice', type: 'RESERVATION_CANCELLED' }),
    );
  });

  it('un adhérent ne peut pas annuler la réservation d’un autre (sécurité)', async () => {
    const reservation = await reserveAt('2026-10-14');

    await expectDomainError(
      h.services.reservations.cancel(h.actors.bob, reservation.id),
      'NOT_FOUND',
    );
    expect(h.repositories.reservations.items[0].status).toBe('CONFIRMED');
  });

  it('refuse d’annuler deux fois', async () => {
    const reservation = await reserveAt('2026-10-14');

    await h.services.reservations.cancel(h.actors.alice, reservation.id);

    await expectDomainError(
      h.services.reservations.cancel(h.actors.alice, reservation.id),
      'RULE_VIOLATION',
    );
  });
});

describe('ReservationService.decide', () => {
  async function requestStudio() {
    return h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'studio',
      ...slot('2026-10-14'),
    });
  }

  it('EF-08 : un gestionnaire valide une demande et l’adhérent est prévenu', async () => {
    const request = await requestStudio();

    const decided = await h.services.reservations.decide(h.actors.manager, request.id, {
      approve: true,
    });

    expect(decided.status).toBe('CONFIRMED');
    expect(h.repositories.notificationRepository.items).toContainEqual(
      expect.objectContaining({ userId: 'alice', type: 'REQUEST_APPROVED' }),
    );
  });

  it('R6 : un refus exige un motif visible par l’adhérent', async () => {
    const request = await requestStudio();

    await expectDomainError(
      h.services.reservations.decide(h.actors.manager, request.id, {
        approve: false,
        reason: '  ',
      }),
      'VALIDATION',
      /motif/,
    );

    const decided = await h.services.reservations.decide(h.actors.manager, request.id, {
      approve: false,
      reason: 'Studio indisponible ce jour-là',
    });

    expect(decided).toMatchObject({
      status: 'REJECTED',
      decisionReason: 'Studio indisponible ce jour-là',
    });
    expect(h.repositories.notificationRepository.items).toContainEqual(
      expect.objectContaining({
        userId: 'alice',
        type: 'REQUEST_REJECTED',
        message: expect.stringContaining('Studio indisponible ce jour-là'),
      }),
    );
  });

  it('un refus libère le créneau', async () => {
    const request = await requestStudio();

    await h.services.reservations.decide(h.actors.manager, request.id, {
      approve: false,
      reason: 'Indisponible',
    });

    await expect(
      h.services.reservations.reserve(h.actors.bob, {
        resourceId: 'studio',
        ...slot('2026-10-14'),
      }),
    ).resolves.toBeDefined();
  });

  it('un adhérent ne peut pas décider (sécurité)', async () => {
    const request = await requestStudio();

    await expectDomainError(
      h.services.reservations.decide(h.actors.alice, request.id, { approve: true }),
      'FORBIDDEN',
    );
    await expectDomainError(
      h.services.reservations.decide(null, request.id, { approve: true }),
      'UNAUTHENTICATED',
    );
  });

  it('refuse de traiter deux fois la même demande', async () => {
    const request = await requestStudio();

    await h.services.reservations.decide(h.actors.manager, request.id, { approve: true });

    await expectDomainError(
      h.services.reservations.decide(h.actors.manager, request.id, { approve: true }),
      'CONFLICT',
    );
  });

  it('R8 : une demande dont le créneau a commencé expire au lieu d’être traitée', async () => {
    const request = await requestStudio();

    h.clock.now = at('2026-10-14T09:30');

    await expectDomainError(
      h.services.reservations.decide(h.actors.manager, request.id, { approve: true }),
      'CONFLICT',
      /expiré/,
    );
    expect(h.repositories.reservations.items[0].status).toBe('EXPIRED');
  });
});

describe('ReservationService.expireStale (R8)', () => {
  it('annule les demandes non traitées au début du créneau et prévient l’adhérent', async () => {
    const pending = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'studio',
      ...slot('2026-10-14'),
    });
    const approved = await h.services.reservations.reserve(h.actors.bob, {
      resourceId: 'studio',
      ...slot('2026-10-14', '14:00', '16:00'),
    });

    await h.services.reservations.decide(h.actors.manager, approved.id, { approve: true });
    h.clock.now = at('2026-10-14T09:00');

    await expect(h.services.reservations.expireStale()).resolves.toBe(1);
    expect(h.repositories.reservations.items.find((item) => item.id === pending.id)?.status).toBe(
      'EXPIRED',
    );
    expect(h.repositories.reservations.items.find((item) => item.id === approved.id)?.status).toBe(
      'CONFIRMED',
    );
    expect(h.repositories.notificationRepository.items).toContainEqual(
      expect.objectContaining({ userId: 'alice', type: 'RESERVATION_EXPIRED' }),
    );
  });

  it('ne fait rien avant le début du créneau', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'studio',
      ...slot('2026-10-14'),
    });

    h.clock.now = at('2026-10-14T08:59');

    await expect(h.services.reservations.expireStale()).resolves.toBe(0);
  });
});

describe('ReservationService : consultation', () => {
  it('liste uniquement les réservations de la personne connectée (EF-07)', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14'),
    });
    await h.services.reservations.reserve(h.actors.bob, {
      resourceId: 'room2',
      ...slot('2026-10-14'),
    });

    const mine = await h.services.reservations.listMine(h.actors.alice);

    expect(mine).toHaveLength(1);
    expect(mine[0].userId).toBe('alice');
  });

  it('présente la réservation d’autrui comme introuvable à un adhérent, pas à un gestionnaire', async () => {
    const reservation = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14'),
    });

    await expectDomainError(
      h.services.reservations.getVisible(h.actors.bob, reservation.id),
      'NOT_FOUND',
    );
    await expect(
      h.services.reservations.getVisible(h.actors.manager, reservation.id),
    ).resolves.toMatchObject({ id: reservation.id });
  });

  it('réserve la liste des demandes en attente aux gestionnaires', async () => {
    await expectDomainError(h.services.reservations.listPending(h.actors.alice), 'FORBIDDEN');
    await expect(h.services.reservations.listPending(h.actors.manager)).resolves.toEqual([]);
  });

  it('liste les créneaux occupés sans donnée personnelle', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      ...slot('2026-10-14'),
    });

    const slots = await h.services.reservations.listOccupiedSlots(
      'room',
      at('2026-10-14T00:00'),
      at('2026-10-15T00:00'),
    );

    expect(slots).toEqual([
      { startsAt: at('2026-10-14T09:00'), endsAt: at('2026-10-14T11:00'), kind: 'reservation' },
    ]);
  });
});
