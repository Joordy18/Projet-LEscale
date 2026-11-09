import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DomainError } from '@/lib/domain/errors';
import { PostgresMaintenanceRepository } from '@/lib/repositories/postgres/postgres-maintenance-repository';
import { PostgresReservationRepository } from '@/lib/repositories/postgres/postgres-reservation-repository';
import { PostgresResourceRepository } from '@/lib/repositories/postgres/postgres-resource-repository';
import { PostgresUserRepository } from '@/lib/repositories/postgres/postgres-user-repository';
import type { PrismaClient } from '@/lib/repositories/postgres/generated/client';
import { at, createTestPrisma, resetDatabase, seedBasics } from './support';

let prisma: PrismaClient;
let reservations: PostgresReservationRepository;
let resources: PostgresResourceRepository;
let users: PostgresUserRepository;
let maintenances: PostgresMaintenanceRepository;
let data: Awaited<ReturnType<typeof seedBasics>>;

const now = at('2026-10-12T10:00');
const quota = (category: 'ROOM' | 'STUDIO' | 'VEHICLE' | 'EQUIPMENT') => ({
  category,
  limit: 3,
  now,
});

beforeAll(() => {
  prisma = createTestPrisma();
  reservations = new PostgresReservationRepository(prisma);
  resources = new PostgresResourceRepository(prisma);
  users = new PostgresUserRepository(prisma);
  maintenances = new PostgresMaintenanceRepository(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
  data = await seedBasics(prisma);
});

const room = (userId: string, from: string, to: string, resourceId = data.room.id) => ({
  resourceId,
  userId,
  startsAt: at(`2026-10-14T${from}`),
  endsAt: at(`2026-10-14T${to}`),
  status: 'CONFIRMED' as const,
});

describe('PostgresReservationRepository : chevauchements (B04, ADR 004)', () => {
  it('refuse deux créneaux qui se chevauchent avec une erreur métier', async () => {
    await reservations.createWithQuota(room(data.alice.id, '09:00', '11:00'), quota('ROOM'));

    await expect(
      reservations.createWithQuota(room(data.bob.id, '10:00', '12:00'), quota('ROOM')),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('accepte deux créneaux qui se suivent', async () => {
    await reservations.createWithQuota(room(data.alice.id, '09:00', '11:00'), quota('ROOM'));

    await expect(
      reservations.createWithQuota(room(data.bob.id, '11:00', '12:00'), quota('ROOM')),
    ).resolves.toBeDefined();
  });

  it('accepte le même créneau sur une autre ressource', async () => {
    await reservations.createWithQuota(room(data.alice.id, '09:00', '11:00'), quota('ROOM'));

    await expect(
      reservations.createWithQuota(
        room(data.bob.id, '09:00', '11:00', data.room2.id),
        quota('ROOM'),
      ),
    ).resolves.toBeDefined();
  });

  it('une seule de deux demandes simultanées sur le même créneau aboutit', async () => {
    const results = await Promise.allSettled([
      reservations.createWithQuota(room(data.alice.id, '09:00', '11:00'), quota('ROOM')),
      reservations.createWithQuota(room(data.bob.id, '09:00', '11:00'), quota('ROOM')),
    ]);

    const rejected = results.filter((result) => result.status === 'rejected');

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(DomainError);
    expect(await prisma.reservation.count()).toBe(1);
  });

  it('dix demandes simultanées sur le même créneau : une seule aboutit', async () => {
    const attempts = Array.from({ length: 10 }, (_, index) =>
      reservations.createWithQuota(
        room(index % 2 === 0 ? data.alice.id : data.bob.id, '09:00', '11:00'),
        quota('ROOM'),
      ),
    );
    const results = await Promise.allSettled(attempts);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  });

  it('un créneau annulé, refusé ou expiré libère la ressource', async () => {
    const first = await reservations.createWithQuota(
      room(data.alice.id, '09:00', '11:00'),
      quota('ROOM'),
    );

    await reservations.updateStatus(first.id, { status: 'CANCELLED', decidedAt: now });

    await expect(
      reservations.createWithQuota(room(data.bob.id, '09:00', '11:00'), quota('ROOM')),
    ).resolves.toBeDefined();
  });
});

describe('PostgresReservationRepository : quota (R1)', () => {
  it('refuse la quatrième réservation à venir', async () => {
    for (const [from, to] of [
      ['08:00', '09:00'],
      ['09:00', '10:00'],
      ['10:00', '11:00'],
    ]) {
      await reservations.createWithQuota(room(data.alice.id, from, to), quota('ROOM'));
    }

    await expect(
      reservations.createWithQuota(room(data.alice.id, '11:00', '12:00'), quota('ROOM')),
    ).rejects.toMatchObject({ code: 'RULE_VIOLATION' });
  });

  it('le quota tient face à six demandes simultanées du même adhérent', async () => {
    const slots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];
    const results = await Promise.allSettled(
      slots.map((from, index) =>
        reservations.createWithQuota(
          room(data.alice.id, from, `${String(8 + index + 1).padStart(2, '0')}:00`),
          quota('ROOM'),
        ),
      ),
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    expect(await prisma.reservation.count({ where: { userId: data.alice.id } })).toBe(3);
  });

  it('compte les demandes en attente et ignore les autres catégories', async () => {
    await reservations.createWithQuota(
      { ...room(data.alice.id, '09:00', '10:00', data.studio.id), status: 'PENDING' },
      quota('STUDIO'),
    );
    await reservations.createWithQuota(
      room(data.alice.id, '09:00', '10:00', data.equipment.id),
      quota('EQUIPMENT'),
    );

    await expect(reservations.countUpcomingByUser(data.alice.id, 'STUDIO', now)).resolves.toBe(1);
    await expect(reservations.countUpcomingByUser(data.alice.id, 'ROOM', now)).resolves.toBe(0);
  });
});

describe('PostgresReservationRepository : contraintes de la base', () => {
  it('refuse un créneau dont la fin précède le début', async () => {
    await expect(
      prisma.reservation.create({
        data: {
          resourceId: data.room.id,
          userId: data.alice.id,
          startsAt: at('2026-10-14T11:00'),
          endsAt: at('2026-10-14T09:00'),
          status: 'CONFIRMED',
        },
      }),
    ).rejects.toThrow();
  });

  it('R6 : refuse un refus sans motif', async () => {
    const reservation = await reservations.createWithQuota(
      { ...room(data.alice.id, '09:00', '10:00', data.studio.id), status: 'PENDING' },
      quota('STUDIO'),
    );

    await expect(
      reservations.updateStatus(reservation.id, { status: 'REJECTED', decidedAt: now }),
    ).rejects.toThrow();
    await expect(
      reservations.updateStatus(reservation.id, {
        status: 'REJECTED',
        decisionReason: 'Indisponible',
        decidedAt: now,
      }),
    ).resolves.toMatchObject({ status: 'REJECTED', decisionReason: 'Indisponible' });
  });
});

describe('PostgresReservationRepository : lectures', () => {
  it('retourne la réservation avec sa ressource et son demandeur', async () => {
    const created = await reservations.createWithQuota(
      room(data.alice.id, '09:00', '11:00'),
      quota('ROOM'),
    );
    const found = await reservations.findById(created.id);

    expect(found).toMatchObject({
      id: created.id,
      resource: { slug: 'room', category: 'ROOM' },
      requester: { email: 'alice@test.fr' },
    });
    expect(JSON.stringify(found)).not.toContain('passwordHash');
  });

  it('liste les demandes en attente et celles qui doivent expirer (R8)', async () => {
    await reservations.createWithQuota(
      { ...room(data.alice.id, '09:00', '10:00', data.studio.id), status: 'PENDING' },
      quota('STUDIO'),
    );

    await expect(reservations.findPending()).resolves.toHaveLength(1);
    await expect(reservations.findPendingStartedBefore(at('2026-10-14T08:00'))).resolves.toEqual(
      [],
    );
    await expect(
      reservations.findPendingStartedBefore(at('2026-10-14T09:30')),
    ).resolves.toHaveLength(1);
  });

  it('trouve les ressources occupées sur une période', async () => {
    await reservations.createWithQuota(room(data.alice.id, '09:00', '11:00'), quota('ROOM'));

    await expect(
      reservations.findBusyResourceIds(at('2026-10-14T10:00'), at('2026-10-14T12:00')),
    ).resolves.toEqual([data.room.id]);
    await expect(
      reservations.findBusyResourceIds(at('2026-10-14T11:00'), at('2026-10-14T12:00')),
    ).resolves.toEqual([]);
  });

  it('classe les ressources les plus utilisées', async () => {
    await reservations.createWithQuota(room(data.alice.id, '09:00', '10:00'), quota('ROOM'));
    await reservations.createWithQuota(room(data.bob.id, '10:00', '11:00'), quota('ROOM'));
    await reservations.createWithQuota(
      room(data.bob.id, '09:00', '10:00', data.room2.id),
      quota('ROOM'),
    );

    const top = await reservations.topResources(at('2026-10-01T00:00'), 5);

    expect(top[0]).toMatchObject({ resourceId: data.room.id, count: 2 });
    expect(top[1]).toMatchObject({ resourceId: data.room2.id, count: 1 });
  });
});

describe('PostgresUserRepository : suppression de compte (RGPD)', () => {
  it('conserve les réservations passées, anonymisées', async () => {
    const reservation = await reservations.createWithQuota(
      room(data.alice.id, '09:00', '11:00'),
      quota('ROOM'),
    );

    await users.delete(data.alice.id);

    const kept = await reservations.findById(reservation.id);

    expect(kept).toMatchObject({ id: reservation.id, userId: null, requester: null });
    await expect(users.findById(data.alice.id)).resolves.toBeNull();
  });

  it('retrouve un compte par e-mail avec son empreinte, sans l’exposer ailleurs', async () => {
    const credentials = await users.findCredentialsByEmail('alice@test.fr');
    const publicUser = await users.findById(data.alice.id);

    expect(credentials?.passwordHash).toBe('hash');
    expect(publicUser).not.toHaveProperty('passwordHash');
    await expect(users.countActiveAdmins()).resolves.toBe(0);
  });

  it('refuse deux comptes avec la même adresse e-mail', async () => {
    await expect(
      users.create({
        firstName: 'Autre',
        lastName: 'Test',
        email: 'alice@test.fr',
        passwordHash: 'x',
        role: 'MEMBER',
      }),
    ).rejects.toThrow();
  });
});

describe('PostgresResourceRepository', () => {
  it('filtre par catégorie, mot-clé sans tenir compte de la casse, capacité et état', async () => {
    await resources.setActive(data.room2.id, false);

    const keyword = await resources.findAll({ query: 'RESSOURCE STUDIO' });
    const category = await resources.findAll({ category: 'ROOM', isActive: true });
    const capacity = await resources.findAll({ minCapacity: 4 });

    expect(keyword.map((resource) => resource.slug)).toEqual(['studio']);
    expect(category.map((resource) => resource.slug)).toEqual(['room']);
    expect(capacity.length).toBe(3);
  });

  it('crée, modifie et vérifie l’unicité du slug', async () => {
    const created = await resources.create('nouvelle-salle', {
      name: 'Nouvelle salle',
      description: 'Description',
      category: 'ROOM',
      usageConditions: 'Conditions',
      photoUrl: null,
      capacity: 6,
      inventoryCode: null,
    });

    await expect(resources.slugExists('nouvelle-salle')).resolves.toBe(true);
    await expect(resources.slugExists('autre')).resolves.toBe(false);
    await expect(
      resources.update(created.id, { ...created, name: 'Salle renommée' }),
    ).resolves.toMatchObject({ name: 'Salle renommée', slug: 'nouvelle-salle' });
  });
});

describe('PostgresMaintenanceRepository (R5)', () => {
  it('trouve les maintenances qui chevauchent un créneau', async () => {
    await maintenances.create({
      resourceId: data.room.id,
      startsAt: at('2026-10-14T00:00'),
      endsAt: at('2026-10-15T00:00'),
      reason: 'Peinture',
      createdById: data.manager.id,
    });

    await expect(
      maintenances.findOverlapping(data.room.id, at('2026-10-14T09:00'), at('2026-10-14T11:00')),
    ).resolves.toHaveLength(1);
    await expect(
      maintenances.findOverlapping(data.room.id, at('2026-10-15T00:00'), at('2026-10-15T02:00')),
    ).resolves.toEqual([]);
    await expect(
      maintenances.findBusyResourceIds(at('2026-10-14T09:00'), at('2026-10-14T11:00')),
    ).resolves.toEqual([data.room.id]);
  });

  it('refuse une maintenance dont la fin précède le début', async () => {
    await expect(
      maintenances.create({
        resourceId: data.room.id,
        startsAt: at('2026-10-15T00:00'),
        endsAt: at('2026-10-14T00:00'),
        reason: 'Erreur',
        createdById: data.manager.id,
      }),
    ).rejects.toThrow();
  });
});
