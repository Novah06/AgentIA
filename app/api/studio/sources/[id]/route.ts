import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { deleteSource } from '@/lib/studio/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const removed = await deleteSource(ownerId, params.id);
    if (!removed) return NextResponse.json({ error: 'Ressource introuvable' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[studio/sources/:id] DELETE:', err);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }
}
