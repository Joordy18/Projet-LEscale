import { beforeEach, describe, expect, it } from 'vitest';
import { can, assertCan } from '@/lib/domain/permissions';
import { RateLimiter } from '@/lib/services/rate-limiter';
import { createHarness, at, type Harness } from '../../support/harness';
import { expectDomainError } from '../../support/expect-domain-error';

let h: Harness;

beforeEach(() => {
  h = createHarness();
});

describe('permissions', () => {
  it('distingue les quatre profils', () => {
    const { actors } = h;

    expect(can(null, 'reservation:create')).toBe(false);
    expect(can(actors.alice, 'reservation:create')).toBe(true);
    expect(can(actors.alice, 'catalogue:manage')).toBe(false);
    expect(can(actors.manager, 'catalogue:manage')).toBe(true);
    expect(can(actors.manager, 'user:manage')).toBe(false);
    expect(can(actors.admin, 'user:manage')).toBe(true);
    expect(can(actors.admin, 'activity:read')).toBe(true);
  });

  it('assertCan lève la bonne erreur', () => {
    expect(() => assertCan(null, 'activity:read')).toThrowError(/connecter/);
    expect(() => assertCan(h.actors.alice, 'activity:read')).toThrowError(/pas le droit/);
  });
});

describe('NotificationService (EF-11)', () => {
  it('compte les notifications non lues puis les marque comme lues', async () => {
    await h.services.notifications.send(
      { userId: 'alice', type: 'REQUEST_APPROVED', title: 'a', message: 'a', link: null },
      { userId: 'alice', type: 'REQUEST_REJECTED', title: 'b', message: 'b', link: null },
      { userId: 'bob', type: 'REQUEST_REJECTED', title: 'c', message: 'c', link: null },
    );

    await expect(h.services.notifications.countUnread(h.actors.alice)).resolves.toBe(2);

    const [first] = await h.services.notifications.listMine(h.actors.alice);

    await h.services.notifications.markRead(h.actors.alice, first.id);
    await expect(h.services.notifications.countUnread(h.actors.alice)).resolves.toBe(1);

    await h.services.notifications.markAllRead(h.actors.alice);
    await expect(h.services.notifications.countUnread(h.actors.alice)).resolves.toBe(0);
    await expect(h.services.notifications.countUnread(h.actors.bob)).resolves.toBe(1);
  });

  it('un adhérent ne peut pas lire la notification d’un autre (sécurité)', async () => {
    await h.services.notifications.send({
      userId: 'bob',
      type: 'REQUEST_APPROVED',
      title: 'a',
      message: 'a',
      link: null,
    });

    const [notification] = await h.services.notifications.listMine(h.actors.bob);

    await h.services.notifications.markRead(h.actors.alice, notification.id);

    await expect(h.services.notifications.countUnread(h.actors.bob)).resolves.toBe(1);
  });

  it('exige une connexion et ignore les pannes de stockage', async () => {
    await expectDomainError(h.services.notifications.listMine(null), 'UNAUTHENTICATED');
    await expect(h.services.notifications.countUnread(null)).resolves.toBe(0);
  });
});

describe('ActivityService (EF-12)', () => {
  it('réserve la consultation du journal aux gestionnaires', async () => {
    await h.services.activity.record({
      authorId: 'manager',
      action: 'RESOURCE_CREATED',
      targetType: 'Resource',
      targetId: 'room',
      metadata: {},
    });

    await expectDomainError(h.services.activity.list(h.actors.alice), 'FORBIDDEN');

    const page = await h.services.activity.list(h.actors.manager);

    expect(page.total).toBe(1);
    expect(page.entries[0]).toMatchObject({ authorId: 'manager', action: 'RESOURCE_CREATED' });
  });

  it('ne fait pas échouer l’action métier si le journal est indisponible', async () => {
    h.activityRepository.append = async () => {
      throw new Error('MongoDB indisponible');
    };

    await expect(
      h.services.reservations.reserve(h.actors.alice, {
        resourceId: 'room',
        startsAt: at('2026-10-14T09:00'),
        endsAt: at('2026-10-14T11:00'),
      }),
    ).resolves.toBeDefined();
  });
});

describe('DashboardService (EF-13)', () => {
  it('présente demandes en attente, réservations du jour et ressources les plus utilisées', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'studio',
      startsAt: at('2026-10-14T09:00'),
      endsAt: at('2026-10-14T11:00'),
    });
    await h.services.reservations.reserve(h.actors.bob, {
      resourceId: 'room',
      startsAt: at('2026-10-12T15:00'),
      endsAt: at('2026-10-12T17:00'),
    });
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      startsAt: at('2026-10-13T15:00'),
      endsAt: at('2026-10-13T17:00'),
    });

    const overview = await h.services.dashboard.getOverview(h.actors.manager);

    expect(overview.pendingRequests).toHaveLength(1);
    expect(overview.todayReservations).toHaveLength(1);
    expect(overview.topResources[0]).toMatchObject({ resourceId: 'room', count: 2 });
  });

  it('est réservé aux gestionnaires', async () => {
    await expectDomainError(h.services.dashboard.getOverview(h.actors.alice), 'FORBIDDEN');
  });
});

describe('RateLimiter', () => {
  it('bloque après le nombre de tentatives autorisé, puis débloque après la fenêtre', () => {
    let now = new Date('2026-10-12T10:00:00Z');
    const limiter = new RateLimiter(3, 60_000, () => now);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(limiter.check('a')).toEqual({ allowed: true });
      limiter.recordFailure('a');
    }

    expect(limiter.check('a')).toEqual({ allowed: false, retryAfterSeconds: 60 });
    expect(limiter.check('b')).toEqual({ allowed: true });

    now = new Date('2026-10-12T10:01:01Z');
    expect(limiter.check('a')).toEqual({ allowed: true });
  });

  it('réinitialise après une connexion réussie', () => {
    const limiter = new RateLimiter(1, 60_000, () => new Date('2026-10-12T10:00:00Z'));

    limiter.recordFailure('a');
    limiter.reset('a');

    expect(limiter.check('a')).toEqual({ allowed: true });
  });
});
