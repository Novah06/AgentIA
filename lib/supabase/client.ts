import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serverClient: SupabaseClient | null = null;

/**
 * Client Supabase serveur uniquement.
 *
 * Aucun client navigateur n'est exposé : toutes les lectures passent par
 * les routes API, qui vérifient l'identité et le cloisonnement par
 * entreprise. La clé publique « anon » n'est donc pas nécessaire.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (serverClient) return serverClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  serverClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serverClient;
}
