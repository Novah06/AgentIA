import { NextResponse } from 'next/server';
import { getCollectorId } from '@/lib/tcg/auth';
import { deleteItem, updateItem } from '@/lib/tcg/store';
import { parseItemInput } from '@/lib/tcg/validate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
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
    const item = await updateItem(ownerId, params.id, parsed.input);
    if (!item) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error('[tcg/items/:id] PATCH:', err);
    return NextResponse.json({ error: 'Modification impossible' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getCollectorId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const ok = await deleteItem(ownerId, params.id);
    if (!ok) return NextResponse.json({ error: 'Item introuvable' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[tcg/items/:id] DELETE:', err);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }
}
