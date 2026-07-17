import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { addDocument, getProject } from '@/lib/studio/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 25 * 1024 * 1024;

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'message/rfc822',
];

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Form data invalide' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 25 Mo)' }, { status: 413 });
  }
  const type = file.type || 'application/octet-stream';
  if (!ACCEPTED_TYPES.includes(type) && !type.startsWith('image/')) {
    return NextResponse.json(
      { error: `Type de fichier non pris en charge : ${type}` },
      { status: 415 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const document = await addDocument(ownerId, project.id, {
      name: file.name,
      type,
      buffer,
    });
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    console.error('[studio/documents] POST:', err);
    return NextResponse.json({ error: "Enregistrement du document impossible" }, { status: 500 });
  }
}
