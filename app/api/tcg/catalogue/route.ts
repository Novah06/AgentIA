import { NextResponse } from 'next/server';
import { listSets, searchCatalogue } from '@/lib/tcg/store';
import type { PriceRefType } from '@/lib/tcg/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Recherche dans le catalogue français (cartes + produits scellés). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const setId = url.searchParams.get('extension') ?? undefined;
  const typeParam = url.searchParams.get('type');
  const refType: PriceRefType | undefined =
    typeParam === 'carte' || typeParam === 'scelle' ? typeParam : undefined;
  const limit = Number(url.searchParams.get('limite') ?? 40);

  try {
    const [entries, sets] = await Promise.all([
      searchCatalogue(q, { setId, refType, limit: Number.isFinite(limit) ? limit : 40 }),
      listSets(),
    ]);
    return NextResponse.json({ entries, sets });
  } catch (err) {
    console.error('[tcg/catalogue] GET:', err);
    return NextResponse.json({ error: 'Recherche impossible' }, { status: 500 });
  }
}
