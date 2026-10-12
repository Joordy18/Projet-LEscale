import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getServices } from '@/lib/services';
import { loginSchema } from '@/lib/validations/forms';

/** Durée de validité d'une session : une journée de travail. */
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** Code d'erreur renvoyé quand trop de tentatives de connexion ont échoué. */
export const TOO_MANY_ATTEMPTS_CODE = 'too_many_attempts';

class TooManyAttemptsError extends CredentialsSignin {
  code = TOO_MANY_ATTEMPTS_CODE;
}

/**
 * Configuration d'Auth.js (ADR 002). Auth.js gère la session ; les droits
 * restent vérifiés côté serveur, à chaque action, à partir de la base :
 * un compte désactivé perd donc l'accès immédiatement (R7).
 *
 * Les sessions sont des jetons signés (JWT) : le fournisseur `Credentials`
 * d'Auth.js ne prend pas en charge les sessions en base.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: '/connexion' },
  trustHost: true,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { auth: authService, loginLimiter, ipLimiter } = getServices();
        const email = parsed.data.email.trim().toLowerCase();
        // Sans adresse connue (accès direct, développement), seule la limite par e-mail s'applique.
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
        const limits = [
          { limiter: loginLimiter, key: `email:${email}` },
          ...(ip ? [{ limiter: ipLimiter, key: `ip:${ip}` }] : []),
        ];

        if (limits.some(({ limiter, key }) => !limiter.check(key).allowed)) {
          throw new TooManyAttemptsError();
        }

        const user = await authService.authenticate(email, parsed.data.password);

        if (!user) {
          limits.forEach(({ limiter, key }) => limiter.recordFailure(key));

          return null;
        }

        loginLimiter.reset(`email:${email}`);

        return { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email };
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub ?? '';

      return session;
    },
  },
});
