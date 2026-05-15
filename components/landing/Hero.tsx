import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative flex min-h-[100vh] items-center overflow-hidden pt-24">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-dot-grid opacity-60" aria-hidden />
      <div className="glow-cyan h-[520px] w-[520px] -left-32 top-1/3" aria-hidden />
      <div className="glow-violet h-[480px] w-[480px] -right-20 top-10" aria-hidden />
      <div className="noise" aria-hidden />

      <div className="container-narrow relative z-10">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="badge mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-pulse-dot rounded-full bg-accent" />
              <span className="relative h-2 w-2 rounded-full bg-accent" />
            </span>
            Agents IA disponibles dès maintenant
          </div>

          {/* Title */}
          <h1
            className="heading-display mb-8 text-text-primary"
            style={{ fontSize: 'clamp(42px, 9vw, 86px)' }}
          >
            Vos collaborateurs
            <br />
            <span className="text-gradient-cyan">IA à temps plein</span>
            <br />
            dès demain.
          </h1>

          {/* Subtitle */}
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-text-secondary md:text-xl">
            SynapseAI Workforce déploie des agents intelligents autonomes qui prennent en charge vos
            postes comptables, RH et administratifs — 24h/24, sans onboarding, pour 70% du coût
            d'un salarié.
          </p>

          {/* CTAs */}
          <div className="mb-16 flex flex-wrap gap-4">
            <Link href="/sign-up" className="btn-primary !text-base !px-7 !py-3.5">
              Démarrer maintenant →
            </Link>
            <Link href="#agents" className="btn-outline !text-base !px-7 !py-3.5">
              Découvrir les agents
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-6 border-t border-[rgba(0,229,255,0.10)] pt-10 md:grid-cols-4">
            <Stat value="−70%" label="vs coût d'un poste CDI" />
            <Stat value="24/7" label="disponibilité agent" />
            <Stat value="<24h" label="délai d'activation" />
            <Stat value="3" label="secteurs couverts" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-display text-3xl font-bold text-text-primary md:text-4xl">
        <span className="text-gradient-cyan">{value}</span>
      </div>
      <div className="mt-1 text-sm text-text-secondary">{label}</div>
    </div>
  );
}
