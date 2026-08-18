'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifyProjectsChanged } from '@/components/studio/StudioShell';

const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.eml,application/pdf,image/*';

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    clientName: '',
    salon: '',
    city: '',
    surfaceM2: '',
    brief: '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const file of Array.from(list)) {
        if (!next.some((f) => f.name === file.name && f.size === file.size)) {
          next.push(file);
        }
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Le nom du projet est requis.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      setProgress('Création du projet…');
      const res = await fetch('/api/studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          clientName: form.clientName,
          salon: form.salon,
          city: form.city,
          surfaceM2: form.surfaceM2 ? Number(form.surfaceM2.replace(',', '.')) : undefined,
          brief: form.brief,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error ?? 'Création impossible');
      }
      const { project } = await res.json();

      const failed: string[] = [];
      for (let i = 0; i < files.length; i++) {
        setProgress(`Envoi du document ${i + 1}/${files.length} : ${files[i].name}`);
        const fd = new FormData();
        fd.append('file', files[i]);
        const up = await fetch(`/api/studio/projects/${project.id}/documents`, {
          method: 'POST',
          body: fd,
        });
        if (!up.ok) failed.push(files[i].name);
      }

      notifyProjectsChanged();
      if (failed.length > 0) {
        setError(`Projet créé, mais documents non envoyés : ${failed.join(', ')}`);
        setSubmitting(false);
        setProgress(null);
        setTimeout(() => router.push(`/studio/projets/${project.id}`), 2500);
        return;
      }
      router.push(`/studio/projets/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
      setSubmitting(false);
      setProgress(null);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-studio-line bg-white px-3.5 py-2.5 text-sm text-studio-ink placeholder:text-studio-gray focus:border-studio-amber focus:outline-none focus:ring-2 focus:ring-studio-amber/25';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Nouveau projet</h1>
        <p className="mt-2 text-sm text-studio-gray">
          Ajoutez le brief, les plans et les rendus 3D. L&apos;analyse préparera le résumé, les
          prestations probables, les questions manquantes, les risques et un préchiffrage.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Nom du projet <span className="text-studio-amber">*</span>
          </label>
          <input
            id="name"
            className={inputClass}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Stand Maison&Objet 2026 — Client X"
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="clientName" className="mb-1.5 block text-sm font-medium">
              Client
            </label>
            <input
              id="clientName"
              className={inputClass}
              value={form.clientName}
              onChange={(e) => set('clientName', e.target.value)}
              placeholder="Nom du client"
            />
          </div>
          <div>
            <label htmlFor="salon" className="mb-1.5 block text-sm font-medium">
              Salon / événement
            </label>
            <input
              id="salon"
              className={inputClass}
              value={form.salon}
              onChange={(e) => set('salon', e.target.value)}
              placeholder="Maison&Objet, SIRHA…"
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium">
              Ville / lieu
            </label>
            <input
              id="city"
              className={inputClass}
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Paris Nord Villepinte…"
            />
          </div>
          <div>
            <label htmlFor="surfaceM2" className="mb-1.5 block text-sm font-medium">
              Surface (m²)
            </label>
            <input
              id="surfaceM2"
              className={inputClass}
              value={form.surfaceM2}
              onChange={(e) => set('surfaceM2', e.target.value)}
              placeholder="54"
              inputMode="decimal"
            />
          </div>
        </div>

        <div>
          <label htmlFor="brief" className="mb-1.5 block text-sm font-medium">
            Brief client
          </label>
          <textarea
            id="brief"
            className={`${inputClass} min-h-[140px] resize-y`}
            value={form.brief}
            onChange={(e) => set('brief', e.target.value)}
            placeholder="Collez ici le brief ou l'e-mail de demande du client…"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium">
            Documents (plans PDF, rendus 3D, images, brief…)
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center gap-1 rounded-lg border border-dashed border-studio-gray/50 bg-white px-4 py-8 text-sm text-studio-gray transition-colors hover:border-studio-amber hover:text-studio-ink"
          >
            <span className="font-medium text-studio-ink">Cliquer pour ajouter des fichiers</span>
            <span className="text-xs">PDF, images, Word, texte — 25 Mo max par fichier</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((file) => (
                <li
                  key={`${file.name}-${file.size}`}
                  className="flex items-center justify-between rounded-md border border-studio-line bg-white px-3 py-2 text-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <span className="ml-3 flex shrink-0 items-center gap-3 text-xs text-studio-gray">
                    {(file.size / 1024 / 1024).toFixed(1)} Mo
                    <button
                      type="button"
                      aria-label={`Retirer ${file.name}`}
                      onClick={() => setFiles((prev) => prev.filter((f) => f !== file))}
                      className="text-studio-gray transition-colors hover:text-studio-ink"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-studio-ink px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-studio-coal disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? progress ?? 'Création…' : 'Créer le projet'}
        </button>
      </form>
    </div>
  );
}
