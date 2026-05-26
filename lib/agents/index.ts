import { ARIA_PROMPT, NOVA_PROMPT, FELIX_PROMPT } from './prompts';

export type AgentId = 'aria' | 'nova' | 'felix';

export const AGENT_PROMPTS: Record<AgentId, string> = {
  aria: ARIA_PROMPT,
  nova: NOVA_PROMPT,
  felix: FELIX_PROMPT,
};

export interface AgentConfig {
  id: AgentId;
  name: string;
  fullName: string;
  domain: string;
  role: string;
  color: string;
  colorLight: string;
  description: string;
  welcomeMessage: string;
  quickActions: string[];
  pricing: { monthly: number; install: number };
  cdiEquivalent: string;
  missions: { icon: string; title: string }[];
  capabilities: string[];
  contextSummary: string;
  launchPack: { items: string[]; deliveryDelay: string };
}

export const PACK_LAUNCH_PRICE = 6500;
export const PACK_MONTHLY_PRICE = 6900;
export const PACK_LAUNCH_DETAILS = {
  items: [
    'Entretien de configuration global (2h avec votre équipe)',
    'Personnalisation complète des 3 agents sur votre entreprise',
    '15 tests de validation (5 par agent) sur vos données réelles',
    'Activation de votre espace client OperisAI avec les 3 agents',
    "Session d'onboarding (1h30 de prise en main)",
    "3 guides d'utilisation personnalisés (un par agent)",
    'Support prioritaire les 30 premiers jours',
    'Coordination inter-agents (ARIA, NOVA et FELIX partagent le contexte entreprise)',
  ],
  deliveryDelay: '5 à 7 jours ouvrés après signature',
};

