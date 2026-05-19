import { Reveal } from '@/components/ui/Reveal';

const PILLARS = [
  {
    icon: '🧠',
    title: 'Expertise sectorielle',
    body: 'Chaque agent est formé sur son domaine : droit fiscal, droit du travail, gestion administrative. Niveau senior garanti.',
  },
  {
    icon: '⚡',
    title: 'Autonomie totale',
    body: "L'agent travaille chaque jour sans qu'on lui demande. Rapport quotidien, alertes proactives, actions sans friction.",
  },
  {
    icon: '📊',
    title: 'Livrables mesurables',
    body: "Chaque semaine, un rapport d'activité. Chaque mois, un bilan complet. Vous mesurez le ROI en temps réel.",
  },
];

const STEPS = [
  {
    title: 'Configuration sur mesure',
    when: 'J1 à J5',
    body: "Après signature, nous consacrons 3 à 5 jours à configurer votre agent sur votre entreprise : secteur, régime fiscal ou social, logiciels utilisés, interlocuteurs clés, seuils de décision. Chaque agent est testé sur vos données réelles avant activation.",
  },
  {
    title: 'Activation de votre espace client',
    when: '',
    body: "Vous recevez vos identifiants pour accéder à votre espace SynapseAI. Votre agent vous connaît déjà — il a été calibré sur votre entreprise pendant les 5 jours de configuration.",
  },
  {
    title: 'Onboarding',
    when: '1h',
    body: "Nous vous montrons comment dialoguer avec votre agent, uploader vos documents, et interpréter ses rapports. En pratique : 30 minutes suffisent pour être autonome.",
  },
  {
    title: 'Votre agent travaille chaque jour',
    when: '',
    body: "À partir du lendemain, votre agent est actif. Vous lui posez vos questions via le chat, il analyse vos documents uploadés, produit ses rapports et vous alerte proactivement sur tout ce qui mérite votre attention.",
  },
];

export function About() {
  return (
    <section id="about" className="relative py-24 md:py-32">
      <div className="container-narrow">
        <Reveal>
          <h2 className="heading-section max-w-3xl text-4xl text-text-primary md:text-5xl lg:text-6xl">
            L'IA qui travaille à votre place,{' '}
            <span className="text-gradient-cyan">pas à côté de vous</span>
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:grid-cols-2">
          <Reveal delay={100}>
            <p className="text-lg leading-relaxed text-text-secondary">
              SynapseAI Workforce ne vend pas un logiciel. Nous déployons des collaborateurs IA à
              temps plein — des experts autonomes qui prennent en charge des postes entiers dans
              votre entreprise. Chaque agent maîtrise son domaine à un niveau senior, travaille
              24h/24 sans interruption, et produit des livrables mesurables chaque semaine.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-lg leading-relaxed text-text-secondary">
              Pour une PME, c'est la possibilité d'avoir une équipe d'experts sans les contraintes
              du recrutement, de l'onboarding, des congés ou de la masse salariale. Nos agents ne
              remplacent pas vos collaborateurs — ils complètent votre équipe là où les ressources
              manquent.
            </p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 100}>
              <div className="card h-full">
                <div className="mb-5 text-3xl">{p.icon}</div>
                <h3 className="heading-section mb-3 text-xl text-text-primary">{p.title}</h3>
                <p className="text-sm leading-relaxed text-text-secondary">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Comment ça marche */}
        <div
          className="relative mt-24 rounded-3xl border p-8 md:p-12"
          style={{
            background:
              'linear-gradient(140deg, rgba(0,229,255,0.04) 0%, rgba(123,140,255,0.03) 100%)',
            borderColor: 'rgba(0,229,255,0.12)',
          }}
        >
          <Reveal>
            <p className="label-muted mb-4">Notre méthode</p>
            <h3 className="heading-section text-3xl text-text-primary md:text-4xl">
              Comment ça marche
            </h3>
          </Reveal>

          <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
            {/* Ligne de connexion (desktop) */}
            <div
              className="absolute left-6 right-6 top-6 hidden h-px md:block"
              style={{
                background:
                  'linear-gradient(to right, transparent, rgba(0,229,255,0.3), rgba(0,229,255,0.3), transparent)',
              }}
              aria-hidden
            />

            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 100}>
                <li className="relative flex flex-row gap-4 md:flex-col md:gap-0">
                  <div
                    className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold"
                    style={{
                      background: 'var(--bg-base)',
                      color: 'var(--accent)',
                      border: '1px solid rgba(0,229,255,0.35)',
                      boxShadow: '0 0 0 4px var(--bg-base), 0 4px 20px rgba(0,229,255,0.15)',
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 md:mt-6">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h4 className="heading-section text-base text-text-primary">
                        {step.title}
                      </h4>
                      {step.when && (
                        <span className="text-xs text-accent">({step.when})</span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {step.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
