import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { AGENT_CONFIG, type AgentId } from '@/lib/agents';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

const AGENTS: AgentId[] = ['aria', 'nova', 'felix'];

const RECENT_ACTIVITY = [
  { agent: 'ARIA', action: 'Rapport journalier généré', when: 'il y a 3h' },
  { agent: 'NOVA', action: 'Candidature scorée (8/10)', when: 'il y a 5h' },
  { agent: 'FELIX', action: 'Alerte contrat SaaS à J-30', when: 'il y a 1j' },
  { agent: 'ARIA', action: 'Anomalie bancaire détectée — 1 240€', when: 'il y a 2j' },
];

export default async function DashboardPage() {
  let firstName: string | undefined;
  try {
    const user = await currentUser();
    firstName = user?.firstName ?? user?.username ?? undefined;
  } catch {
    firstName = undefined;
  }

  return (
    <main className="min-h-screen bg-bg-base">
      <DashboardNav userName={firstName ?? 'Démo'} />

      <div className="container-narrow py-10 md:py-14">
        <header className="mb-10">
          <h1 className="heading-display text-4xl text-text-primary md:text-5xl">
            Bonjour {firstName ?? 'à vous'} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-2 text-text-secondary">Vos agents sont actifs et prêts à travailler.</p>
        </header>

        <section>
          <h2 className="heading-section mb-6 text-xl text-text-primary">Mes agents</h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {AGENTS.map((id) => (
              <AgentCard key={id} id={id} />
            ))}
          </div>
        </section>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          <section className="card lg:col-span-2">
            <h3 className="heading-section text-lg text-text-primary">Activité récente</h3>
            <ul className="mt-4 divide-y divide-[rgba(0,229,255,0.06)]">
              {RECENT_ACTIVITY.map((a, i) => (
                <li key={i} className="flex items-center gap-3 py-3 text-sm">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                    style={{
                      background:
                        a.agent === 'ARIA'
                          ? '#00e5ff1A'
                          : a.agent === 'NOVA'
                            ? '#3dffb01A'
                            : '#f0c0401A',
                      color:
                        a.agent === 'ARIA'
                          ? '#00e5ff'
                          : a.agent === 'NOVA'
                            ? '#3dffb0'
                            : '#f0c040',
                    }}
                  >
                    {a.agent}
                  </span>
                  <span className="flex-1 text-text-primary">{a.action}</span>
                  <span className="text-xs text-text-muted">{a.when}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3 className="heading-section text-lg text-text-primary">Accès rapide</h3>
            <div className="mt-4 space-y-2">
              <QuickLink label="Uploader un document" />
              <QuickLink label="Voir l'historique complet" href="/dashboard/history" />
              <QuickLink label="Paramètres des agents" href="/dashboard/settings" />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function AgentCard({ id }: { id: AgentId }) {
  const a = AGENT_CONFIG[id];
  return (
    <Link
      href={`/dashboard/${id}`}
      className="card group flex h-full flex-col"
      style={{ borderColor: `${a.color}22` }}
    >
      <div className="flex items-start justify-between">
        <AgentAvatar agent={id} size={64} className="transition-transform group-hover:scale-105" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Actif
        </span>
      </div>

      <div className="mt-5">
        <h3 className="heading-section text-2xl text-text-primary">{a.name}</h3>
        <p className="text-sm text-text-secondary">{a.domain}</p>
      </div>

      <p className="mt-4 text-xs text-text-muted">Rapport envoyé il y a 2h</p>

      <div className="mt-auto pt-6">
        <span className="text-sm font-semibold" style={{ color: a.color }}>
          Ouvrir le chat →
        </span>
      </div>
    </Link>
  );
}

function QuickLink({ label, href }: { label: string; href?: string }) {
  const cls =
    'flex w-full items-center justify-between rounded-lg border border-[rgba(0,229,255,0.10)] bg-bg-base px-4 py-3 text-sm text-text-primary transition-colors hover:border-[rgba(0,229,255,0.30)] hover:bg-bg-card-hover';
  const inner = (
    <>
      <span>{label}</span>
      <span className="text-accent">→</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return <button className={cls}>{inner}</button>;
}
