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
const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Sans Supabase les dossiers ne survivent pas au redémarrage du serveur, et
 * sans Clerk l'espace est ouvert à quiconque connaît l'adresse. Ces deux
 * situations doivent être visibles avant qu'on y saisisse un vrai dossier.
 */
function ConfigWarning() {
  if (hasSupabase && hasClerk) return null;
  const manques = [
    !hasSupabase &&
      "les dossiers et documents sont conservés en mémoire : ils disparaîtront au prochain redémarrage (base de données non configurée)",
    !hasClerk &&
      "l'espace est accessible sans connexion à toute personne qui connaît l'adresse (authentification non configurée)",
  ].filter(Boolean) as string[];

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
    >
      <p className="font-semibold">Mode démonstration — n&apos;y saisissez pas de dossier réel</p>
      <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs leading-relaxed">
        {manques.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

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
  // Sur petit écran la barre latérale devient un tiroir : elle se referme
  // dès qu'on change de page, sinon elle masquerait le contenu demandé.
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-studio-paper font-sans text-studio-ink">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-studio-line bg-studio-paper/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-studio-line bg-white text-lg"
        >
          {menuOpen ? '\u2715' : '\u2630'}
        </button>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px] bg-studio-amber" />
          <span className="font-semibold tracking-wide">Metria</span>
        </span>
      </header>

      {menuOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-studio-ink text-white transition-transform lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
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
            href="/studio/profil"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors ${
              pathname === '/studio/profil'
                ? 'bg-white/10 text-white'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span aria-hidden className="inline-block h-2 w-2 rounded-[2px] border border-studio-amber" />
            Notre entreprise
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

      <main className="min-h-screen w-full min-w-0 flex-1 pt-14 lg:ml-72 lg:pt-0">
        <ConfigWarning />
        {children}
      </main>
    </div>
  );
}
