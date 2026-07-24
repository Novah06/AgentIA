import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { addSource, listSources, updateSource } from '@/lib/studio/store';
import { extractSourceFiche, hasAnthropicConfigured } from '@/lib/studio/ai';
import { isSourceCategory } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_BYTES = 25 * 1024 * 1024;

export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const sources = await listSources(ownerId);
    return NextResponse.json({ sources });
  } catch (err) {
    console.error('[studio/sources] GET:', err);
    return NextResponse.json({ error: 'Lecture des ressources impossible' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Form data invalide' }, { status: 400 });
  }

  const file = form.get('file');
  const category = form.get('category');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
  }
  if (!isSourceCategory(category)) {
    return NextResponse.json({ error: 'Catégorie invalide' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 25 Mo)' }, { status: 413 });
  }

  const type = file.type || 'application/octet-stream';
  const buffer = Buffer.from(await file.arrayBuffer());
  const isText = type.startsWith('text/');

  try {
    let source = await addSource(ownerId, {
      category,
      name: file.name,
      type,
      buffer,
      extractedText: isText ? buffer.toString('utf-8').slice(0, 100_000) : null,
      status: 'en_attente',
    });

    // Extraction IA immédiate : le document devient une "fiche source"
    // directement injectable dans les analyses.
    if (hasAnthropicConfigured()) {
      try {
        const fiche = await extractSourceFiche(file.name, type, buffer);
        source =
          (await updateSource(ownerId, source.id, { extractedText: fiche, status: 'traite' })) ??
          source;
      } catch (err) {
        console.error('[studio/sources] extraction:', err);
        source =
          (await updateSource(ownerId, source.id, {
            status: isText ? 'traite' : 'erreur',
          })) ?? source;
      }
    } else if (isText) {
      // Sans clé API : le texte brut reste exploitable tel quel.
      source = (await updateSource(ownerId, source.id, { status: 'traite' })) ?? source;
    }

    return NextResponse.json({ source }, { status: 201 });
  } catch (err) {
    console.error('[studio/sources] POST:', err);
    return NextResponse.json({ error: "Enregistrement de la ressource impossible" }, { status: 500 });
  }
}
