import type { MaintenancePeriod, NewMaintenancePeriod } from '@/lib/domain/maintenance';
import type { MaintenanceRepository } from '../maintenance-repository';
import type { PrismaClient } from './generated/client';

/** Repository des périodes de maintenance stockées dans PostgreSQL. */
export class PostgresMaintenanceRepository implements MaintenanceRepository {
  /**
   * @param prisma Client Prisma.
   */
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: NewMaintenancePeriod): Promise<MaintenancePeriod> {
    return this.prisma.maintenancePeriod.create({ data: input });
  }

  async findById(id: string): Promise<MaintenancePeriod | null> {
    return this.prisma.maintenancePeriod.findUnique({ where: { id } });
  }

  async findUpcomingByResource(resourceId: string, now: Date): Promise<MaintenancePeriod[]> {
    return this.prisma.maintenancePeriod.findMany({
      where: { resourceId, endsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findOverlapping(resourceId: string, from: Date, to: Date): Promise<MaintenancePeriod[]> {
    return this.prisma.maintenancePeriod.findMany({
      where: { resourceId, startsAt: { lt: to }, endsAt: { gt: from } },
      orderBy: { startsAt: 'asc' },
    });
  }

  async findBusyResourceIds(from: Date, to: Date): Promise<string[]> {
    const periods = await this.prisma.maintenancePeriod.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from } },
      select: { resourceId: true },
      distinct: ['resourceId'],
    });

    return periods.map((period) => period.resourceId);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.maintenancePeriod.delete({ where: { id } });
  }
}
