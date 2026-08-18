'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SOURCE_CATEGORIES,
  SOURCE_CATEGORY_LABELS,
  type SourceCategory,
  type StudioSource,
} from '@/lib/studio/types';

const CATEGORY_HINTS: Record<SourceCategory, string> = {
  ancien_dossier: 'Anciens devis, budgets et dossiers réalisés — la mémoire de vos projets.',
  fournisseur: 'Tarifs, factures et catalogues fournisseurs — la base de vos prix.',
  regle_metier: "Notes, temps de fabrication, retours d'expérience.",
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

export function SourcesManager() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<StudioSource[]>([]);
  const [category, setCategory] = useState<SourceCategory>('fournisseur');
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/sources', { cache: 'no-store' });
      if (!res.ok) return;
      setSources((await res.json()).sources ?? []);
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
      setUploading(`Lecture de ${file.name}…`);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      try {
        const res = await fetch('/api/studio/sources', { method: 'POST', body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          failed.push(`${file.name}${data.error ? ` (${data.error})` : ''}`);
        }
      } catch {
        failed.push(file.name);
      }
      await load();
    }
    setUploading(null);
    if (failed.length > 0) setError(`Non enregistré : ${failed.join(' — ')}`);
  }

  async function remove(source: StudioSource) {
    if (!window.confirm(`Supprimer « ${source.fileName} » ?`)) return;
    const res = await fetch(`/api/studio/sources/${source.id}`, { method: 'DELETE' });
    if (res.ok) setSources((prev) => prev.filter((s) => s.id !== source.id));
    else setError('Suppression impossible.');
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Catégorie de document">
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
      <p className="mb-3 text-xs text-studio-gray">{CATEGORY_HINTS[category]}</p>

      <button
        type="button"
        disabled={!!uploading}
        onClick={() => fileInputRef.current?.click()}
        className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-studio-gray/50 bg-white px-4 py-7 text-sm text-studio-gray transition-colors hover:border-studio-amber hover:text-studio-ink disabled:opacity-60"
      >
        <span className="font-medium text-studio-ink">
          {uploading ?? 'Cliquer pour ajouter des documents'}
        </span>
        {!uploading && (
          <span className="text-xs">PDF, Excel, Word, images, texte — 25 Mo max par fichier</span>
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

      <div className="mt-6 space-y-5">
        {SOURCE_CATEGORIES.map((cat) => {
          const group = sources.filter((s) => s.category === cat);
          if (group.length === 0) return null;
          return (
            <section key={cat}>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-studio-gray">
                {SOURCE_CATEGORY_LABELS[cat]} ({group.length})
              </h3>
              <ul className="divide-y divide-studio-line rounded-lg border border-studio-line bg-white">
                {group.map((source) => (
                  <li key={source.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
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
            </section>
          );
        })}
        {loaded && sources.length === 0 && (
          <p className="text-sm text-studio-gray">
            Aucun document pour le moment. Commencez par vos tarifs fournisseurs : ce sont eux qui
            rendent les préchiffrages justes.
          </p>
        )}
      </div>
    </div>
  );
}
