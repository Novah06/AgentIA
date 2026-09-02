import { NextResponse } from 'next/server';
import { getCollectorId } from '@/lib/tcg/auth';
import { listSnapshots, portfolioSummary, valuedItems } from '@/lib/tcg/store';
import { nextReleve } from '@/lib/tcg/jobs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Synthèse du coffre-fort : valeur, répartition, courbe. */
export async function GET(req: Request) {
  const ownerId = await getCollectorId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const days = Number(new URL(req.url).searchParams.get('jours') ?? 90);
  try {
    const [summary, snapshots, items] = await Promise.all([
      portfolioSummary(ownerId),
      listSnapshots(ownerId, Number.isFinite(days) && days > 0 ? days : 90),
      valuedItems(ownerId),
    ]);
    return NextResponse.json({
      summary,
      snapshots,
      items,
      prochainReleve: nextReleve().toISOString(),
    });
  } catch (err) {
    console.error('[tcg/portefeuille] GET:', err);
    return NextResponse.json({ error: 'Lecture du coffre-fort impossible' }, { status: 500 });
  }
}
