import { NextResponse } from 'next/server';
import { getCard, getSealed, getSet, latestPrice, priceHistory } from '@/lib/tcg/store';
import { gradingUpside } from '@/lib/tcg/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Fiche d'une référence : identité, dernière cote et courbe de prix. */
export async function GET(req: Request, { params }: { params: { refId: string } }) {
  const days = Number(new URL(req.url).searchParams.get('jours') ?? 90);
  try {
    const card = await getCard(params.refId);
    const sealed = card ? null : await getSealed(params.refId);
    if (!card && !sealed) {
      return NextResponse.json({ error: 'Référence inconnue' }, { status: 404 });
    }

    const setId = card?.setId ?? sealed?.setId ?? null;
    const [set, price, history] = await Promise.all([
      setId ? getSet(setId) : Promise.resolve(null),
      latestPrice(params.refId),
      priceHistory(params.refId, Number.isFinite(days) && days > 0 ? days : 90),
    ]);

    return NextResponse.json({
      refType: card ? 'carte' : 'scelle',
      card,
      sealed,
      set,
      price,
      history,
      // Intérêt d'une gradation PSA 10, pour arbitrer loose contre gradée.
      gradingUpsidePsa10:
        card && price ? gradingUpside(price.priceEur, 10, 'PSA') : null,
    });
  } catch (err) {
    console.error('[tcg/references] GET:', err);
    return NextResponse.json({ error: 'Lecture de la référence impossible' }, { status: 500 });
  }
}
