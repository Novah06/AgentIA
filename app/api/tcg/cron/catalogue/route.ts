import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/tcg/auth';
import { runCatalogueSync } from '@/lib/tcg/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Synchronisation du catalogue français depuis TCGdex.
 *
 * `?extensions=N` ne recharge que les N extensions les plus récentes : un
 * passage complet dépasse la durée maximale d'une fonction serverless, alors
 * qu'un rattrapage par tranches tient largement dedans.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const limit = Number(new URL(req.url).searchParams.get('extensions') ?? 0);
  const rapport = await runCatalogueSync(
    Number.isFinite(limit) && limit > 0 ? { setLimit: limit } : {}
  );
  return NextResponse.json({ rapport }, { status: rapport.ok ? 200 : 207 });
}

export async function GET(req: Request) {
  return POST(req);
}
