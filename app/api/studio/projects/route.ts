import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import { createProject, listProjects } from '@/lib/studio/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const projects = await listProjects(ownerId);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[studio/projects] GET:', err);
    return NextResponse.json({ error: 'Lecture des projets impossible' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Le nom du projet est requis' }, { status: 400 });
  }

  const surfaceRaw = body.surfaceM2;
  const surfaceM2 =
    typeof surfaceRaw === 'number' && Number.isFinite(surfaceRaw) && surfaceRaw > 0
      ? surfaceRaw
      : undefined;

  const asText = (v: unknown) =>
    typeof v === 'string' && v.trim() ? v.trim() : undefined;

  try {
    const project = await createProject(ownerId, {
      name,
      clientName: asText(body.clientName),
      salon: asText(body.salon),
      city: asText(body.city),
      surfaceM2,
      brief: asText(body.brief),
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    console.error('[studio/projects] POST:', err);
    return NextResponse.json({ error: 'Création du projet impossible' }, { status: 500 });
  }
}