export const AGENT_CONFIG: Record<AgentId, AgentConfig> = {
  aria: {
    id: 'aria',
    name: 'ARIA',
    fullName: 'ARIA Finance',
    domain: 'Finance & Comptabilité',
    role: 'Experte Financière & Conformité 2026',
    color: '#00e5ff',
    colorLight: '#EEEDFE',
    description: 'Experte Financière & Conformité 2026',
    welcomeMessage:
      "Bonjour ! Je suis ARIA, votre experte financière. Je suis prête à analyser vos données, préparer vos déclarations TVA, ou répondre à toutes vos questions comptables. Comment puis-je vous aider aujourd'hui ?",
    quickActions: [
      'Générer rapport du jour',
      'Analyser transactions',
      'Vérifier TVA',
    ],
    pricing: { monthly: 3500, install: 2500 },
    cdiEquivalent: 'Équivalent poste CDI : 45–60k€/an',
    missions: [
      { icon: '📊', title: 'Rapprochement bancaire quotidien' },
      { icon: '🧾', title: 'Traitement factures & TVA (dont TVA sur encaissements BTP)' },
      { icon: '⚡', title: 'Réforme e-invoicing 2026 (audit conformité, PPF/PDP)' },
      { icon: '💰', title: 'Prévision de trésorerie 13 semaines glissantes' },
      { icon: '🔍', title: "Détection d'anomalies bancaires quotidienne" },
      { icon: '📋', title: 'Rapport mensuel de clôture (livré le 5 du mois)' },
    ],
    capabilities: [
      'Chain-of-thought obligatoire sur chaque analyse',
      'Scratchpad financier structuré',
      'Vérification contradictoire sur décisions > seuil',
      '4 niveaux de certitude (certain, probable, à confirmer, escalade)',
      'Spécialiste TVA sur encaissements, auto-liquidation BTP, retenues de garantie',
    ],
    contextSummary:
      'Suit la trésorerie, la TVA et les anomalies bancaires de votre entreprise. Connaît votre régime fiscal et votre logiciel comptable.',
    launchPack: {
      items: [
        'Entretien de configuration (1h avec votre équipe)',
        "Personnalisation complète d'ARIA sur votre entreprise (secteur, régime fiscal, logiciels, interlocuteurs, seuils)",
        '5 tests de validation sur vos données réelles',
        'Activation de votre espace client OperisAI',
        "Session d'onboarding (1h de prise en main)",
        "Guide d'utilisation personnalisé",
        'Support prioritaire les 30 premiers jours',
      ],
      deliveryDelay: '3 à 5 jours ouvrés après signature',
    },
  },
  nova: {
    id: 'nova',
    name: 'NOVA',
    fullName: 'NOVA Talent',
    domain: 'Ressources Humaines',
    role: 'Experte Talent & Acquisition RH',
    color: '#3dffb0',
    colorLight: '#E1F5EE',
    description: 'Experte Talent & Acquisition RH',
    welcomeMessage:
      "Bonjour ! Je suis NOVA, votre experte RH. Je peux scorer vos candidatures, préparer un plan d'onboarding, vérifier la légalité d'une décision RH, ou piloter votre recrutement. Par quoi commençons-nous ?",
    quickActions: [
      'Scorer une candidature',
      'Vérifier une annonce',
      'Plan onboarding',
    ],
    pricing: { monthly: 2500, install: 1800 },
    cdiEquivalent: 'Équivalent poste CDI : 35–50k€/an',
    missions: [
      { icon: '🎯', title: 'Sourcing & scoring candidatures (/10 avec grille structurée)' },
      { icon: '📝', title: 'Rédaction des annonces (inclusives, RGPD, optimisées)' },
      { icon: '🤝', title: "Préparation et grille d'entretien RH (méthode STAR, notation /20)" },
      { icon: '📅', title: 'Onboarding J-15 → J+90 (DPAE, visite médicale, accès SI)' },
      { icon: '⚖️', title: "Protection juridique (discrimination, droit du travail, CCN)" },
      { icon: '📊', title: 'KPIs RH mensuels (turnover, time-to-hire, satisfaction)' },
    ],
    capabilities: [
      'Vérification anti-discrimination intégrée à chaque analyse',
      'Maîtrise CCN SYNTEC et principales conventions collectives',
      "Détection risques prud'homaux (licenciement verbal, prise d'acte)",
      'Grille scoring candidature objective et documentée',
      "Barème Macron appliqué aux calculs d'indemnités",
    ],
    contextSummary:
      "Pilote vos recrutements, onboardings et KPIs RH. Maîtrise la CCN applicable et les obligations légales.",
    launchPack: {
      items: [
        'Entretien de configuration (1h avec votre équipe)',
        'Personnalisation complète de NOVA sur votre entreprise (secteur, CCN applicable, postes prioritaires, canaux autorisés)',
        '5 tests de validation sur vos cas RH réels',
        'Activation de votre espace client OperisAI',
        "Session d'onboarding (1h de prise en main)",
        "Guide d'utilisation personnalisé",
        'Support prioritaire les 30 premiers jours',
      ],
      deliveryDelay: '3 à 5 jours ouvrés après signature',
    },
  },
  felix: {
    id: 'felix',
    name: 'FELIX',
    fullName: 'FELIX Office',
    domain: 'Office Management',
    role: 'Expert Administratif & BPO',
    color: '#f0c040',
    colorLight: '#FAEEDA',
    description: 'Expert Administratif & BPO',
    welcomeMessage:
      "Bonjour ! Je suis FELIX, votre office manager. Je surveille vos contrats, gère votre agenda, traite vos demandes administratives et vous alerte sur tout ce qui pourrait vous coûter cher si vous l'oubliez. Que puis-je faire pour vous ?",
    quickActions: [
      'Vérifier mes contrats',
      'Gérer mon agenda',
      'Analyser un email',
    ],
    pricing: { monthly: 1800, install: 1500 },
    cdiEquivalent: 'Équivalent poste CDI : 28–40k€/an',
    missions: [
      { icon: '📧', title: 'Traitement emails & courriers (matrice par catégorie, délais garantis)' },
      { icon: '📅', title: "Gestion d'agenda multi-dirigeants (3 créneaux, respect préférences)" },
      { icon: '🛒', title: 'Commandes & approvisionnement (dans limite budget autonome)' },
      { icon: '⏰', title: 'Alertes contrats & échéances (J-90, J-60, J-30, J-7)' },
      { icon: '🗂️', title: 'Gestion documentaire RGPD (durées légales, archivage)' },
      { icon: '🔍', title: 'Surveillance reconductions tacites (avec levier Data Act)' },
    ],
    capabilities: [
      'Matrice de priorité URGENT×IMPORTANT sur chaque tâche',
      "Scratchpad administratif avec calcul impact financier de l'inaction",
      "Refus absolu de répondre aux courriers d'avocats/huissiers",
      'Recherche proactive de preuves avant paiement litigieux',
      'Connaissance Data Act UE 2023/2854 comme levier de négociation',
    ],
    contextSummary:
      'Surveille contrats, agendas et courriers. Alerte sur tout risque administratif ou financier silencieux.',
    launchPack: {
      items: [
        'Entretien de configuration (1h avec votre équipe)',
        'Personnalisation complète de FELIX sur votre entreprise (prestataires, contrats actifs, budget autonome, préférences agenda)',
        '5 tests de validation sur vos données réelles',
        'Activation de votre espace client OperisAI',
        "Session d'onboarding (1h de prise en main)",
        "Guide d'utilisation personnalisé",
        'Support prioritaire les 30 premiers jours',
      ],
      deliveryDelay: '3 à 5 jours ouvrés après signature',
    },
  },
};

export interface ClientContext {
  companyName?: string;
  sector?: string;
  city?: string;
  employeeCount?: number;
  vatRegime?: string;
  accountingSoftware?: string;
  collectiveAgreement?: string;
  autonomyThreshold?: number;
}

export function buildSystemPrompt(agentId: AgentId, ctx: ClientContext): string {
  const base = AGENT_PROMPTS[agentId];
  return base
    .replace(/\[NOM_ENTREPRISE_CLIENTE\]/g, ctx.companyName || 'votre entreprise')
    .replace(/\[SECTEUR_ACTIVITE\]/g, ctx.sector || 'PME française')
    .replace(/\[VILLE\]/g, ctx.city || 'France')
    .replace(/\[SEUIL\]/g, ctx.autonomyThreshold ? `${ctx.autonomyThreshold}€` : '500€')
    .replace(/\[NOMBRE\] salariés/g, `${ctx.employeeCount ?? 25} salariés`);
}

export function isAgentId(value: unknown): value is AgentId {
  return value === 'aria' || value === 'nova' || value === 'felix';
}
