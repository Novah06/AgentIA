import Link from 'next/link';
import { currentUser } from '@clerk/nextjs/server';
import { AGENT_CONFIG, type AgentId } from '@/lib/agents';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { DashboardNav } from '@/components/dashboard/DashboardNav';

const AGENTS: AgentId[] = ['aria', 'nova', 'felix'];

type AgentStatus = 'active' | 'configuring' | 'inactive';

/**
 * Source réelle : champ `agents_status` (JSONB) de la table `client_profiles`.
 * Tant que la lecture Supabase n'est pas branchée côté auth, on utilise
 * une valeur de démonstration que tu peux modifier ici pour tester chaque état.
 */
function getAgentStatusMap(): Record<AgentId, AgentStatus> {
  return {
    aria: 'active',
    nova: 'configuring',
    felix: 'inactive',
  };
}

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

  const statusMap = getAgentStatusMap();

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
              <AgentCard key={id} id={id} status={statusMap[id]} />
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

function AgentCard({ id, status }: { id: AgentId; status: AgentStatus }) {
  const a = AGENT_CONFIG[id];

  return (
    <div className="card group flex h-full flex-col" style={{ borderColor: `${a.color}22` }}>
      <div className="flex items-start justify-between gap-3">
        <AgentAvatar agent={id} size={64} className="transition-transform group-hover:scale-105" />
        <StatusBadge status={status} />
      </div>

      <div className="mt-5">
        <h3 className="heading-section text-2xl text-text-primary">{a.name}</h3>
        <p className="text-sm text-text-secondary">{a.domain}</p>
      </div>

      <StatusMessage status={status} />

      <div className="mt-auto pt-6">
        <AgentCardCta id={id} status={status} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Actif
      </span>
    );
  }
  if (status === 'configuring') {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
        style={{ background: 'rgba(186,117,23,0.15)', color: '#f0a040' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#f0a040' }} /> En configuration
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
      <span className="h-1.5 w-1.5 rounded-full bg-text-muted" /> Non souscrit
    </span>
  );
}

function StatusMessage({ status }: { status: AgentStatus }) {
  if (status === 'active') {
    return <p className="mt-4 text-xs text-text-muted">Dernière activité : il y a 2h</p>;
  }
  if (status === 'configuring') {
    return (
      <p className="mt-4 text-xs leading-relaxed text-text-secondary">
        Votre agent est en cours de personnalisation sur votre entreprise.
        Vous recevrez un email dès qu'il est prêt.
      </p>
    );
  }
  return (
    <p className="mt-4 text-xs leading-relaxed text-text-secondary">
      Cet agent n'est pas inclus dans votre abonnement actuel.
    </p>
  );
}

function AgentCardCta({ id, status }: { id: AgentId; status: AgentStatus }) {
  const a = AGENT_CONFIG[id];

  if (status === 'active') {
    return (
      <Link
        href={`/dashboard/${id}`}
        className="inline-flex items-center text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ color: a.color }}
      >
        Ouvrir le chat →
      </Link>
    );
  }

  if (status === 'configuring') {
    return (
      <span
        title="Votre agent sera activé sous 3 à 5 jours ouvrés."
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs text-text-muted"
      >
        Activation dans 3 à 5 jours
      </span>
    );
  }

  return (
    <Link
      href={`/#tarifs?agent=${id}`}
      className="inline-flex items-center text-sm font-semibold text-accent transition-opacity hover:opacity-80"
    >
      Découvrir cet agent →
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
