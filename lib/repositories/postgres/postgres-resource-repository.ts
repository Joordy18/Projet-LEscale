import type { Resource, ResourceInput } from '@/lib/domain/resource';
import type { ResourceFilters, ResourceRepository } from '../resource-repository';
import type { Prisma, PrismaClient } from './generated/client';

/** Repository des ressources stockées dans PostgreSQL. */
export class PostgresResourceRepository implements ResourceRepository {
  /**
   * @param prisma Client Prisma.
   */
  constructor(private readonly prisma: PrismaClient) {}

  async findAll(filters: ResourceFilters = {}): Promise<Resource[]> {
    const where: Prisma.ResourceWhereInput = {};
    const query = filters.query?.trim();

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.minCapacity) {
      where.capacity = { gte: filters.minCapacity };
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    return this.prisma.resource.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findBySlug(slug: string): Promise<Resource | null> {
    return this.prisma.resource.findUnique({ where: { slug } });
  }

  async findById(id: string): Promise<Resource | null> {
    return this.prisma.resource.findUnique({ where: { id } });
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await this.prisma.resource.count({ where: { slug } })) > 0;
  }

  async create(slug: string, input: ResourceInput): Promise<Resource> {
    return this.prisma.resource.create({ data: { ...input, slug } });
  }

  async update(id: string, input: ResourceInput): Promise<Resource> {
    return this.prisma.resource.update({ where: { id }, data: input });
  }

  async setActive(id: string, isActive: boolean): Promise<Resource> {
    return this.prisma.resource.update({ where: { id }, data: { isActive } });
  }
}
