import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/tcg/auth';
import { isReleveHour, runPriceSync, runSnapshots } from '@/lib/tcg/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Relevé des cotes puis point de courbe, à 00 h et 12 h (heure de Paris).
 *
 * La route peut être appelée toutes les heures : elle ne fait rien en dehors
 * des heures de relevé, sauf si `?force=1`. Cela évite d'avoir à décaler la
 * configuration du planificateur (qui raisonne en UTC) deux fois par an.
 */
export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get('force') === '1';
  if (!force && !isReleveHour()) {
    return NextResponse.json({
      ignore: true,
      raison: 'Hors des heures de relevé (00 h et 12 h, Europe/Paris).',
    });
  }

  const prix = await runPriceSync();
  const snapshots = await runSnapshots();
  const ok = prix.ok && snapshots.ok;
  return NextResponse.json({ rapports: [prix, snapshots] }, { status: ok ? 200 : 207 });
}
