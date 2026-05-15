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
      </div>
    </section>
  );
}
