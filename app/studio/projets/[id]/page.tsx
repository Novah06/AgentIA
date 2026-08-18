'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyProjectsChanged } from '@/components/studio/StudioShell';
import { ChiffrageEditor } from '@/components/studio/ChiffrageEditor';
import { ProjectSettings } from '@/components/studio/ProjectSettings';
import { EcartsPanel } from '@/components/studio/EcartsPanel';
import {
  ANALYSIS_STEPS,
  ANALYSIS_STEP_LABELS,
  PROJECT_STATUSES,
  STATUS_LABELS,
  type AnalysisStep,
  type Fiabilite,
  type PartialAnalysisResult,
  type ProjectStatus,
  type StudioAnalysis,
  type StudioChiffrage,
  type StudioDocument,
  type StudioProject,
} from '@/lib/studio/types';

const STATUS_ACTIVE: Record<ProjectStatus, string> = {
  en_cours: 'bg-studio-amber text-studio-ink',
  valide: 'bg-emerald-500 text-white',
  sans_suite: 'bg-studio-gray text-white',
  termine: 'bg-studio-ink text-white',
};

const FIABILITE_BADGE: Record<Fiabilite, string> = {
  confirme: 'bg-emerald-100 text-emerald-800',
  estime: 'bg-amber-100 text-amber-800',
  manquant: 'bg-red-100 text-red-700',
};

const FIABILITE_LABEL: Record<Fiabilite, string> = {
  confirme: 'Confirmé',
  estime: 'Estimé',
  manquant: 'Manquant',
};

const URGENCE_BADGE: Record<string, string> = {
  haute: 'bg-red-100 text-red-700',
  moyenne: 'bg-amber-100 text-amber-800',
  basse: 'bg-studio-paper text-studio-gray',
};

