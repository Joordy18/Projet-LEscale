import path from 'node:path';
import { FilePhotoStorage } from '@/lib/repositories/files/file-photo-storage';
import { getMongoDb } from '@/lib/repositories/mongo/client';
import { MongoActivityLogRepository } from '@/lib/repositories/mongo/mongo-activity-log-repository';
import { MongoNotificationRepository } from '@/lib/repositories/mongo/mongo-notification-repository';
import { getPrisma } from '@/lib/repositories/postgres/client';
import { PostgresMaintenanceRepository } from '@/lib/repositories/postgres/postgres-maintenance-repository';
import { PostgresReservationRepository } from '@/lib/repositories/postgres/postgres-reservation-repository';
import { PostgresResourceRepository } from '@/lib/repositories/postgres/postgres-resource-repository';
import { PostgresUserRepository } from '@/lib/repositories/postgres/postgres-user-repository';
import { ActivityService } from './activity-service';
import { AuthService } from './auth-service';
import { systemClock } from './clock';
import { DashboardService } from './dashboard-service';
import { MaintenanceService } from './maintenance-service';
import { NotificationService } from './notification-service';
import { BcryptPasswordHasher } from './password-hasher';
import { RateLimiter } from './rate-limiter';
import { ReservationService } from './reservation-service';
import { ResourceService } from './resource-service';
import { UserService } from './user-service';

/** Ensemble des services de l'application. */
export type Services = ReturnType<typeof buildServices>;

/** Nombre de connexions échouées autorisées par adresse e-mail dans la fenêtre. */
const LOGIN_MAX_ATTEMPTS = 5;
/** Seuil par adresse IP : large, pour ne pas bloquer un réseau partagé (NAT) à cause d'un seul compte. */
const LOGIN_MAX_ATTEMPTS_PER_IP = 50;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function buildServices() {
  const prisma = getPrisma();
  const clock = systemClock;

  const users = new PostgresUserRepository(prisma);
  const resources = new PostgresResourceRepository(prisma);
  const reservations = new PostgresReservationRepository(prisma);
  const maintenances = new PostgresMaintenanceRepository(prisma);
  const notificationRepository = new MongoNotificationRepository(getMongoDb);
  const activityRepository = new MongoActivityLogRepository(getMongoDb);
  const photoDirectory =
    process.env.UPLOAD_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), '.uploads');
  const photos = new FilePhotoStorage(photoDirectory);
  const hasher = new BcryptPasswordHasher(12);

  const activity = new ActivityService(activityRepository, users);
  const notifications = new NotificationService(notificationRepository, clock);

  return {
    photos,
    activity,
    notifications,
    auth: new AuthService(users, hasher),
    loginLimiter: new RateLimiter(LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_MS, clock),
    ipLimiter: new RateLimiter(LOGIN_MAX_ATTEMPTS_PER_IP, LOGIN_WINDOW_MS, clock),
    resources: new ResourceService(resources, reservations, maintenances, photos, activity, clock),
    reservations: new ReservationService(
      reservations,
      resources,
      maintenances,
      users,
      notifications,
      activity,
      clock,
    ),
    maintenances: new MaintenanceService(
      maintenances,
      reservations,
      resources,
      notifications,
      activity,
      clock,
    ),
    users: new UserService(users, reservations, notificationRepository, hasher, activity, clock),
    dashboard: new DashboardService(reservations, clock),
  };
}

const globalForServices = globalThis as unknown as { services?: Services };

/**
 * Point d'assemblage des services : c'est le seul endroit qui choisit les
 * implémentations concrètes des repositories. L'assemblage est fait à la
 * première utilisation, pas à l'import, pour que la construction du site
 * n'exige pas de connexion aux bases de données.
 */
export function getServices(): Services {
  globalForServices.services ??= buildServices();

  return globalForServices.services;
}
