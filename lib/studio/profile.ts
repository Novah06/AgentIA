/**
 * Profil d'entreprise : les paramètres et le savoir-faire propres à chaque
 * client de Metria. Alimente à la fois les valeurs par défaut du chiffrage
 * et le prompt système de l'analyse — c'est ce qui fait qu'un même dossier
 * n'est pas chiffré pareil chez deux entreprises différentes.
 */

export interface ProfileSettings {
  /** Multiplicateur coût → prix de vente appliqué par défaut */
  coefficientDefaut: number;
  /** Coefficient appliqué à la main d'œuvre si différent */
  coefficientMainOeuvre: number | null;
  tauxHoraireAtelier: number;
  tauxHoraireMontage: number;
  /** Majoration appliquée au travail de nuit, en % */
  majorationNuitPct: number | null;
  /** Perte matière habituelle, en % */
  tauxChutePct: number;
}

export const SETTINGS_DEFAUT: ProfileSettings = {
  coefficientDefaut: 2.5,
  coefficientMainOeuvre: null,
  tauxHoraireAtelier: 35,
  tauxHoraireMontage: 35,
  majorationNuitPct: null,
  tauxChutePct: 15,
};

export interface SettingField {
  key: keyof ProfileSettings;
  label: string;
  suffix: string;
  aide: string;
  optionnel?: boolean;
}

export const SETTING_FIELDS: SettingField[] = [
  {
    key: 'coefficientDefaut',
    label: 'Coefficient de vente',
    suffix: '×',
    aide: "Multiplicateur appliqué au coût de revient pour obtenir le prix de vente. Un coefficient de 2,5 signifie qu'une fourniture achetée 100 € est vendue 250 €. C'est la valeur proposée par défaut sur chaque nouvelle ligne de chiffrage.",
  },
  {
    key: 'coefficientMainOeuvre',
    label: "Coefficient main d'œuvre",
    suffix: '×',
    optionnel: true,
    aide: "Si vous appliquez un coefficient différent sur les heures que sur les fournitures, indiquez-le ici. Laissez vide pour utiliser le coefficient de vente général.",
  },
  {
    key: 'tauxHoraireAtelier',
    label: 'Taux horaire atelier',
    suffix: '€ HT/h',
    aide: "Coût horaire réel d'une heure d'atelier (fabrication, préparation), charges comprises. Sert à valoriser les heures estimées par l'analyse.",
  },
  {
    key: 'tauxHoraireMontage',
    label: 'Taux horaire montage',
    suffix: '€ HT/h',
    aide: "Coût horaire d'une heure sur site (montage, démontage). Souvent supérieur au taux atelier à cause des déplacements et des contraintes de salon.",
  },
  {
    key: 'majorationNuitPct',
    label: 'Majoration travail de nuit',
    suffix: '%',
    optionnel: true,
    aide: "Pourcentage ajouté aux taux horaires quand le montage se fait de nuit. Exemple : 25 pour +25 %. L'analyse en tiendra compte si le dossier mentionne un montage nocturne.",
  },
  {
    key: 'tauxChutePct',
    label: 'Taux de chute matière',
    suffix: '%',
    aide: "Perte matière habituelle lors de la découpe. Exemple : 15 signifie qu'il faut acheter 115 m² de panneau pour 100 m² posés. Varie selon les matières et le type de découpe.",
  },
];

/* ------------------------------------------------------------------ */
/* Règles métier — questions issues du plan d'action                   */

export interface BusinessQuestion {
  key: string;
  theme: string;
  question: string;
  aide: string;
  exemple: string;
}

