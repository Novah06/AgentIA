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
  prestations: {
    famille: string;
    designation: string;
    quantite: number | null;
    unite: string | null;
    source: string;
    fiabilite: Fiabilite;
    commentaire: string | null;
  }[];
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
    lignes: {
      designation: string;
      quantite: number | null;
      unite: string | null;
      coutHtMin: number;
      coutHtMax: number;
      base: string;
      fiabilite: Fiabilite;
    }[];
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

export interface StudioAnalysis {
  id: string;
  projectId: string;
  status: 'done' | 'error';
  model: string | null;
  result: AnalysisResult | null;
  error: string | null;
  createdAt: string;
}

// Fiabilité importée depuis la bibliothèque de prix pour cohérence
export type Fiabilite = 'confirme' | 'estime' | 'manquant';
