import { auth } from '@clerk/nextjs/server';
import { hasClerkConfigured } from '@/lib/auth';

/**
 * Identifiant du propriétaire des projets.
 * Avec Clerk configuré : l'utilisateur connecté (chaque entreprise retrouve
 * ses propres dossiers). Sans Clerk (test local) : un compte atelier unique.
 * Retourne null si Clerk est configuré mais que la requête n'est pas authentifiée.
 */
export async function getOwnerId(): Promise<string | null> {
  if (!hasClerkConfigured) return 'atelier-demo';
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}
