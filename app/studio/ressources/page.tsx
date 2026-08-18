'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SOURCE_CATEGORIES,
  SOURCE_CATEGORY_LABELS,
  type SourceCategory,
  type StudioSource,
} from '@/lib/studio/types';

const CATEGORY_HINTS: Record<SourceCategory, string> = {
  ancien_dossier: 'Anciens devis, budgets, plans et dossiers réalisés — la mémoire de vos projets.',
  fournisseur: 'Tarifs, factures et catalogues fournisseurs — la base des prix.',
  regle_metier: 'Notes, règles de calcul, temps de fabrication, retours d\'expérience.',
  autre: 'Tout autre document utile aux analyses.',
};

const STATUS_BADGE: Record<StudioSource['status'], { label: string; className: string }> = {
  traite: { label: 'Analysé', className: 'bg-emerald-100 text-emerald-800' },
  en_attente: { label: 'En attente', className: 'bg-amber-100 text-amber-800' },
  erreur: { label: 'Erreur', className: 'bg-red-100 text-red-700' },
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export default function RessourcesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<StudioSource[]>([]);
  const [category, setCategory] = useState<SourceCategory>('ancien_dossier');
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/sources', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setSources(data.sources ?? []);
    } catch {
      /* réseau : on garde l'état courant */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const failed: string[] = [];
    for (const file of Array.from(list)) {
      setUploading(`Analyse de ${file.name}… (peut prendre une à deux minutes)`);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      try {
        const res = await fetch('/api/studio/sources', { method: 'POST', body: fd });
        if (!res.ok) failed.push(file.name);
      } catch {
        failed.push(file.name);
      }
      await load();
    }
    setUploading(null);
    if (failed.length > 0) setError(`Fichiers non enregistrés : ${failed.join(', ')}`);
  }

  async function remove(source: StudioSource) {
    if (!window.confirm(`Supprimer « ${source.fileName} » des ressources IA ?`)) return;
    const res = await fetch(`/api/studio/sources/${source.id}`, { method: 'DELETE' });
    if (res.ok) setSources((prev) => prev.filter((s) => s.id !== source.id));
    else setError('Suppression impossible.');
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Ressources IA</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-studio-gray">
          Déposez ici vos anciens dossiers, tarifs fournisseurs, règles métier et tout document
          utile. Chaque fichier est lu par l&apos;IA et transformé en fiche de référence : les
          prix, quantités et enseignements qu&apos;il contient sont ensuite utilisés dans toutes
          vos analyses de projets.
        </p>
      </header>

      <section className="mb-10 rounded-xl border border-studio-line bg-white p-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-studio-gray">
          Ajouter des documents
        </h2>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Catégorie">
          {SOURCE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                category === cat
                  ? 'bg-studio-ink text-white'
                  : 'border border-studio-line bg-white text-studio-gray hover:border-studio-gray hover:text-studio-ink'
              }`}
            >
              {SOURCE_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <p className="mb-4 text-xs text-studio-gray">{CATEGORY_HINTS[category]}</p>
        <button
          type="button"
          disabled={!!uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-studio-gray/50 bg-white px-4 py-7 text-sm text-studio-gray transition-colors hover:border-studio-amber hover:text-studio-ink disabled:opacity-60"
        >
          <span className="font-medium text-studio-ink">
            {uploading ?? 'Cliquer pour ajouter des fichiers'}
          </span>
          {!uploading && (
            <span className="text-xs">PDF, Excel, Word, images, texte — 25 Mo max</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.md,.xlsx,.xlsm,.xls,.docx,application/pdf,image/*"
          onChange={(e) => {
            uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {SOURCE_CATEGORIES.map((cat) => {
        const group = sources.filter((s) => s.category === cat);
        return (
          <section key={cat} className="mb-8">
            <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wider text-studio-gray">
              {SOURCE_CATEGORY_LABELS[cat]}
              <span className="font-normal text-studio-gray/60">{group.length}</span>
            </h2>
            {group.length === 0 ? (
              <p className="text-sm text-studio-gray/70">
                {loaded ? 'Aucun document pour le moment.' : 'Chargement…'}
              </p>
            ) : (
              <ul className="divide-y divide-studio-line rounded-xl border border-studio-line bg-white">
                {group.map((source) => (
                  <li key={source.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{source.fileName}</span>
                      <span className="text-xs text-studio-gray">
                        {formatSize(source.sizeBytes)} ·{' '}
                        {new Date(source.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[source.status].className}`}
                    >
                      {STATUS_BADGE[source.status].label}
                    </span>
                    <button
                      type="button"
                      aria-label={`Supprimer ${source.fileName}`}
                      onClick={() => remove(source)}
                      className="shrink-0 text-studio-gray transition-colors hover:text-red-600"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
