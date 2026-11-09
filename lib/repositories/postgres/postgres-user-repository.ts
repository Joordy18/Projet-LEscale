import type { Role, User, UserCredentials } from '@/lib/domain/user';
import type { NewUser, UserRepository } from '../user-repository';
import type { PrismaClient } from './generated/client';

const publicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
} as const;

/** Repository des comptes utilisateurs stockés dans PostgreSQL. */
export class PostgresUserRepository implements UserRepository {
  /**
   * @param prisma Client Prisma.
   */
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id }, select: publicSelect });
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { ...publicSelect, passwordHash: true },
    });
  }

  async findByIds(ids: readonly string[]): Promise<User[]> {
    return this.prisma.user.findMany({ where: { id: { in: [...ids] } }, select: publicSelect });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany({
      select: publicSelect,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async findActiveByRoles(roles: readonly Role[]): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { isActive: true, role: { in: [...roles] } },
      select: publicSelect,
    });
  }

  async countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'ADMIN', isActive: true } });
  }

  async create(input: NewUser): Promise<User> {
    return this.prisma.user.create({ data: input, select: publicSelect });
  }

  async updateRole(id: string, role: Role): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { role }, select: publicSelect });
  }

  async setActive(id: string, isActive: boolean): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { isActive }, select: publicSelect });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async delete(id: string): Promise<void> {
    // La clé étrangère `reservations.user_id` est en `ON DELETE SET NULL` : les réservations restent, anonymisées.
    await this.prisma.user.delete({ where: { id } });
  }
}
