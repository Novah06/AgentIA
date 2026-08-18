/**
 * Types du studio d'avant-chiffrage (Metria).
 * Un projet appartient à un propriétaire (compte Clerk ou "atelier-demo"
 * hors configuration), porte un statut de suivi et des documents d'entrée
 * (brief, plans, rendus 3D) qui alimenteront l'analyse IA.
 */

export type ProjectStatus = 'en_cours' | 'valide' | 'sans_suite' | 'termine';

export const PROJECT_STATUSES: ProjectStatus[] = ['en_cours', 'valide', 'sans_suite', 'termine'];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  en_cours: 'En cours',
  valide: 'Validé',
  sans_suite: 'Sans suite',
  termine: 'Terminé',
};

export interface StudioProject {
  id: string;
  ownerId: string;
  name: string;
  clientName: string | null;
  salon: string | null;
  city: string | null;
  surfaceM2: number | null;
  brief: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StudioDocument {
  id: string;
  projectId: string;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  storagePath: string | null;
  createdAt: string;
}

export interface NewProjectInput {
  name: string;
  clientName?: string;
  salon?: string;
  city?: string;
  surfaceM2?: number;
  brief?: string;
}

export interface ProjectPatch {
  name?: string;
  clientName?: string;
  salon?: string;
  city?: string;
  surfaceM2?: number | null;
  brief?: string;
  status?: ProjectStatus;
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === 'string' && (PROJECT_STATUSES as string[]).includes(value);
}

/* ------------------------------------------------------------------ */
/* Ressources IA : documents de référence du compte (anciens dossiers,
   tarifs fournisseurs, règles métier…) injectés dans chaque analyse.  */

export type SourceCategory = 'ancien_dossier' | 'fournisseur' | 'regle_metier' | 'autre';

export const SOURCE_CATEGORIES: SourceCategory[] = [
  'ancien_dossier',
  'fournisseur',
  'regle_metier',
  'autre',
];

export const SOURCE_CATEGORY_LABELS: Record<SourceCategory, string> = {
  ancien_dossier: 'Anciens dossiers',
  fournisseur: 'Fournisseurs & tarifs',
  regle_metier: 'Règles métier',
  autre: 'Autres documents',
};

export function isSourceCategory(value: unknown): value is SourceCategory {
  return typeof value === 'string' && (SOURCE_CATEGORIES as string[]).includes(value);
}

export type SourceStatus = 'traite' | 'en_attente' | 'erreur';

export interface StudioSource {
  id: string;
  ownerId: string;
  category: SourceCategory;
  fileName: string;
  fileType: string;
  sizeBytes: number;
  storagePath: string | null;
  /** Fiche d'extraction générée par l'IA (ou texte brut pour un fichier texte) */
  extractedText: string | null;
  status: SourceStatus;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* Analyse IA d'un projet                                              */

export type NiveauUrgence = 'haute' | 'moyenne' | 'basse';
export type NiveauRisque = 'faible' | 'moyen' | 'eleve';

export interface AnalysisResult {
  resume: string;
  prestations: PrestationLigne[];
  questions: {
    theme: string;
    question: string;
    urgence: NiveauUrgence;
  }[];
  risques: {
    description: string;
    hypothese: string | null;
    niveau: NiveauRisque;
    action: string | null;
  }[];
  prechiffrage: {
    lignes: ChiffrageLigne[];
    heures: {
      poste: string;
      heuresMin: number;
      heuresMax: number;
    }[];
    totalHtMin: number;
    totalHtMax: number;
    commentaire: string | null;
  };
  confianceGlobale: string;
}

export interface PrestationLigne {
  famille: string;
  designation: string;
  quantite: number | null;
  unite: string | null;
  source: string;
  fiabilite: Fiabilite;
  commentaire: string | null;
}

export interface ChiffrageLigne {
  designation: string;
  quantite: number | null;
  unite: string | null;
  coutHtMin: number;
  coutHtMax: number;
  base: string;
  fiabilite: Fiabilite;
}

/**
 * L'analyse se déroule en trois étapes courtes enchaînées par le navigateur.
 * Chaque étape reste bien en deçà de la durée maximale d'une fonction
 * serverless, et seule la première transmet les documents lourds : les
 * suivantes travaillent sur le résultat structuré de la précédente.
 */
export type AnalysisStep = 'contexte' | 'questions' | 'chiffrage';

export const ANALYSIS_STEPS: AnalysisStep[] = ['contexte', 'questions', 'chiffrage'];

export const ANALYSIS_STEP_LABELS: Record<AnalysisStep, string> = {
  contexte: 'Lecture du dossier et des plans',
  questions: 'Questions manquantes et risques',
  chiffrage: 'Préchiffrage et heures',
};

export type AnalysisStatus = 'pending' | 'done' | 'error';

/** Résultat partiel : les champs se remplissent au fil des étapes. */
export type PartialAnalysisResult = Partial<AnalysisResult>;

export function isAnalysisStep(value: unknown): value is AnalysisStep {
  return typeof value === 'string' && (ANALYSIS_STEPS as string[]).includes(value);
}

/** Une analyse est complète quand les trois étapes ont produit leur part. */
export function isAnalysisComplete(
  result: PartialAnalysisResult | null
): result is AnalysisResult {
  return (
    !!result &&
    typeof result.resume === 'string' &&
    Array.isArray(result.prestations) &&
    Array.isArray(result.questions) &&
    Array.isArray(result.risques) &&
    !!result.prechiffrage
  );
}

export interface StudioAnalysis {
  id: string;
  projectId: string;
  status: AnalysisStatus;
  /** Étapes déjà terminées, dans l'ordre d'exécution. */
  completedSteps: AnalysisStep[];
  model: string | null;
  result: PartialAnalysisResult | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// Fiabilité importée depuis la bibliothèque de prix pour cohérence
export type Fiabilite = 'confirme' | 'estime' | 'manquant';

/* ------------------------------------------------------------------ */
/* Chiffrage de travail : la version corrigée et validée par l'humain   */

export type LigneOrigine = 'ia' | 'humain';

export interface ChiffrageItem {
  id: string;
  famille: string;
  designation: string;
  quantite: number | null;
  unite: string | null;
  /** Coût de revient HT, en fourchette */
  coutHtMin: number;
  coutHtMax: number;
  /** Base de calcul reprise de l'analyse ou saisie par le chargé d'affaires */
  base: string;
  fiabilite: Fiabilite;
  /** Multiplicateur appliqué au coût pour obtenir le prix de vente */
  coefficient: number;
  /** Ligne relue et confirmée par un humain */
  valide: boolean;
  origine: LigneOrigine;
}

export interface HeureItem {
  id: string;
  poste: string;
  heuresMin: number;
  heuresMax: number;
  /** Taux horaire propre à la ligne (permet un taux de nuit, un sous-traitant…) */
  tauxHoraireHt: number;
  coefficient: number;
  valide: boolean;
  origine: LigneOrigine;
}

export interface StudioChiffrage {
  id: string;
  projectId: string;
  lignes: ChiffrageItem[];
  heures: HeureItem[];
  /** Valeurs par défaut appliquées aux nouvelles lignes */
  coefficientDefaut: number;
  tauxHoraireDefaut: number;
  commentaire: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChiffrageTotaux {
  coutMatiereMin: number;
  coutMatiereMax: number;
  coutMoMin: number;
  coutMoMax: number;
  coutTotalMin: number;
  coutTotalMax: number;
  venteMin: number;
  venteMax: number;
  margeMin: number;
  margeMax: number;
  /** Taux de marge sur prix de vente, en % (sur la fourchette basse) */
  tauxMargeMin: number;
  tauxMargeMax: number;
  lignesAValider: number;
}

/** Calcul unique des totaux, utilisé par l'écran et par l'export. */
export function calculerTotaux(chiffrage: StudioChiffrage): ChiffrageTotaux {
  let coutMatiereMin = 0;
  let coutMatiereMax = 0;
  let venteMin = 0;
  let venteMax = 0;

  for (const l of chiffrage.lignes) {
    coutMatiereMin += l.coutHtMin;
    coutMatiereMax += l.coutHtMax;
    venteMin += l.coutHtMin * l.coefficient;
    venteMax += l.coutHtMax * l.coefficient;
  }

  let coutMoMin = 0;
  let coutMoMax = 0;
  for (const h of chiffrage.heures) {
    const min = h.heuresMin * h.tauxHoraireHt;
    const max = h.heuresMax * h.tauxHoraireHt;
    coutMoMin += min;
    coutMoMax += max;
    venteMin += min * h.coefficient;
    venteMax += max * h.coefficient;
  }

  const coutTotalMin = coutMatiereMin + coutMoMin;
  const coutTotalMax = coutMatiereMax + coutMoMax;

  return {
    coutMatiereMin,
    coutMatiereMax,
    coutMoMin,
    coutMoMax,
    coutTotalMin,
    coutTotalMax,
    venteMin,
    venteMax,
    margeMin: venteMin - coutTotalMin,
    margeMax: venteMax - coutTotalMax,
    tauxMargeMin: venteMin > 0 ? ((venteMin - coutTotalMin) / venteMin) * 100 : 0,
    tauxMargeMax: venteMax > 0 ? ((venteMax - coutTotalMax) / venteMax) * 100 : 0,
    lignesAValider:
      chiffrage.lignes.filter((l) => !l.valide).length +
      chiffrage.heures.filter((h) => !h.valide).length,
  };
}
