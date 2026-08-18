import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import {
  deleteProject,
  getProject,
  listAnalyses,
  listDocuments,
  updateProject,
} from '@/lib/studio/store';
import { isProjectStatus, type ProjectPatch } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const project = await getProject(ownerId, params.id);
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    const [documents, analyses] = await Promise.all([
      listDocuments(project.id),
      listAnalyses(project.id),
    ]);
    return NextResponse.json({
      project,
      documents,
      analysis: analyses[0] ?? null,
      analyses,
    });
  } catch (err) {
    console.error('[studio/projects/:id] GET:', err);
    return NextResponse.json({ error: 'Lecture du projet impossible' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const patch: ProjectPatch = {};
  if (body.status !== undefined) {
    if (!isProjectStatus(body.status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
  if (typeof body.clientName === 'string') patch.clientName = body.clientName.trim();
  if (typeof body.salon === 'string') patch.salon = body.salon.trim();
  if (typeof body.city === 'string') patch.city = body.city.trim();
  if (typeof body.brief === 'string') patch.brief = body.brief;
  if (typeof body.surfaceM2 === 'number' && Number.isFinite(body.surfaceM2)) {
    patch.surfaceM2 = body.surfaceM2;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
  }

  try {
    const project = await updateProject(ownerId, params.id, patch);
    if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    return NextResponse.json({ project });
  } catch (err) {
    console.error('[studio/projects/:id] PATCH:', err);
    return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  try {
    const removed = await deleteProject(ownerId, params.id);
    if (!removed) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[studio/projects/:id] DELETE:', err);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }
}
