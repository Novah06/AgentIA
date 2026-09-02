import { auth } from '@clerk/nextjs/server';
import { hasClerkConfigured } from '@/lib/auth';

/**
 * Propriétaire d'un portefeuille.
 * Avec Clerk configuré : l'utilisateur connecté. Sans Clerk (test local) : une
 * collection de démonstration unique, ce qui permet d'essayer l'application
 * sans compte. Retourne null si Clerk est configuré mais la requête anonyme.
 */
export async function getCollectorId(): Promise<string | null> {
  if (!hasClerkConfigured) return 'collection-demo';
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

/**
 * Autorisation des routes de planification.
 * `CRON_SECRET` protège le déclenchement des bots : sans lui, n'importe qui
 * pourrait faire tourner les relevés en boucle et épuiser les quotas des
 * sources. Vercel Cron envoie ce secret en en-tête Authorization.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Sans secret configuré, on n'autorise que le développement local.
    return process.env.NODE_ENV !== 'production';
  }
  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${secret}`;
}