export const BUSINESS_QUESTIONS: BusinessQuestion[] = [
  {
    key: 'cloisons',
    theme: 'Fabrication',
    question: 'Comment estimez-vous une cloison selon sa hauteur et sa finition ?',
    aide: "Décrivez votre méthode : temps de fabrication au mètre linéaire, seuils de hauteur qui changent la structure, surcoût selon la finition. L'analyse s'en servira pour estimer les cloisons de chaque dossier.",
    exemple:
      "Ex. : cloison droite jusqu'à 2,50 m : 0,5 h/ml en atelier. Au-delà de 3 m, ossature renforcée et +30 % de temps. Finition peinte : +0,2 h/m². Impression : sous-traitée.",
  },
  {
    key: 'sur_mesure',
    theme: 'Fabrication',
    question: 'Comment estimez-vous un comptoir ou un élément sur mesure ?',
    aide: 'Indiquez vos temps de référence et ce qui les fait varier : forme droite ou courbe, présence de rangements, plan de travail, éclairage intégré.',
    exemple:
      'Ex. : comptoir droit 2 m : 12 h atelier. Version courbe : ×1,6. Avec réserve fermée et étagères : +6 h.',
  },
  {
    key: 'finitions_couteuses',
    theme: 'Fabrication',
    question: 'Quelles finitions augmentent fortement le temps atelier ?',
    aide: "Listez les finitions qui font déraper les heures. L'analyse pourra alerter dès qu'un dossier en comporte.",
    exemple:
      'Ex. : laque brillante (ponçage + plusieurs couches), placage bois, angles arrondis, découpes CNC complexes.',
  },
  {
    key: 'transport',
    theme: 'Logistique',
    question: 'Comment calculez-vous le transport et la manutention ?',
    aide: 'Forfait, prix au kilomètre, volume de camion, sous-traitance ? Précisez aussi les seuils de déclenchement.',
    exemple:
      'Ex. : camion 20 m³ aller-retour Île-de-France : 450 € HT. Au-delà de 300 km : 1,20 €/km. Nacelle : 180 €/jour.',
  },
  {
    key: 'equipe',
    theme: 'Montage',
    question: 'À partir de quand prévoyez-vous un chef d’équipe ou du renfort ?',
    aide: "Indiquez vos seuils : surface, hauteur, durée de montage, complexité. L'analyse dimensionnera l'équipe en conséquence.",
    exemple:
      'Ex. : au-delà de 50 m², un chef d’équipe. Au-delà de 100 m² ou 4 m de haut, deux équipes et une nacelle.',
  },
  {
    key: 'contraintes_salon',
    theme: 'Salon',
    question: 'Quelles contraintes de salon font le plus augmenter vos coûts ?',
    aide: "Les règlements et conditions d'accès qui coûtent cher. L'analyse les signalera comme risques dès qu'elles apparaissent.",
    exemple:
      'Ex. : montage de nuit imposé, accès sans quai, badges payants, obligation de passer par le manutentionnaire officiel, classement feu M1.',
  },
  {
    key: 'oublis',
    theme: 'Vigilance',
    question: 'Quels postes sont presque toujours oubliés dans un premier budget ?',
    aide: "Vos oublis récurrents. C'est ce qui aidera le plus l'outil à éviter les mauvaises surprises.",
    exemple:
      'Ex. : électricité de puissance, nettoyage final, stockage entre deux salons, retouches sur site, consommables de montage.',
  },
  {
    key: 'projet_risque',
    theme: 'Vigilance',
    question: 'À quoi reconnaissez-vous un projet à risque ?',
    aide: 'Les signaux qui vous font redoubler de prudence sur un dossier.',
    exemple:
      'Ex. : brief sans plan coté, délai inférieur à trois semaines, client qui a changé de prestataire, validation graphique tardive.',
  },
  {
    key: 'derives',
    theme: 'Vigilance',
    question: 'Quelles modifications client entraînent le plus de surcoûts ?',
    aide: 'Les changements en cours de projet qui coûtent le plus cher, pour que le risque soit anticipé dès le chiffrage.',
    exemple:
      'Ex. : changement de coloris après lancement fabrication, ajout de réserve, modification du sens d’ouverture, agrandissement d’enseigne.',
  },
  {
    key: 'reemploi',
    theme: 'Réemploi',
    question: 'Quels éléments réutilisez-vous d’un salon à l’autre ?',
    aide: "Votre parc réutilisable et vos règles d'amortissement. L'analyse pourra proposer du réemploi plutôt que du neuf.",
    exemple:
      'Ex. : structures alu et cloisons modulaires (parc interne), mobilier loué, enseignes refaites à chaque fois.',
  },
  {
    key: 'fournisseurs',
    theme: 'Achats',
    question: 'Quels sont vos fournisseurs habituels et pour quoi ?',
    aide: 'Qui fournit quoi, et les délais associés. Utile pour situer les prix et repérer un poste sous-traité.',
    exemple:
      'Ex. : panneaux et PMMA chez X (48 h), impression grand format chez Y (5 jours), mobilier loué chez Z.',
  },
  {
    key: 'particularites',
    theme: 'Divers',
    question: 'Autre chose qu’un nouveau chargé d’affaires devrait savoir ?',
    aide: "Tout ce qui n'entre pas dans les cases précédentes : spécificités d'atelier, clients types, méthodes maison.",
    exemple:
      'Ex. : nous ne faisons pas de structures autoportantes au-delà de 4 m, nous refusons les délais sous 10 jours.',
  },
];

export interface StudioProfile {
  ownerId: string;
  companyName: string | null;
  settings: ProfileSettings;
  /** Réponses aux questions métier, indexées par `BusinessQuestion.key` */
  reponses: Record<string, string>;
  updatedAt: string;
}

export function emptyProfile(ownerId: string): StudioProfile {
  return {
    ownerId,
    companyName: null,
    settings: { ...SETTINGS_DEFAUT },
    reponses: {},
    updatedAt: new Date().toISOString(),
  };
}

/** Rend le profil sous forme de texte injectable dans le prompt système. */
export function profileToPrompt(profile: StudioProfile): string {
  const s = profile.settings;
  const lignes: string[] = [
    `Coefficient de vente habituel : ${s.coefficientDefaut} (coût de revient × coefficient = prix de vente).`,
    s.coefficientMainOeuvre
      ? `Coefficient appliqué à la main d'œuvre : ${s.coefficientMainOeuvre}.`
      : '',
    `Taux horaire atelier : ${s.tauxHoraireAtelier} € HT/h. Taux horaire montage : ${s.tauxHoraireMontage} € HT/h.`,
    s.majorationNuitPct ? `Majoration travail de nuit : +${s.majorationNuitPct} %.` : '',
    `Taux de chute matière habituel : ${s.tauxChutePct} %.`,
  ].filter(Boolean);

  const reponses = BUSINESS_QUESTIONS.filter((q) => profile.reponses[q.key]?.trim()).map(
    (q) => `### ${q.question}\n${profile.reponses[q.key].trim()}`
  );

  const parts = [
    profile.companyName ? `Entreprise : ${profile.companyName}.` : '',
    '',
    '### Paramètres de chiffrage de cette entreprise',
    ...lignes,
  ];

  if (reponses.length > 0) {
    parts.push(
      '',
      "### Règles métier de cette entreprise (à appliquer en priorité sur toute règle générale)",
      ...reponses
    );
  }

  return parts.filter((p) => p !== undefined).join('\n');
}
