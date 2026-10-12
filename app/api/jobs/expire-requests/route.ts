import { timingSafeEqual } from 'node:crypto';
import { getServices } from '@/lib/services';

function isAuthorized(request: Request, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get('authorization') ?? '');

  return expected.length === received.length && timingSafeEqual(expected, received);
}

/**
 * `POST /api/jobs/expire-requests` : tâche planifiée qui annule les demandes
 * non traitées au début de leur créneau (R8). Protégée par `CRON_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return Response.json({ error: 'Tâche non configurée.' }, { status: 503 });
  }

  if (!isAuthorized(request, secret)) {
    return Response.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const expired = await getServices().reservations.expireStale();

  return Response.json({ expired });
}
