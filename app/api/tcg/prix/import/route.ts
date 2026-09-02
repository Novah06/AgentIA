import { NextResponse } from 'next/server';
import { isAuthorizedCron } from '@/lib/tcg/auth';
import { parseManualPrices } from '@/lib/tcg/sources/prices';
import { recordPrices } from '@/lib/tcg/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Import manuel de cotes — c'est par ici que passent les PRODUITS SCELLÉS,
 * faute de source publique gratuite en euros.
 *
 * Corps accepté : texte `refId;prix` (une ligne par référence, `;source` en
 * option), ou JSON `[{ refId, priceEur, source }]`.
 */
export async function POST(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const raw = await req.text();
  let points;
  try {
    points = parseManualPrices(raw);
  } catch (err) {
    return NextResponse.json(
      { error: `Format illisible : ${err instanceof Error ? err.message : String(err)}` },
      { status: 400 }
    );
  }

  if (!points.length) {
    return NextResponse.json({ error: 'Aucune cote exploitable dans l’import' }, { status: 400 });
  }

  try {
    const written = await recordPrices(points);
    return NextResponse.json({ relevesEcrits: written });
  } catch (err) {
    console.error('[tcg/prix/import] POST:', err);
    return NextResponse.json({ error: 'Écriture des cotes impossible' }, { status: 500 });
  }
}
