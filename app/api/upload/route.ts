import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Form data invalide' }, { status: 400 });
  }

  const file = form.get('file');
  const agentId = String(form.get('agentId') || '');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 10 Mo)' }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extracted = await extractContent(file, buffer);

  // Optional storage in Supabase
  const supabase = getSupabaseAdmin();
  let storagePath: string | undefined;
  if (supabase) {
    try {
      const path = `${agentId || 'misc'}/${Date.now()}-${sanitize(file.name)}`;
      const { error } = await supabase.storage
        .from('uploads')
        .upload(path, buffer, { contentType: file.type, upsert: false });
      if (!error) storagePath = path;
    } catch (err) {
      console.warn('[upload] Supabase upload failed:', err);
    }
  }

  return NextResponse.json({
    name: file.name,
    type: file.type,
    size: file.size,
    content: extracted,
    storagePath,
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

async function extractContent(file: File, buffer: Buffer): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  // Plain text / CSV / JSON / Markdown
  if (
    type.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.csv') ||
    name.endsWith('.md') ||
    name.endsWith('.json') ||
    name.endsWith('.tsv')
  ) {
    return buffer.toString('utf-8').slice(0, 200_000);
  }

  // Image: pass through name only
  if (type.startsWith('image/')) {
    return `[Image jointe : ${file.name}] — analyse visuelle non extraite côté serveur. Décrivez le contenu attendu à l'agent.`;
  }

  // PDF / Word / Excel: best-effort textual extraction
  try {
    const utf = buffer.toString('utf-8');
    const printable = utf.replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-￿]/g, ' ');
    const condensed = printable.replace(/\s{2,}/g, ' ').trim();
    if (condensed.length > 200) {
      return condensed.slice(0, 150_000);
    }
  } catch {
    /* fallthrough */
  }

  return `[Fichier joint : ${file.name} (${file.type || 'binaire'})] — Le contenu n'a pas pu être extrait automatiquement. Précisez son contenu à l'agent.`;
}
