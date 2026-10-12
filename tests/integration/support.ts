import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/lib/repositories/postgres/generated/client';
import { at } from '../support/harness';
import { TEST_DATABASE_URL } from './global-setup';

/** Client Prisma relié à la base de test. */
export function createTestPrisma(): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) });
}

/** Vide toutes les tables entre deux tests. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE reservations, maintenance_periods, resources, users RESTART IDENTITY CASCADE',
  );
}

export { at };

/** Crée un adhérent et une ressource de chaque catégorie. */
export async function seedBasics(prisma: PrismaClient) {
  const [alice, bob, manager] = await Promise.all(
    [
      { firstName: 'Alice', email: 'alice@test.fr', role: 'MEMBER' as const },
      { firstName: 'Bob', email: 'bob@test.fr', role: 'MEMBER' as const },
      { firstName: 'Manon', email: 'manon@test.fr', role: 'MANAGER' as const },
    ].map((user) =>
      prisma.user.create({ data: { ...user, lastName: 'Test', passwordHash: 'hash' } }),
    ),
  );
  const make = (slug: string, category: 'ROOM' | 'STUDIO' | 'VEHICLE' | 'EQUIPMENT') =>
    prisma.resource.create({
      data: {
        slug,
        name: `Ressource ${slug}`,
        description: 'Description',
        usageConditions: 'Conditions',
        category,
        capacity: category === 'EQUIPMENT' ? null : 4,
      },
    });
  const [room, room2, studio, equipment] = await Promise.all([
    make('room', 'ROOM'),
    make('room2', 'ROOM'),
    make('studio', 'STUDIO'),
    make('equipment', 'EQUIPMENT'),
  ]);

  return { alice, bob, manager, room, room2, studio, equipment };
}
