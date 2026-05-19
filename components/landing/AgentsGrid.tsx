import { AGENT_CONFIG, type AgentId } from '@/lib/agents';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { Reveal } from '@/components/ui/Reveal';

const ORDER: AgentId[] = ['aria', 'nova', 'felix'];

export function AgentsGrid() {
  return (
    <section id="agents" className="relative py-24 md:py-32">
      <div
        className="absolute inset-0 bg-grid opacity-30"
        style={{ maskImage: 'radial-gradient(ellipse 60% 70% at 50% 30%, #000, transparent)' }}
        aria-hidden
      />
      <div className="container-narrow relative">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-muted mb-4">Notre équipe</p>
            <h2 className="heading-section text-4xl text-text-primary md:text-5xl lg:text-6xl">
              Trois experts IA,{' '}
              <span className="text-gradient-cyan">un seul abonnement</span>
            </h2>
            <p className="mt-6 text-lg text-text-secondary">
              Chaque agent est opérationnel dès le premier jour et livré avec un rapport d'activité
              hebdomadaire.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {ORDER.map((id, i) => (
            <Reveal key={id} delay={i * 120}>
              <AgentCard id={id} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentCard({ id }: { id: AgentId }) {
  const a = AGENT_CONFIG[id];
  return (
    <div
      className="card group relative h-full overflow-hidden"
      style={{ borderColor: `${a.color}22` }}
    >
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: a.color }}
      />

      {/* Zone illustration — prend toute la largeur de la card */}
      <div className="relative -mx-6 -mt-6 mb-6 flex h-52 items-end overflow-hidden rounded-t-2xl"
        style={{ background: `linear-gradient(160deg, ${a.color}18 0%, ${a.color}06 100%)` }}
      >
        <AgentAvatar agent={id} size={208} large className="mx-auto" />
        {/* Dégradé de fondu vers le bas */}
        <div className="absolute inset-x-0 bottom-0 h-20"
          style={{ background: `linear-gradient(transparent, var(--bg-card))` }}
        />
      </div>

      <div className="relative flex items-start gap-4">
        <div className="flex-1">
          <div
            className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest"
            style={{ background: `${a.color}14`, color: a.color, border: `1px solid ${a.color}33` }}
          >
            {a.domain}
          </div>
          <h3 className="heading-section mt-2 text-2xl text-text-primary">{a.name}</h3>
          <p className="text-sm text-text-secondary">{a.role}</p>
        </div>
      </div>

      <div className="relative mt-6 flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold text-text-primary">
          {a.pricing.monthly.toLocaleString('fr-FR')} €
        </span>
        <span className="text-sm text-text-secondary">/mois</span>
        <span className="ml-1 text-xs text-text-muted">
          · installation {a.pricing.install.toLocaleString('fr-FR')} €
        </span>
      </div>

      <details className="group/details mt-6 [&_summary::-webkit-details-marker]:hidden">
        <summary
          className="flex cursor-pointer items-center justify-between rounded-lg border border-[rgba(0,229,255,0.1)] bg-bg-base px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-[rgba(0,229,255,0.25)]"
        >
          Missions ({a.missions.length})
          <span className="text-accent transition-transform group-open/details:rotate-180">▾</span>
        </summary>
        <ul className="mt-3 space-y-2 px-1">
          {a.missions.map((m) => (
            <li key={m.title} className="flex gap-2 text-sm text-text-secondary">
              <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: a.color }} />
              <span>{m.title}</span>
            </li>
          ))}
        </ul>
      </details>

      <details className="group/details mt-3 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center justify-between rounded-lg border border-[rgba(0,229,255,0.05)] bg-transparent px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary">
          Capacités techniques
          <span className="text-accent transition-transform group-open/details:rotate-180">▾</span>
        </summary>
        <ul className="mt-3 space-y-1.5 px-1">
          {a.capabilities.map((c) => (
            <li key={c} className="flex gap-2 text-xs text-text-secondary">
              <span style={{ color: a.color }}>→</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
