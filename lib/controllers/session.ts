import { cache } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { can, type Permission } from '@/lib/domain/permissions';
import type { Actor, User } from '@/lib/domain/user';
import { AuthService } from '@/lib/services/auth-service';
import { getServices } from '@/lib/services';
import { auth } from './auth';

/**
 * Retourne l'utilisateur connecté, relu en base à chaque requête : le rôle et
 * l'état du compte ne viennent jamais du client. Un compte désactivé ou
 * supprimé est traité comme un visiteur.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  // La session dépend de la requête : on le déclare avant tout calcul aléatoire de la bibliothèque d'authentification.
  await connection();

  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return getServices().auth.resolveActiveUser(session.user.id);
});

/** Retourne la personne connectée sous forme d'acteur, ou `null` pour un visiteur. */
export async function getActor(): Promise<Actor | null> {
  const user = await getCurrentUser();

  return user ? AuthService.toActor(user) : null;
}

/**
 * Accepte uniquement un chemin interne comme destination après connexion, pour
 * éviter les redirections vers un site externe.
 *
 * @param value Destination demandée.
 * @returns Le chemin s'il est interne, sinon `/`.
 */
export function safeReturnPath(value: string | null | undefined): string {
  return value && /^\/(?!\/|\\)/.test(value) ? value : '/';
}

/**
 * Exige une personne connectée pour afficher une page, avec au besoin une
 * permission précise. Sinon, redirige vers la connexion ou la page d'accès refusé.
 *
 * @param permission Permission requise, facultative.
 * @param returnTo Page à rouvrir après la connexion.
 */
export async function requireUser(permission?: Permission, returnTo?: string): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(returnTo ? `/connexion?next=${encodeURIComponent(returnTo)}` : '/connexion');
  }

  if (permission && !can(AuthService.toActor(user), permission)) {
    redirect('/acces-refuse');
  }

  return user;
}
