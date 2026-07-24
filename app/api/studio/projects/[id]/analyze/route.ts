import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import {
  getDocumentData,
  getProject,
  listDocuments,
  listSources,
  saveAnalysis,
} from '@/lib/studio/store';
import {
  ANALYSIS_MODEL,
  hasAnthropicConfigured,
  runProjectAnalysis,
} from '@/lib/studio/ai';
import type { StudioDocument } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  if (!hasAnthropicConfigured()) {
    return NextResponse.json(
      {
        error:
          "L'analyse IA n'est pas configurée : ajoutez ANTHROPIC_API_KEY dans .env.local (voir console.anthropic.com).",
      },
      { status: 503 }
    );
  }

  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  try {
    const documents = await listDocuments(project.id);
    const docsWithData: { doc: StudioDocument; data: Buffer }[] = [];
    for (const doc of documents) {
      const withData = await getDocumentData(project.id, doc.id);
      if (withData) docsWithData.push(withData);
    }

    if (docsWithData.length === 0 && !project.brief) {
      return NextResponse.json(
        { error: 'Ajoutez au moins un brief ou un document avant de lancer l\'analyse.' },
        { status: 400 }
      );
    }

    const sources = await listSources(ownerId);
    const result = await runProjectAnalysis(project, docsWithData, sources);
    const analysis = await saveAnalysis(project.id, {
      status: 'done',
      model: ANALYSIS_MODEL,
      result,
      error: null,
    });
    return NextResponse.json({ analysis });
  } catch (err) {
    console.error('[studio/analyze] POST:', err);
    const message =
      err instanceof Error ? err.message : "Une erreur est survenue pendant l'analyse.";
    try {
      await saveAnalysis(project.id, {
        status: 'error',
        model: ANALYSIS_MODEL,
        result: null,
        error: message,
      });
    } catch {
      /* l'échec de sauvegarde ne doit pas masquer l'erreur d'origine */
    }
    return NextResponse.json({ error: `Analyse impossible : ${message}` }, { status: 500 });
  }
}
