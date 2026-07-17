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
