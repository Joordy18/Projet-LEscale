import { conflictError, ruleViolationError } from '@/lib/domain/errors';
import {
  activeStatuses,
  type NewReservation,
  type Reservation,
  type ReservationDetails,
} from '@/lib/domain/reservation';
import type { ResourceCategory } from '@/lib/domain/resource';
import type {
  QuotaGuard,
  ReservationRepository,
  ResourceUsage,
  StatusChange,
} from '../reservation-repository';
import type { Prisma, PrismaClient } from './generated/client';

/** Nom de la contrainte d'exclusion posée par la migration `reservation_constraints`. */
export const OVERLAP_CONSTRAINT = 'reservations_no_overlap';

const detailsInclude = {
  resource: { select: { id: true, slug: true, name: true, category: true, photoUrl: true } },
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.ReservationInclude;

type ReservationWithDetails = Prisma.ReservationGetPayload<{ include: typeof detailsInclude }>;

function toDetails(row: ReservationWithDetails): ReservationDetails {
  const { resource, user, ...reservation } = row;

  return { ...reservation, resource, requester: user };
}

function toReservation(row: Reservation): Reservation {
  return {
    id: row.id,
    resourceId: row.resourceId,
    userId: row.userId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status,
    decisionReason: row.decisionReason,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
  };
}

/**
 * Reconnaît la violation de la contrainte d'exclusion de PostgreSQL (code
 * SQLSTATE `23P01`), quelle que soit la forme sous laquelle le pilote la remonte.
 */
export function isOverlapViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));

  return serialized.includes('23P01') || serialized.includes(OVERLAP_CONSTRAINT);
}

/**
 * Repository des réservations stockées dans PostgreSQL. Les chevauchements
 * sont refusés par une contrainte d'exclusion de la base (ADR 004), ce qui
 * protège aussi contre les demandes simultanées.
 */
export class PostgresReservationRepository implements ReservationRepository {
  /**
   * @param prisma Client Prisma.
   */
  constructor(private readonly prisma: PrismaClient) {}

  async createWithQuota(input: NewReservation, quota: QuotaGuard): Promise<Reservation> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Sérialise les demandes d'un même adhérent dans une même catégorie pour que le quota soit fiable.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.userId}:${quota.category}`}))`;

        const held = await tx.reservation.count({
          where: {
            userId: input.userId,
            status: { in: [...activeStatuses] },
            endsAt: { gt: quota.now },
            resource: { category: quota.category },
          },
        });

        if (held >= quota.limit) {
          throw ruleViolationError(
            `Vous avez déjà ${quota.limit} réservations ou demandes à venir dans cette catégorie.`,
          );
        }

        return toReservation(await tx.reservation.create({ data: input }));
      });
    } catch (error) {
      if (isOverlapViolation(error)) {
        throw conflictError('Ce créneau n’est plus disponible. Choisissez un autre horaire.');
      }

      throw error;
    }
  }

  async findById(id: string): Promise<ReservationDetails | null> {
    const row = await this.prisma.reservation.findUnique({
      where: { id },
      include: detailsInclude,
    });

    return row ? toDetails(row) : null;
  }

  async findByUser(userId: string): Promise<ReservationDetails[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { userId },
      include: detailsInclude,
      orderBy: { startsAt: 'desc' },
    });

    return rows.map(toDetails);
  }

  async findPending(): Promise<ReservationDetails[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { status: 'PENDING' },
      include: detailsInclude,
      orderBy: { startsAt: 'asc' },
    });

    return rows.map(toDetails);
  }

  async countUpcomingByUser(
    userId: string,
    category: ResourceCategory,
    now: Date,
  ): Promise<number> {
    return this.prisma.reservation.count({
      where: {
        userId,
        status: { in: [...activeStatuses] },
        endsAt: { gt: now },
        resource: { category },
      },
    });
  }

  async findActiveInRange(resourceId: string, from: Date, to: Date): Promise<ReservationDetails[]> {
    const rows = await this.prisma.reservation.findMany({
      where: {
        resourceId,
        status: { in: [...activeStatuses] },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      include: detailsInclude,
      orderBy: { startsAt: 'asc' },
    });

    return rows.map(toDetails);
  }

  async findUpcomingActiveByUser(userId: string, now: Date): Promise<ReservationDetails[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { userId, status: { in: [...activeStatuses] }, endsAt: { gt: now } },
      include: detailsInclude,
    });

    return rows.map(toDetails);
  }

  async findPendingStartedBefore(now: Date): Promise<ReservationDetails[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { status: 'PENDING', startsAt: { lte: now } },
      include: detailsInclude,
    });

    return rows.map(toDetails);
  }

  async findAllActiveInRange(from: Date, to: Date): Promise<ReservationDetails[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { status: { in: [...activeStatuses] }, startsAt: { lt: to }, endsAt: { gt: from } },
      include: detailsInclude,
      orderBy: { startsAt: 'asc' },
    });

    return rows.map(toDetails);
  }

  async findBusyResourceIds(from: Date, to: Date): Promise<string[]> {
    const rows = await this.prisma.reservation.findMany({
      where: { status: { in: [...activeStatuses] }, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { resourceId: true },
      distinct: ['resourceId'],
    });

    return rows.map((row) => row.resourceId);
  }

  async updateStatus(id: string, change: StatusChange): Promise<Reservation> {
    return toReservation(
      await this.prisma.reservation.update({
        where: { id },
        data: {
          status: change.status,
          decisionReason: change.decisionReason ?? null,
          decidedAt: change.decidedAt,
        },
      }),
    );
  }

  async topResources(since: Date, limit: number): Promise<ResourceUsage[]> {
    const groups = await this.prisma.reservation.groupBy({
      by: ['resourceId'],
      where: { status: 'CONFIRMED', startsAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { resourceId: 'desc' } },
      take: limit,
    });
    const resources = await this.prisma.resource.findMany({
      where: { id: { in: groups.map((group) => group.resourceId) } },
      select: { id: true, name: true },
    });
    const names = new Map(resources.map((resource) => [resource.id, resource.name]));

    return groups.map((group) => ({
      resourceId: group.resourceId,
      name: names.get(group.resourceId) ?? 'Ressource supprimée',
      count: group._count._all,
    }));
  }
}
