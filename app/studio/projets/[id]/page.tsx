'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyProjectsChanged } from '@/components/studio/StudioShell';
import {
  PROJECT_STATUSES,
  STATUS_LABELS,
  type ProjectStatus,
  type StudioDocument,
  type StudioProject,
} from '@/lib/studio/types';

const STATUS_ACTIVE: Record<ProjectStatus, string> = {
  en_cours: 'bg-studio-amber text-studio-ink',
  valide: 'bg-emerald-500 text-white',
  sans_suite: 'bg-studio-gray text-white',
  termine: 'bg-studio-ink text-white',
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
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
  const [notFound, setNotFound] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    } catch {
      setError('Impossible de charger le projet.');
    }
  }, [params.id]);

  useEffect(() => {
    setProject(null);
    setNotFound(false);
    setError(null);
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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12">
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
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.eml,application/pdf,image/*"
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
                <span className="truncate">{doc.fileName}</span>
                <span className="ml-auto shrink-0 text-xs text-studio-gray">
                  {formatSize(doc.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-dashed border-studio-gray/40 bg-white p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-studio-gray">
          <span aria-hidden className="inline-block h-2 w-2 rounded-[2px] bg-studio-amber" />
          Analyse IA
        </h2>
        <p className="text-sm leading-relaxed text-studio-gray">
          À partir des documents du projet, l&apos;analyse générera : le résumé du dossier, la
          liste des prestations probables, les questions à poser au client, les risques et un
          préchiffrage en fourchette basé sur votre bibliothèque de prix.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 cursor-not-allowed rounded-lg bg-studio-ink/10 px-4 py-2.5 text-sm font-semibold text-studio-gray"
        >
          Lancer l&apos;analyse — disponible à la prochaine étape
        </button>
      </section>
    </div>
  );
}
