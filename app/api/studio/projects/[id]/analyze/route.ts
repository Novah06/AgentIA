import { NextResponse } from 'next/server';
import { getOwnerId } from '@/lib/studio/auth';
import {
  applyAnalysisStep,
  createAnalysis,
  failAnalysis,
  getAnalysis,
  getDocumentData,
  getProject,
  listDocuments,
  listSources,
  getProfile,
} from '@/lib/studio/store';
import {
  ANALYSIS_MODEL,
  analyseChiffrage,
  analyseContexte,
  analyseQuestions,
  hasAnthropicConfigured,
} from '@/lib/studio/ai';
import { isAnalysisStep, type AnalysisResult, type StudioDocument } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Chaque étape est courte ; cette valeur reste une marge de sécurité et non
// une nécessité — l'analyse ne dépend pas d'une durée de fonction élevée.
export const maxDuration = 120;

/**
 * L'analyse se fait en trois appels successifs pilotés par le navigateur :
 *   step=contexte   → résumé + prestations (transmet les documents)
 *   step=questions  → questions manquantes + risques
 *   step=chiffrage  → préchiffrage + heures + niveau de confiance
 * Chaque étape est enregistrée dès qu'elle aboutit : une interruption ne fait
 * pas perdre le travail déjà payé, et la reprise repart de l'étape suivante.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ownerId = await getOwnerId();
  if (!ownerId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const project = await getProject(ownerId, params.id);
  if (!project) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 });

  if (!hasAnthropicConfigured()) {
    return NextResponse.json(
      {
        error:
          "L'analyse IA n'est pas configurée : ajoutez ANTHROPIC_API_KEY dans les variables d'environnement (voir console.anthropic.com).",
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* corps vide accepté : on démarre alors l'étape 1 */
  }

  const step = isAnalysisStep(body.step) ? body.step : 'contexte';
  const analysisId = typeof body.analysisId === 'string' ? body.analysisId : null;

  // L'étape 1 ouvre une nouvelle analyse ; les suivantes complètent la même.
  let analysis =
    step === 'contexte'
      ? await createAnalysis(project.id, ANALYSIS_MODEL)
      : analysisId
        ? await getAnalysis(analysisId)
        : null;

  if (!analysis) {
    return NextResponse.json(
      { error: 'Analyse introuvable — relancez depuis la première étape.' },
      { status: 400 }
    );
  }
  if (analysis.projectId !== project.id) {
    return NextResponse.json({ error: 'Analyse liée à un autre projet' }, { status: 400 });
  }

  try {
    const [sources, profile] = await Promise.all([listSources(ownerId), getProfile(ownerId)]);

    if (step === 'contexte') {
      const documents = await listDocuments(project.id);
      const docsWithData: { doc: StudioDocument; data: Buffer }[] = [];
      for (const doc of documents) {
        const withData = await getDocumentData(project.id, doc.id);
        if (withData) docsWithData.push(withData);
      }
      if (docsWithData.length === 0 && !project.brief) {
        return NextResponse.json(
          { error: "Ajoutez au moins un brief ou un document avant de lancer l'analyse." },
          { status: 400 }
        );
      }
      const partial = await analyseContexte(project, docsWithData, sources, profile);
      const updated = await applyAnalysisStep(analysis.id, 'contexte', partial);
      return NextResponse.json({ analysis: updated });
    }

    // Les étapes 2 et 3 s'appuient sur le résultat déjà enregistré.
    const current = analysis.result ?? {};
    if (typeof current.resume !== 'string' || !Array.isArray(current.prestations)) {
      return NextResponse.json(
        { error: "L'étape de lecture du dossier doit être terminée d'abord." },
        { status: 400 }
      );
    }
    const contexte = {
      resume: current.resume,
      prestations: current.prestations,
    } satisfies Pick<AnalysisResult, 'resume' | 'prestations'>;

    if (step === 'questions') {
      const partial = await analyseQuestions(project, contexte, sources, profile);
      const updated = await applyAnalysisStep(analysis.id, 'questions', partial);
      return NextResponse.json({ analysis: updated });
    }

    const partial = await analyseChiffrage(project, contexte, current.risques ?? [], sources, profile);
    const updated = await applyAnalysisStep(analysis.id, 'chiffrage', partial);
    return NextResponse.json({ analysis: updated });
  } catch (err) {
    console.error(`[studio/analyze] étape ${step}:`, err);
    const message =
      err instanceof Error ? err.message : "Une erreur est survenue pendant l'analyse.";
    const failed = await failAnalysis(analysis.id, message).catch(() => null);
    return NextResponse.json({ error: message, analysis: failed }, { status: 500 });
  }
}
