/**
 * Détection de la configuration Clerk.
 *
 * La clé publiable est validée sur sa forme avant d'activer Clerk : une clé
 * tronquée ou mal collée faisait échouer la compilation de tout le site,
 * y compris la vitrine. Mieux vaut démarrer sans authentification — le
 * bandeau d'avertissement le signale — que de ne plus rien servir du tout.
 */

/** Forme attendue : pk_test_… ou pk_live_… suivi d'un base64 encodant le domaine. */
export function isValidClerkPublishableKey(key: string | undefined): boolean {
  if (!key) return false;
  const match = /^pk_(test|live)_([A-Za-z0-9+/=_-]+)$/.exec(key.trim());
  if (!match) return false;

  const payload = match[2];
  // Une clé tronquée reste conforme au motif ; on vérifie donc aussi que le
  // base64 se décode et se termine bien par le « $ » que Clerk y place.
  try {
    const decoded =
      typeof atob === 'function'
        ? atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
        : Buffer.from(payload, 'base64').toString('binary');
    return decoded.endsWith('$');
  } catch {
    return false;
  }
}

export function isValidClerkSecretKey(key: string | undefined): boolean {
  return !!key && /^sk_(test|live)_.{8,}$/.test(key.trim());
}

export const hasClerkConfigured =
  isValidClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
  isValidClerkSecretKey(process.env.CLERK_SECRET_KEY);

/** Vrai si une clé est présente mais inutilisable : à signaler à l'exploitant. */
export const hasMalformedClerkKeys =
  (!!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !!process.env.CLERK_SECRET_KEY) &&
  !hasClerkConfigured;
