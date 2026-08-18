import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { deleteDocument, getDocumentData, getProject } from '@/lib/studio/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string; docId: string } };

/** Renvoie le fichier d'origine (aperçu dans le navigateur ou téléchargement). */
export async function GET(req: Request, { params }: Params) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  const found = await getDocumentData(project.id, params.docId);
  if (!found) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  // ?download=1 force l'enregistrement ; sinon PDF et images s'ouvrent
  // directement dans un onglet, ce qui est le geste attendu sur un plan.
  const download = new URL(req.url).searchParams.get('download') === '1';
  const disposition = download ? 'attachment' : 'inline';

  return new NextResponse(new Uint8Array(found.data), {
    headers: {
      'Content-Type': found.doc.fileType || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename*=UTF-8''${encodeURIComponent(found.doc.fileName)}`,
      'Content-Length': String(found.data.length),
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  try {
    const removed = await deleteDocument(project.id, params.docId);
    if (!removed) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[studio/documents/:docId] DELETE:', err);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }
}
