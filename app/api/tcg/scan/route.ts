import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { getCollectorId } from '@/lib/tcg/auth';
import {
  MAX_IMAGE_BYTES,
  hasAnthropicConfigured,
  isAllowedMedia,
  scanImage,
} from '@/lib/tcg/scan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** L'analyse d'image dépasse le délai par défaut sur une photo lourde. */
export const maxDuration = 60;

export async function POST(req: Request) {
  const ownerId = await getCollectorId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  if (!hasAnthropicConfigured()) {
    return NextResponse.json(
      { error: 'Le scan nécessite la clé ANTHROPIC_API_KEY (voir .env.local.example).' },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }

  const file = form.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Photo manquante' }, { status: 400 });
  }
  if (!isAllowedMedia(file.type)) {
    return NextResponse.json(
      { error: 'Format non pris en charge : utilisez JPEG, PNG ou WebP.' },
      { status: 415 }
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: `Photo trop lourde (${Math.round(file.size / 1024 / 1024)} Mo, maximum 5 Mo).` },
      { status: 413 }
    );
  }

  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    const result = await scanImage(base64, file.type);
    await archiveScan(ownerId, result);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('[tcg/scan] POST:', err);
    const message = err instanceof Error ? err.message : 'Analyse impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Conserve la trace du scan.
 * L'image elle-même n'est pas stockée : seule l'analyse est utile ensuite, et
 * ne pas garder les photos évite d'accumuler des données inutiles.
 */
async function archiveScan(ownerId: string, result: Awaited<ReturnType<typeof scanImage>>) {
  const sb = getSupabaseAdmin();
  if (!sb) return;
  const { error } = await sb.from('tcg_scans').insert({
    owner_id: ownerId,
    matched_ref_id: result.matchedRefId,
    read_name: result.readName,
    read_number: result.readNumber,
    condition: result.condition,
    confidence: result.confidence,
    estimated_value_eur: result.estimatedValueEur,
    payload: result,
  });
  if (error) console.error('[tcg/scan] archivage:', error);
}
