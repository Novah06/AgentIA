import { NextResponse } from 'next/server';
import { getCollectorId } from '@/lib/tcg/auth';
import { createItem, portfolioSummary, valuedItems } from '@/lib/tcg/store';
import { parseItemInput } from '@/lib/tcg/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ownerId = await getCollectorId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const [items, summary] = await Promise.all([
      valuedItems(ownerId),
      portfolioSummary(ownerId),
    ]);
    return NextResponse.json({ items, summary });
  } catch (err) {
    console.error('[tcg/items] GET:', err);
    return NextResponse.json({ error: 'Lecture de la collection impossible' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ownerId = await getCollectorId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const parsed = parseItemInput(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const item = await createItem(ownerId, parsed.input);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('[tcg/items] POST:', err);
    return NextResponse.json({ error: 'Ajout impossible' }, { status: 500 });
  }
}
