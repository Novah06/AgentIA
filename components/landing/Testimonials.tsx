import { Reveal } from '@/components/ui/Reveal';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  agent: 'ARIA' | 'NOVA' | 'FELIX' | 'Pack 3 agents';
  quote: string;
  initials: string;
  color: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Thomas Mercier',
    role: 'DAF',
    company: 'Groupe Nexalta',
    agent: 'ARIA',
    quote:
      "ARIA a détecté une anomalie bancaire de 4 200€ dès la première semaine. En 3 ans, aucun de nos comptables n'avait vu ça. ROI immédiat.",
    initials: 'TM',
    color: '#00e5ff',
  },
  {
    name: 'Sophie Leblanc',
    role: 'DRH',
    company: 'Meridian Tech',
    agent: 'NOVA',
    quote:
      'En 6 semaines, NOVA a pourvu 3 postes que nous cherchions à combler depuis 4 mois. Le scoring des CVs nous fait gagner 5h par semaine.',
    initials: 'SL',
    color: '#3dffb0',
  },
  {
    name: 'Alain Rousseau',
    role: 'DG',
    company: 'Foncière Aurore',
    agent: 'FELIX',
    quote:
      "FELIX a alerté sur un abonnement SaaS à 890€/mois qui allait se renouveler tacitement. Économie directe : 10 680€ sur l'année.",
    initials: 'AR',
    color: '#f0c040',
  },
  {
    name: 'Nathalie Collin',
    role: 'Dirigeante',
    company: 'Cabinet Morel',
    agent: 'ARIA',
    quote:
      "La réforme 2026 nous angoissait. ARIA a réalisé notre audit de conformité en 2 jours et nous a recommandé la bonne PDP. On est tranquilles.",
    initials: 'NC',
    color: '#00e5ff',
  },
  {
    name: 'Pierre Dumont',
    role: 'CEO',
    company: 'Studio Karbon',
    agent: 'Pack 3 agents',
    quote:
      "C'est comme avoir recruté une équipe entière en une journée. Les rapports hebdo sont bluffants.",
    initials: 'PD',
    color: '#7b8cff',
  },
  {
    name: 'Marc Bernard',
    role: 'Associé',
    company: 'Archimed Group',
    agent: 'ARIA',
    quote:
      "Le rapport mensuel d'ARIA remplace nos réunions de 2h en comité de direction. Tout est là, chiffré, en 2 pages.",
    initials: 'MB',
    color: '#00e5ff',
  },
  {
    name: 'Claire Fontaine',
    role: 'Office Manager',
    company: 'Tectum SAS',
    agent: 'NOVA',
    quote:
      "NOVA a géré l'onboarding de nos 4 recrues de l'été sans qu'on ait à intervenir une seule fois.",
    initials: 'CF',
    color: '#3dffb0',
  },
  {
    name: 'Laura Vidal',
    role: 'DG',
    company: 'LogiServ Pro',
    agent: 'FELIX',
    quote:
      "L'installation a pris moins d'une journée. FELIX connaissait tous nos prestataires dès le lendemain matin.",
    initials: 'LV',
    color: '#f0c040',
  },
  {
    name: 'Julien Renard',
    role: 'CFO',
    company: 'Innov RH',
    agent: 'ARIA',
    quote:
      'Nous avons remplacé un poste de 42k€/an par ARIA à 3 500€/mois. La qualité est supérieure, la disponibilité aussi.',
    initials: 'JR',
    color: '#00e5ff',
  },
];

export function Testimonials() {
  const col1 = TESTIMONIALS.filter((_, i) => i % 2 === 0);
  const col2 = TESTIMONIALS.filter((_, i) => i % 2 === 1);

  return (
    <section id="temoignages" className="relative overflow-hidden py-24 md:py-32">
      <div className="container-narrow">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-muted mb-4">Témoignages clients</p>
            <h2 className="heading-section text-4xl text-text-primary md:text-5xl lg:text-6xl">
              Ce qu'ils <span className="text-gradient-cyan">disent de nous</span>
            </h2>
          </div>
        </Reveal>
      </div>

      <div className="mt-16 flex justify-center gap-6 px-6">
        <div className="fade-edges-y relative grid h-[640px] w-full max-w-5xl grid-cols-1 gap-6 overflow-hidden md:grid-cols-2">
          <ScrollColumn items={col1} direction="up" />
          <div className="hidden md:block">
            <ScrollColumn items={col2} direction="down" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScrollColumn({
  items,
  direction,
}: {
  items: Testimonial[];
  direction: 'up' | 'down';
}) {
  return (
    <div
      className={`flex flex-col gap-6 ${
        direction === 'up' ? 'animate-scroll-up' : 'animate-scroll-down'
      }`}
    >
      {[...items, ...items].map((t, i) => (
        <TestimonialCard key={i} {...t} />
      ))}
    </div>
  );
}

function TestimonialCard(t: Testimonial) {
  return (
    <div className="card !p-6">
      <div className="flex items-center gap-1 text-[#f0c040]">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i}>★</span>
        ))}
      </div>
      <blockquote className="mt-4 text-base leading-relaxed text-text-primary">
        "{t.quote}"
      </blockquote>
      <div className="mt-5 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
          style={{ background: `${t.color}22`, color: t.color }}
        >
          {t.initials}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-text-primary">{t.name}</div>
          <div className="text-xs text-text-secondary">
            {t.role} — {t.company}
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest"
          style={{ background: `${t.color}1A`, color: t.color, border: `1px solid ${t.color}33` }}
        >
          {t.agent}
        </span>
      </div>
    </div>
  );
}
