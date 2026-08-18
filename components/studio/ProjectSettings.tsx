'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { notifyProjectsChanged } from '@/components/studio/StudioShell';
import type { StudioProject } from '@/lib/studio/types';

/**
 * Modification, duplication et suppression d'un projet.
 * Repliée par défaut : ces actions sont rares comparées au travail
 * d'analyse et de chiffrage, elles ne doivent pas encombrer la page.
 */
export function ProjectSettings({
  project,
  onUpdated,
}: {
  project: StudioProject;
  onUpdated: (p: StudioProject) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: project.name,
    clientName: project.clientName ?? '',
    salon: project.salon ?? '',
    city: project.city ?? '',
    surfaceM2: project.surfaceM2 !== null ? String(project.surfaceM2) : '',
    brief: project.brief ?? '',
  });
  const [busy, setBusy] = useState<'save' | 'copy' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim()) {
      setError('Le nom du projet est requis.');
      return;
    }
    setBusy('save');
    setError(null);
    try {
      const res = await fetch(`/api/studio/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          clientName: form.clientName,
          salon: form.salon,
          city: form.city,
          surfaceM2: form.surfaceM2 ? Number(form.surfaceM2.replace(',', '.')) : null,
          brief: form.brief,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Enregistrement impossible');
      onUpdated(data.project);
      notifyProjectsChanged();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setBusy(null);
    }
  }

  /** Duplique les informations du dossier, sans les documents ni l'analyse. */
  async function duplicate() {
    setBusy('copy');
    setError(null);
    try {
      const res = await fetch('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${project.name} (copie)`,
          clientName: project.clientName ?? undefined,
          salon: project.salon ?? undefined,
          city: project.city ?? undefined,
          surfaceM2: project.surfaceM2 ?? undefined,
          brief: project.brief ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Duplication impossible');
      notifyProjectsChanged();
      router.push(`/studio/projets/${data.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Duplication impossible');
      setBusy(null);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Supprimer définitivement « ${project.name} » ?\n\nLes documents, l'analyse et le chiffrage seront perdus.`
      )
    ) {
      return;
    }
    setBusy('delete');
    try {
      const res = await fetch(`/api/studio/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Suppression impossible');
      notifyProjectsChanged();
      router.push('/studio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
      setBusy(null);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-studio-line bg-white px-3 py-2 text-sm focus:border-studio-amber focus:outline-none focus:ring-2 focus:ring-studio-amber/20';

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-studio-line bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:border-studio-amber"
        >
          Modifier le projet
        </button>
        <button
          type="button"
          onClick={duplicate}
          disabled={busy === 'copy'}
          title="Crée un nouveau projet avec les mêmes informations, sans les documents"
          className="rounded-lg border border-studio-line bg-white px-3 py-1.5 text-xs font-semibold transition-colors hover:border-studio-amber disabled:opacity-50"
        >
          {busy === 'copy' ? 'Duplication…' : 'Dupliquer'}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy === 'delete'}
          className="rounded-lg border border-studio-line bg-white px-3 py-1.5 text-xs font-semibold text-studio-gray transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
        >
          {busy === 'delete' ? 'Suppression…' : 'Supprimer'}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-studio-line bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-studio-gray">
        Modifier le projet
      </h3>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Nom du projet</span>
          <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Client</span>
            <input
              className={inputClass}
              value={form.clientName}
              onChange={(e) => set('clientName', e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Salon / événement</span>
            <input className={inputClass} value={form.salon} onChange={(e) => set('salon', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Ville / lieu</span>
            <input className={inputClass} value={form.city} onChange={(e) => set('city', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Surface (m²)</span>
            <input
              className={inputClass}
              inputMode="decimal"
              value={form.surfaceM2}
              onChange={(e) => set('surfaceM2', e.target.value)}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Brief client</span>
          <textarea
            className={`${inputClass} min-h-[120px] resize-y`}
            value={form.brief}
            onChange={(e) => set('brief', e.target.value)}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy === 'save'}
          className="rounded-lg bg-studio-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-studio-coal disabled:opacity-50"
        >
          {busy === 'save' ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-lg border border-studio-line px-4 py-2 text-sm font-semibold transition-colors hover:border-studio-gray"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
