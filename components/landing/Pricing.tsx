import Link from 'next/link';
import { AGENT_CONFIG, type AgentId } from '@/lib/agents';
import { Reveal } from '@/components/ui/Reveal';

const ORDER: AgentId[] = ['aria', 'nova', 'felix'];

export function Pricing() {
  return (
    <section id="tarifs" className="relative py-24 md:py-32">
      <div className="container-narrow">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-muted mb-4">Tarifs</p>
            <h2 className="heading-section text-4xl text-text-primary md:text-5xl lg:text-6xl">
              Des collaborateurs experts à{' '}
              <span className="text-gradient-cyan">une fraction du coût</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-16 grid gap-6 lg:grid-cols-4">
          {ORDER.map((id, i) => (
            <Reveal key={id} delay={i * 80}>
              <PricingCard id={id} />
            </Reveal>
          ))}
          <Reveal delay={300}>
            <PackCard />
          </Reveal>
        </div>

        <p className="mt-10 text-center text-xs text-text-muted">
          Engagement minimum 3 mois. Préavis de résiliation 30 jours. Prix HT.
        </p>
      </div>
    </section>
  );
}

function PricingCard({ id }: { id: AgentId }) {
  const a = AGENT_CONFIG[id];
  return (
    <div className="card relative flex h-full flex-col" style={{ borderColor: `${a.color}22` }}>
      <div
        className="inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-widest"
        style={{ background: `${a.color}14`, color: a.color, border: `1px solid ${a.color}33` }}
      >
        {a.domain}
      </div>

      <h3 className="heading-section mt-4 text-2xl text-text-primary">{a.name}</h3>
      <p className="mt-1 text-sm text-text-secondary">{a.role}</p>

      <div className="my-6 border-t border-[rgba(0,229,255,0.08)]" />

      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold text-text-primary">
            {a.pricing.monthly.toLocaleString('fr-FR')} €
          </span>
          <span className="text-sm text-text-secondary">/mois</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          Installation {a.pricing.install.toLocaleString('fr-FR')} € (one-shot)
        </p>
      </div>

      <ul className="mt-6 space-y-2.5">
        {a.missions.slice(0, 6).map((m) => (
          <li key={m.title} className="flex gap-2 text-sm text-text-secondary">
            <span className="mt-0.5 shrink-0" style={{ color: a.color }}>
              ✓
            </span>
            <span>{m.title}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs italic text-text-muted">{a.cdiEquivalent}</p>

      <Link
        href={`#contact?agent=${id}`}
        className="btn-primary mt-6 w-full"
        style={{ background: a.color, color: '#04121a', boxShadow: `0 8px 30px ${a.color}40` }}
      >
        Commander {a.name} →
      </Link>
    </div>
  );
}

function PackCard() {
  return (
    <div
      className="card relative flex h-full flex-col"
      style={{ borderColor: 'rgba(0,229,255,0.6)', boxShadow: '0 0 60px rgba(0,229,255,0.15)' }}
    >
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-bg-base">
        Pack complet — Économisez 10%
      </div>

      <div className="badge w-fit !text-[11px]">Les 3 agents</div>

      <h3 className="heading-section mt-4 text-2xl text-text-primary">Pack SynapseAI</h3>
      <p className="mt-1 text-sm text-text-secondary">ARIA + NOVA + FELIX</p>

      <div className="my-6 border-t border-[rgba(0,229,255,0.08)]" />

      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold text-text-primary">6 900 €</span>
          <span className="text-sm text-text-secondary">/mois</span>
        </div>
        <p className="mt-1 text-xs text-text-muted">
          <span className="line-through opacity-60">7 800 €</span> · Installation 6 500 €{' '}
          <span className="line-through opacity-60">5 800 €</span>
        </p>
      </div>

      <ul className="mt-6 space-y-2.5 text-sm text-text-secondary">
        <li className="flex gap-2">
          <span className="text-accent">✓</span> Les 3 agents activés
        </li>
        <li className="flex gap-2">
          <span className="text-accent">✓</span> Coordination inter-agents
        </li>
        <li className="flex gap-2">
          <span className="text-accent">✓</span> Rapport hebdo consolidé
        </li>
        <li className="flex gap-2">
          <span className="text-accent">✓</span> Onboarding express &lt;24h
        </li>
        <li className="flex gap-2">
          <span className="text-accent">✓</span> Account manager dédié
        </li>
      </ul>

      <p className="mt-6 text-xs italic text-text-muted">Équivalent 3 postes CDI : 108–150k€/an</p>

      <Link href="#contact?agent=pack" className="btn-primary mt-6 w-full">
        Commander le Pack →
      </Link>
    </div>
  );
}
