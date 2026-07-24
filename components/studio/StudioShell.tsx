'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import {
  PROJECT_STATUSES,
  STATUS_LABELS,
  type ProjectStatus,
  type StudioProject,
} from '@/lib/studio/types';

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const STATUS_DOT: Record<ProjectStatus, string> = {
  en_cours: 'bg-studio-amber',
  valide: 'bg-emerald-400',
  sans_suite: 'bg-studio-gray',
  termine: 'bg-white/50',
};

const PROJECTS_CHANGED_EVENT = 'studio:projects-changed';

/** À appeler après toute création / modification pour rafraîchir la barre latérale. */
export function notifyProjectsChanged() {
  window.dispatchEvent(new Event(PROJECTS_CHANGED_EVENT));
}

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/projects', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      // erreur réseau ponctuelle : on conserve la liste affichée
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    window.addEventListener(PROJECTS_CHANGED_EVENT, load);
    return () => window.removeEventListener(PROJECTS_CHANGED_EVENT, load);
  }, [load]);

  return (
    <div className="flex min-h-screen bg-studio-paper font-sans text-studio-ink">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-studio-ink text-white">
        <Link href="/studio" className="flex items-center gap-2.5 px-5 pb-1 pt-6">
          <span aria-hidden className="inline-block h-3 w-3 rounded-[3px] bg-studio-amber" />
          <span className="text-lg font-semibold tracking-wide">Metria</span>
        </Link>
        <p className="px-5 text-xs text-white/40">Avant-chiffrage assisté par IA</p>

        <Link
          href="/studio"
          className="mx-4 mt-5 rounded-lg bg-studio-amber px-4 py-2.5 text-center text-sm font-semibold text-studio-ink transition-colors hover:bg-studio-amber-dark"
        >
          + Nouveau projet
        </Link>

        <nav className="mt-6 flex-1 overflow-y-auto px-3 pb-4">
          {PROJECT_STATUSES.map((status) => {
            const group = projects.filter((p) => p.status === status);
            return (
              <section key={status} className="mb-5">
                <h2 className="flex items-center gap-2 px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
                  {STATUS_LABELS[status]}
                  <span className="ml-auto font-normal text-white/30">{group.length}</span>
                </h2>
                {group.length === 0 ? (
                  <p className="px-2 py-1 text-xs text-white/25">
                    {loaded ? 'Aucun projet' : '…'}
                  </p>
                ) : (
                  <ul>
                    {group.map((project) => {
                      const href = `/studio/projets/${project.id}`;
                      const active = pathname === href;
                      return (
                        <li key={project.id}>
                          <Link
                            href={href}
                            title={project.clientName ?? project.name}
                            className={`block truncate rounded-md px-2 py-1.5 text-sm transition-colors ${
                              active
                                ? 'bg-white/10 text-white'
                                : 'text-white/70 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {project.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-2">
          <Link
            href="/studio/ressources"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === '/studio/ressources'
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span aria-hidden className="inline-block h-2 w-2 rounded-[2px] border border-studio-amber" />
            Ressources IA
          </Link>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          {hasClerk ? (
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <span className="text-sm text-white/70">Mon compte</span>
            </div>
          ) : (
            <span className="text-xs text-white/40">
              Mode atelier — connexion non configurée
            </span>
          )}
        </div>
      </aside>

      <main className="ml-72 min-h-screen flex-1">{children}</main>
    </div>
  );
}
