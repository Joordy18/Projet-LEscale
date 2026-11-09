import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Client Prisma partagé. En développement, le rechargement à chaud recrée les
 * modules : le client est donc conservé sur `globalThis` pour ne pas ouvrir de
 * nouvelles connexions à chaque modification.
 */
export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('La variable d’environnement DATABASE_URL est absente.');
    }

    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  return globalForPrisma.prisma;
}