const RISQUE_BADGE: Record<string, string> = {
  eleve: 'bg-red-100 text-red-700',
  moyen: 'bg-amber-100 text-amber-800',
  faible: 'bg-studio-paper text-studio-gray',
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function formatEur(value: number) {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
}

function docIcon(fileType: string) {
  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.startsWith('image/')) return 'IMG';
  if (fileType.includes('word')) return 'DOC';
  return 'TXT';
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [project, setProject] = useState<StudioProject | null>(null);
  const [documents, setDocuments] = useState<StudioDocument[]>([]);
  const [analysis, setAnalysis] = useState<StudioAnalysis | null>(null);
  const [analyses, setAnalyses] = useState<StudioAnalysis[]>([]);
  const [chiffrage, setChiffrage] = useState<StudioChiffrage | null>(null);
  const [creatingChiffrage, setCreatingChiffrage] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState<AnalysisStep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/studio/projects/${params.id}`, { cache: 'no-store' });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setProject(data.project);
      setDocuments(data.documents ?? []);
      setAnalysis(data.analysis ?? null);
      setAnalyses(data.analyses ?? []);
      const cRes = await fetch(`/api/studio/projects/${params.id}/chiffrage`, {
        cache: 'no-store',
      });
      if (cRes.ok) setChiffrage((await cRes.json()).chiffrage ?? null);
    } catch {
      setError('Impossible de charger le projet.');
    }
  }, [params.id]);

  useEffect(() => {
    setProject(null);
    setNotFound(false);
    setError(null);
    setAnalyzing(false);
    load();
  }, [load]);

  async function changeStatus(status: ProjectStatus) {
    if (!project || project.status === status) return;
    const previous = project.status;
    setProject({ ...project, status });
    const res = await fetch(`/api/studio/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setProject((p) => (p ? { ...p, status: previous } : p));
      setError('Changement de statut impossible.');
      return;
    }
    notifyProjectsChanged();
  }

  async function uploadFiles(list: FileList | null) {
    if (!list || !project) return;
    setUploading(true);
    setError(null);
    const failed: string[] = [];
    for (const file of Array.from(list)) {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/studio/projects/${project.id}/documents`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) failed.push(file.name);
    }
    if (failed.length > 0) setError(`Documents non envoyés : ${failed.join(', ')}`);
    await load();
    setUploading(false);
  }

  /**
   * Enchaîne les trois étapes d'analyse. Chaque étape est un appel court,
   * enregistré côté serveur dès qu'il aboutit : si l'une échoue, les
   * précédentes sont conservées et « Reprendre » repart de la suivante.
   */
  async function runAnalysis(from: AnalysisStep = 'contexte') {
    if (!project || analyzing) return;
    setAnalyzing(true);
    setError(null);

    const remaining = ANALYSIS_STEPS.slice(ANALYSIS_STEPS.indexOf(from));
    let analysisId = from === 'contexte' ? null : (analysis?.id ?? null);

    try {
      for (const step of remaining) {
        setCurrentStep(step);
        const res = await fetch(`/api/studio/projects/${project.id}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step, analysisId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "L'analyse a échoué.");
        setAnalysis(data.analysis);
        analysisId = data.analysis?.id ?? analysisId;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'analyse a échoué.");
      await load();
    } finally {
      setCurrentStep(null);
      setAnalyzing(false);
    }
  }

  async function removeDocument(doc: StudioDocument) {
    if (!project) return;
    if (!window.confirm(`Retirer « ${doc.fileName} » du projet ?`)) return;
    const res = await fetch(`/api/studio/projects/${project.id}/documents/${doc.id}`, {
      method: 'DELETE',
    });
    if (res.ok) setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    else setError('Suppression du document impossible.');
  }

  /** Reprend le préchiffrage de l'analyse dans un tableau éditable. */
  async function createChiffrage() {
    if (!project || creatingChiffrage) return;
    setCreatingChiffrage(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/projects/${project.id}/chiffrage`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Création du chiffrage impossible');
      setChiffrage(data.chiffrage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création du chiffrage impossible');
    } finally {
      setCreatingChiffrage(false);
    }
  }

  /** Première étape non encore terminée, pour proposer la reprise. */
  function nextStep(a: StudioAnalysis | null): AnalysisStep | null {
    if (!a) return null;
    return ANALYSIS_STEPS.find((s) => !a.completedSteps.includes(s)) ?? null;
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Projet introuvable</h1>
        <p className="mt-2 text-sm text-studio-gray">
          Ce projet n&apos;existe pas ou n&apos;appartient pas à votre compte.
        </p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-sm text-studio-gray">
        {error ?? 'Chargement du projet…'}
      </div>
    );
  }

  const meta = [
    project.clientName,
    project.salon,
    project.city,
    project.surfaceM2 ? `${project.surfaceM2} m²` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
        {meta.length > 0 && (
          <p className="mt-1.5 text-sm text-studio-gray">{meta.join(' · ')}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Statut du projet">
          {PROJECT_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => changeStatus(status)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                project.status === status
                  ? STATUS_ACTIVE[status]
                  : 'border border-studio-line bg-white text-studio-gray hover:border-studio-gray hover:text-studio-ink'
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <ProjectSettings project={project} onUpdated={setProject} />
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {project.brief && (
        <section className="rounded-xl border border-studio-line bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-studio-gray">
            Brief client
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{project.brief}</p>
        </section>
      )}

      <section className="rounded-xl border border-studio-line bg-white p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-studio-gray">
            Documents ({documents.length})
          </h2>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-studio-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-studio-amber hover:text-studio-amber-dark disabled:opacity-50"
          >
            {uploading ? 'Envoi…' : '+ Ajouter'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xlsx,.xls,.eml,application/pdf,image/*"
            onChange={(e) => {
              uploadFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {documents.length === 0 ? (
          <p className="text-sm text-studio-gray">
            Aucun document. Ajoutez le brief, les plans PDF et les rendus 3D pour préparer
            l&apos;analyse.
          </p>
        ) : (
          <ul className="divide-y divide-studio-line">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-10 shrink-0 rounded bg-studio-paper px-1.5 py-0.5 text-center text-[10px] font-bold text-studio-gray">
                  {docIcon(doc.fileType)}
                </span>
                <a
                  href={`/api/studio/projects/${project.id}/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate underline-offset-2 hover:text-studio-amber-dark hover:underline"
                  title="Ouvrir le document"
                >
                  {doc.fileName}
                </a>
                <span className="ml-auto flex shrink-0 items-center gap-3 text-xs text-studio-gray">
                  {formatSize(doc.sizeBytes)}
                  <a
                    href={`/api/studio/projects/${project.id}/documents/${doc.id}?download=1`}
                    className="transition-colors hover:text-studio-ink"
                    title="Télécharger"
                    aria-label={`Télécharger ${doc.fileName}`}
                  >
                    ↓
                  </a>
                  <button
                    type="button"
                    aria-label={`Supprimer ${doc.fileName}`}
                    onClick={() => removeDocument(doc)}
                    className="transition-colors hover:text-red-600"
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-studio-line bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold uppercase tracking-wider text-studio-gray">
            <span aria-hidden className="inline-block h-2 w-2 rounded-[2px] bg-studio-amber" />
            Analyse IA
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {analyses.length > 1 && !analyzing && (
              <label className="text-xs text-studio-gray">
                <span className="sr-only">Choisir une analyse</span>
                <select
                  value={analysis?.id ?? ''}
                  onChange={(e) =>
                    setAnalysis(analyses.find((a) => a.id === e.target.value) ?? null)
                  }
                  className="rounded-lg border border-studio-line bg-white px-2 py-1.5 text-xs focus:border-studio-amber focus:outline-none"
                >
                  {analyses.map((a, i) => (
                    <option key={a.id} value={a.id}>
                      {i === 0 ? 'Dernière — ' : ''}
                      {new Date(a.createdAt).toLocaleString('fr-FR')}
                      {a.status === 'error' ? ' (échec)' : ''}
                      {a.status === 'pending' ? ' (incomplète)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {analysis?.status === 'done' && !analyzing && (
              <button
                type="button"
                onClick={() => runAnalysis('contexte')}
                className="rounded-lg border border-studio-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-studio-amber hover:text-studio-amber-dark"
              >
                Nouvelle analyse
              </button>
            )}
          </div>
        </div>

        {(analyzing || (analysis && analysis.completedSteps.length > 0)) && (
          <ol className="mb-5 space-y-1.5">
            {ANALYSIS_STEPS.map((step) => {
              const done = analysis?.completedSteps.includes(step) ?? false;
              const active = analyzing && currentStep === step;
              return (
                <li key={step} className="flex items-center gap-2.5 text-sm">
                  {active ? (
                    <span
                      aria-hidden
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-studio-line border-t-studio-amber"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        done ? 'bg-emerald-500 text-white' : 'bg-studio-paper text-studio-gray'
                      }`}
                    >
                      {done ? '✓' : ''}
                    </span>
                  )}
                  <span className={done || active ? '' : 'text-studio-gray'}>
                    {ANALYSIS_STEP_LABELS[step]}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {analyzing && (
          <p className="mb-5 text-xs text-studio-gray">
            Chaque étape prend environ trente secondes. Les résultats s&apos;affichent au fur et à
            mesure — vous pouvez laisser la page ouverte.
          </p>
        )}

        {analysis?.status === 'error' && analysis.error && !analyzing && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {analysis.error}
            {analysis.completedSteps.length > 0 &&
              ' — les étapes déjà terminées sont conservées ci-dessous.'}
          </p>
        )}

        {analysis?.result && analysis.completedSteps.length > 0 ? (
          <>
            <AnalysisView result={analysis.result} />
            {!analyzing && analysis.status !== 'done' && nextStep(analysis) && (
              <button
                type="button"
                onClick={() => runAnalysis(nextStep(analysis)!)}
                className="mt-6 rounded-lg bg-studio-amber px-5 py-2.5 text-sm font-semibold text-studio-ink transition-colors hover:bg-studio-amber-dark"
              >
                Reprendre à l&apos;étape « {ANALYSIS_STEP_LABELS[nextStep(analysis)!]} »
              </button>
            )}
            {analysis.status === 'done' && (
              <p className="mt-6 text-xs text-studio-gray">
                Analyse terminée le {new Date(analysis.updatedAt).toLocaleString('fr-FR')} — chaque
                ligne est une proposition à vérifier et corriger avant tout engagement.
              </p>
            )}
          </>
        ) : (
          !analyzing && (
            <div className="py-2">
              <p className="mb-4 text-sm leading-relaxed text-studio-gray">
                L&apos;analyse lit le brief, les plans et les rendus, puis produit : le résumé du
                dossier, les prestations probables, les questions à poser au client, les risques et
                un préchiffrage en fourchette basé sur votre bibliothèque de prix et vos ressources.
              </p>
              <button
                type="button"
                onClick={() => runAnalysis('contexte')}
                className="rounded-lg bg-studio-amber px-5 py-2.5 text-sm font-semibold text-studio-ink transition-colors hover:bg-studio-amber-dark"
              >
                Lancer l&apos;analyse IA
              </button>
            </div>
          )
        )}
      </section>

      <section className="rounded-xl border border-studio-line bg-white p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-studio-gray">
            <span aria-hidden className="inline-block h-2 w-2 rounded-[2px] bg-studio-ink" />
            Chiffrage de travail
          </h2>
          {chiffrage && (
            <button
              type="button"
              onClick={createChiffrage}
              disabled={creatingChiffrage}
              className="rounded-lg border border-studio-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-studio-amber hover:text-studio-amber-dark disabled:opacity-50"
              title="Remplace le tableau par le dernier préchiffrage de l'IA"
            >
              {creatingChiffrage ? 'Reprise…' : "Repartir de l'analyse"}
            </button>
          )}
        </div>

        {chiffrage ? (
          <>
            <ChiffrageEditor
              projectId={project.id}
              chiffrage={chiffrage}
              onSaved={setChiffrage}
            />
            {analysis?.result?.prechiffrage && (
              <div className="mt-6">
                <EcartsPanel
                  prechiffrageIa={analysis.result.prechiffrage}
                  chiffrage={chiffrage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="py-2">
            <p className="mb-4 text-sm leading-relaxed text-studio-gray">
              Reprenez le préchiffrage de l&apos;IA dans un tableau modifiable : corrigez les
              quantités et les prix, ajoutez les lignes oubliées, appliquez vos coefficients pour
              obtenir le prix de vente, cochez ce que vous avez vérifié, puis exportez en Excel.
            </p>
            <button
              type="button"
              onClick={createChiffrage}
              disabled={creatingChiffrage || analysis?.status !== 'done'}
              className="rounded-lg bg-studio-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-studio-coal disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingChiffrage ? 'Création…' : 'Créer le chiffrage depuis l\u2019analyse'}
            </button>
            {analysis?.status !== 'done' && (
              <p className="mt-2 text-xs text-studio-gray">
                Terminez d&apos;abord l&apos;analyse IA ci-dessus.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function AnalysisView({ result }: { result: PartialAnalysisResult }) {
  return (
    <div className="space-y-6">
      {result.resume && (
        <div>
          <h3 className="mb-1.5 text-sm font-semibold">Résumé du projet</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.resume}</p>
        </div>
      )}

      {result.prestations && result.prestations.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Prestations probables ({result.prestations.length})
          </h3>
          <div className="overflow-x-auto rounded-lg border border-studio-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-studio-paper text-xs uppercase tracking-wider text-studio-gray">
                <tr>
                  <th className="px-3 py-2 font-semibold">Famille</th>
                  <th className="px-3 py-2 font-semibold">Désignation</th>
                  <th className="px-3 py-2 font-semibold">Qté</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                  <th className="px-3 py-2 font-semibold">Fiabilité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-line">
                {result.prestations.map((p, i) => (
                  <tr key={i} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-studio-gray">
                      {p.famille}
                    </td>
                    <td className="px-3 py-2">
                      {p.designation}
                      {p.commentaire && (
                        <span className="block text-xs text-studio-gray">{p.commentaire}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {p.quantite !== null ? `${p.quantite} ${p.unite ?? ''}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-studio-gray">{p.source}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${FIABILITE_BADGE[p.fiabilite]}`}
                      >
                        {FIABILITE_LABEL[p.fiabilite]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result.questions && result.questions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Questions à poser au client ({result.questions.length})
          </h3>
          <ul className="space-y-1.5">
            {result.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${URGENCE_BADGE[q.urgence] ?? URGENCE_BADGE.basse}`}
                >
                  {q.theme}
                </span>
                <span>{q.question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.risques && result.risques.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Risques ({result.risques.length})</h3>
          <ul className="space-y-2">
            {result.risques.map((r, i) => (
              <li key={i} className="rounded-lg border border-studio-line p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${RISQUE_BADGE[r.niveau] ?? RISQUE_BADGE.faible}`}
                  >
                    {r.niveau === 'eleve' ? 'Élevé' : r.niveau === 'moyen' ? 'Moyen' : 'Faible'}
                  </span>
                  <span>{r.description}</span>
                </div>
                {(r.hypothese || r.action) && (
                  <p className="mt-1.5 pl-1 text-xs text-studio-gray">
                    {r.hypothese && <>Hypothèse retenue : {r.hypothese} </>}
                    {r.action && <>— Action : {r.action}</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.prechiffrage && (
      <div>
        <h3 className="mb-2 text-sm font-semibold">Préchiffrage — coût de revient HT</h3>
        {result.prechiffrage.lignes.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-studio-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-studio-paper text-xs uppercase tracking-wider text-studio-gray">
                <tr>
                  <th className="px-3 py-2 font-semibold">Désignation</th>
                  <th className="px-3 py-2 font-semibold">Qté</th>
                  <th className="px-3 py-2 font-semibold">Min</th>
                  <th className="px-3 py-2 font-semibold">Max</th>
                  <th className="px-3 py-2 font-semibold">Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-line">
                {result.prechiffrage.lignes.map((l, i) => (
                  <tr key={i} className="align-top">
                    <td className="px-3 py-2">
                      {l.designation}
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${FIABILITE_BADGE[l.fiabilite]}`}
                      >
                        {FIABILITE_LABEL[l.fiabilite]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {l.quantite !== null ? `${l.quantite} ${l.unite ?? ''}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{formatEur(l.coutHtMin)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{formatEur(l.coutHtMax)}</td>
                    <td className="px-3 py-2 text-xs text-studio-gray">{l.base}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-studio-line bg-studio-paper font-semibold">
                  <td className="px-3 py-2" colSpan={2}>
                    Total coût de revient HT
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatEur(result.prechiffrage.totalHtMin)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatEur(result.prechiffrage.totalHtMax)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {result.prechiffrage.heures.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2 text-xs">
            {result.prechiffrage.heures.map((h, i) => (
              <li key={i} className="rounded-full border border-studio-line bg-white px-3 py-1">
                <span className="font-semibold">{h.poste}</span> : {h.heuresMin}–{h.heuresMax} h
              </li>
            ))}
          </ul>
        )}
        {result.prechiffrage.commentaire && (
          <p className="mt-3 text-xs leading-relaxed text-studio-gray">
            {result.prechiffrage.commentaire}
          </p>
        )}
      </div>
      )}

      {result.confianceGlobale && (
        <div className="rounded-lg bg-studio-paper p-4">
          <h3 className="mb-1 text-sm font-semibold">Niveau de confiance</h3>
          <p className="text-sm leading-relaxed text-studio-gray">{result.confianceGlobale}</p>
        </div>
      )}
    </div>
  );
}
