import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import type {
  AnalysisStep,
  ChiffrageItem,
  HeureItem,
  StudioChiffrage,
  NewProjectInput,
  PartialAnalysisResult,
  ProjectPatch,
  SourceCategory,
  SourceStatus,
  StudioAnalysis,
  StudioDocument,
  StudioProject,
  StudioSource,
} from './types';
import { isAnalysisComplete } from './types';
import { emptyProfile, SETTINGS_DEFAUT } from './profile';
import type { ProfileSettings, StudioProfile } from './profile';

/**
 * Couche de données du studio.
 * Avec Supabase configuré : tables `studio_projects` / `studio_documents`
 * (voir lib/supabase/schema-studio.sql) et bucket de storage `studio-docs`.
 * Sans Supabase : stockage en mémoire, suffisant pour tester l'interface en
 * local (les données disparaissent au redémarrage du serveur).
 */

// Le stockage mémoire est ancré sur globalThis : Next.js bundle chaque route
// séparément, une simple variable de module donnerait une Map différente par
// route (projet créé puis introuvable depuis une autre route).
type MemStore = {
  projects: Map<string, StudioProject>;
  docs: Map<string, StudioDocument & { data: Buffer }>;
  sources: Map<string, StudioSource & { data: Buffer }>;
  analyses: Map<string, StudioAnalysis>;
  chiffrages: Map<string, StudioChiffrage>;
  profiles: Map<string, StudioProfile>;
};
const globalStore = globalThis as unknown as { __studioMemStore?: MemStore };
const mem: MemStore =
  globalStore.__studioMemStore ??
  (globalStore.__studioMemStore = {
    projects: new Map(),
    docs: new Map(),
    sources: new Map(),
    analyses: new Map(),
    chiffrages: new Map(),
    profiles: new Map(),
  });
const memProjects = mem.projects;
const memDocs = mem.docs;
const memSources = mem.sources;
const memAnalyses = mem.analyses;
const memChiffrages = mem.chiffrages;
const memProfiles = mem.profiles;

const STORAGE_BUCKET = 'studio-docs';

function nowIso() {
  return new Date().toISOString();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProject(row: any): StudioProject {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    clientName: row.client_name,
    salon: row.salon,
    city: row.city,
    surfaceM2: row.surface_m2 === null ? null : Number(row.surface_m2),
    brief: row.brief,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocument(row: any): StudioDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    fileType: row.file_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listProjects(ownerId: string): Promise<StudioProject[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return [...memProjects.values()]
      .filter((p) => p.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  const { data, error } = await sb
    .from('studio_projects')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProject);
}

export async function createProject(
  ownerId: string,
  input: NewProjectInput
): Promise<StudioProject> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const project: StudioProject = {
      id: randomUUID(),
      ownerId,
      name: input.name,
      clientName: input.clientName ?? null,
      salon: input.salon ?? null,
      city: input.city ?? null,
      surfaceM2: input.surfaceM2 ?? null,
      brief: input.brief ?? null,
      status: 'en_cours',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    memProjects.set(project.id, project);
    return project;
  }
  const { data, error } = await sb
    .from('studio_projects')
    .insert({
      owner_id: ownerId,
      name: input.name,
      client_name: input.clientName ?? null,
      salon: input.salon ?? null,
      city: input.city ?? null,
      surface_m2: input.surfaceM2 ?? null,
      brief: input.brief ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapProject(data);
}

export async function getProject(
  ownerId: string,
  id: string
): Promise<StudioProject | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const project = memProjects.get(id);
    return project && project.ownerId === ownerId ? project : null;
  }
  const { data, error } = await sb
    .from('studio_projects')
    .select('*')
    .eq('id', id)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProject(data) : null;
}

export async function updateProject(
  ownerId: string,
  id: string,
  patch: ProjectPatch
): Promise<StudioProject | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const project = memProjects.get(id);
    if (!project || project.ownerId !== ownerId) return null;
    const updated: StudioProject = {
      ...project,
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.clientName !== undefined && { clientName: patch.clientName }),
      ...(patch.salon !== undefined && { salon: patch.salon }),
      ...(patch.city !== undefined && { city: patch.city }),
      ...(patch.surfaceM2 !== undefined && { surfaceM2: patch.surfaceM2 }),
      ...(patch.brief !== undefined && { brief: patch.brief }),
      ...(patch.status !== undefined && { status: patch.status }),
      updatedAt: nowIso(),
    };
    memProjects.set(id, updated);
    return updated;
  }
  const row: Record<string, unknown> = { updated_at: nowIso() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.clientName !== undefined) row.client_name = patch.clientName;
  if (patch.salon !== undefined) row.salon = patch.salon;
  if (patch.city !== undefined) row.city = patch.city;
  if (patch.surfaceM2 !== undefined) row.surface_m2 = patch.surfaceM2;
  if (patch.brief !== undefined) row.brief = patch.brief;
  if (patch.status !== undefined) row.status = patch.status;
  const { data, error } = await sb
    .from('studio_projects')
    .update(row)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProject(data) : null;
}

export async function deleteProject(ownerId: string, id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const project = memProjects.get(id);
    if (!project || project.ownerId !== ownerId) return false;
    memProjects.delete(id);
    for (const [docId, doc] of memDocs) {
      if (doc.projectId === id) memDocs.delete(docId);
    }
    return true;
  }
  const { error, count } = await sb
    .from('studio_projects')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('owner_id', ownerId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function listDocuments(projectId: string): Promise<StudioDocument[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return [...memDocs.values()]
      .filter((d) => d.projectId === projectId)
      .map(({ data: _data, ...doc }) => doc)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  const { data, error } = await sb
    .from('studio_documents')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDocument);
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
}

export async function addDocument(
  ownerId: string,
  projectId: string,
  file: { name: string; type: string; buffer: Buffer }
): Promise<StudioDocument> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const doc: StudioDocument & { data: Buffer } = {
      id: randomUUID(),
      projectId,
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      sizeBytes: file.buffer.length,
      storagePath: null,
      createdAt: nowIso(),
      data: file.buffer,
    };
    memDocs.set(doc.id, doc);
    const { data: _data, ...publicDoc } = doc;
    return publicDoc;
  }
  const path = `${ownerId}/${projectId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(path, file.buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) throw new Error(`Storage : ${uploadError.message}`);
  const { data, error } = await sb
    .from('studio_documents')
    .insert({
      project_id: projectId,
      file_name: file.name,
      file_type: file.type || 'application/octet-stream',
      size_bytes: file.buffer.length,
      storage_path: path,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapDocument(data);
}

/**
 * Récupère le contenu binaire d'un document (pour l'analyse IA à venir).
 */
export async function getDocumentData(
  projectId: string,
  documentId: string
): Promise<{ doc: StudioDocument; data: Buffer } | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const doc = memDocs.get(documentId);
    if (!doc || doc.projectId !== projectId) return null;
    const { data, ...publicDoc } = doc;
    return { doc: publicDoc, data };
  }
  const { data: row, error } = await sb
    .from('studio_documents')
    .select('*')
    .eq('id', documentId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row || !row.storage_path) return null;
  const { data: blob, error: dlError } = await sb.storage
    .from(STORAGE_BUCKET)
    .download(row.storage_path);
  if (dlError || !blob) return null;
  return { doc: mapDocument(row), data: Buffer.from(await blob.arrayBuffer()) };
}

/* ------------------------------------------------------------------ */
/* Ressources IA (sources)                                             */

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSource(row: any): StudioSource {
  return {
    id: row.id,
    ownerId: row.owner_id,
    category: row.category,
    fileName: row.file_name,
    fileType: row.file_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    extractedText: row.extracted_text,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapAnalysis(row: any): StudioAnalysis {
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    completedSteps: row.completed_steps ?? [],
    model: row.model,
    result: row.result,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function listSources(ownerId: string): Promise<StudioSource[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return [...memSources.values()]
      .filter((s) => s.ownerId === ownerId)
      .map(({ data: _data, ...source }) => source)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  const { data, error } = await sb
    .from('studio_sources')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSource);
}

export async function addSource(
  ownerId: string,
  input: {
    category: SourceCategory;
    name: string;
    type: string;
    buffer: Buffer;
    extractedText: string | null;
    status: SourceStatus;
  }
): Promise<StudioSource> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const source: StudioSource & { data: Buffer } = {
      id: randomUUID(),
      ownerId,
      category: input.category,
      fileName: input.name,
      fileType: input.type || 'application/octet-stream',
      sizeBytes: input.buffer.length,
      storagePath: null,
      extractedText: input.extractedText,
      status: input.status,
      createdAt: nowIso(),
      data: input.buffer,
    };
    memSources.set(source.id, source);
    const { data: _data, ...publicSource } = source;
    return publicSource;
  }
  const path = `${ownerId}/_sources/${Date.now()}-${sanitizeFileName(input.name)}`;
  const { error: uploadError } = await sb.storage
    .from(STORAGE_BUCKET)
    .upload(path, input.buffer, {
      contentType: input.type || 'application/octet-stream',
      upsert: false,
    });
  if (uploadError) throw new Error(`Storage : ${uploadError.message}`);
  const { data, error } = await sb
    .from('studio_sources')
    .insert({
      owner_id: ownerId,
      category: input.category,
      file_name: input.name,
      file_type: input.type || 'application/octet-stream',
      size_bytes: input.buffer.length,
      storage_path: path,
      extracted_text: input.extractedText,
      status: input.status,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapSource(data);
}

export async function updateSource(
  ownerId: string,
  id: string,
  patch: { extractedText?: string | null; status?: SourceStatus }
): Promise<StudioSource | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const source = memSources.get(id);
    if (!source || source.ownerId !== ownerId) return null;
    if (patch.extractedText !== undefined) source.extractedText = patch.extractedText;
    if (patch.status !== undefined) source.status = patch.status;
    const { data: _data, ...publicSource } = source;
    return publicSource;
  }
  const row: Record<string, unknown> = {};
  if (patch.extractedText !== undefined) row.extracted_text = patch.extractedText;
  if (patch.status !== undefined) row.status = patch.status;
  const { data, error } = await sb
    .from('studio_sources')
    .update(row)
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapSource(data) : null;
}

export async function deleteSource(ownerId: string, id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const source = memSources.get(id);
    if (!source || source.ownerId !== ownerId) return false;
    memSources.delete(id);
    return true;
  }
  const { data, error } = await sb
    .from('studio_sources')
    .delete()
    .eq('id', id)
    .eq('owner_id', ownerId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.storage_path) {
    await sb.storage.from(STORAGE_BUCKET).remove([data.storage_path]);
  }
  return !!data;
}

/** Contenu binaire d'une source (pour l'extraction IA à l'upload). */
export async function getSourceData(
  ownerId: string,
  sourceId: string
): Promise<{ source: StudioSource; data: Buffer } | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const source = memSources.get(sourceId);
    if (!source || source.ownerId !== ownerId) return null;
    const { data, ...publicSource } = source;
    return { source: publicSource, data };
  }
  const { data: row, error } = await sb
    .from('studio_sources')
    .select('*')
    .eq('id', sourceId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row || !row.storage_path) return null;
  const { data: blob, error: dlError } = await sb.storage
    .from(STORAGE_BUCKET)
    .download(row.storage_path);
  if (dlError || !blob) return null;
  return { source: mapSource(row), data: Buffer.from(await blob.arrayBuffer()) };
}

/* ------------------------------------------------------------------ */
/* Analyses IA                                                         */

/** Crée une analyse vide en attente, point de départ des trois étapes. */
export async function createAnalysis(
  projectId: string,
  model: string
): Promise<StudioAnalysis> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const analysis: StudioAnalysis = {
      id: randomUUID(),
      projectId,
      status: 'pending',
      completedSteps: [],
      model,
      result: {},
      error: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    memAnalyses.set(analysis.id, analysis);
    return analysis;
  }
  const { data, error } = await sb
    .from('studio_analyses')
    .insert({
      project_id: projectId,
      status: 'pending',
      completed_steps: [],
      model,
      result: {},
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapAnalysis(data);
}

/**
 * Fusionne le résultat d'une étape dans l'analyse en cours.
 * Le statut passe à 'done' dès que les trois étapes sont enregistrées.
 */
export async function applyAnalysisStep(
  analysisId: string,
  step: AnalysisStep,
  partial: PartialAnalysisResult
): Promise<StudioAnalysis | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const analysis = memAnalyses.get(analysisId);
    if (!analysis) return null;
    const steps = analysis.completedSteps.includes(step)
      ? analysis.completedSteps
      : [...analysis.completedSteps, step];
    const merged = { ...(analysis.result ?? {}), ...partial };
    const updated: StudioAnalysis = {
      ...analysis,
      completedSteps: steps,
      result: merged,
      status: isAnalysisComplete(merged) ? 'done' : 'pending',
      error: null,
      updatedAt: nowIso(),
    };
    memAnalyses.set(analysisId, updated);
    return updated;
  }
  const { data: current, error: readError } = await sb
    .from('studio_analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  if (!current) return null;

  const previousSteps: AnalysisStep[] = current.completed_steps ?? [];
  const steps = previousSteps.includes(step) ? previousSteps : [...previousSteps, step];
  const merged = { ...(current.result ?? {}), ...partial };

  const { data, error } = await sb
    .from('studio_analyses')
    .update({
      completed_steps: steps,
      result: merged,
      status: isAnalysisComplete(merged) ? 'done' : 'pending',
      error: null,
      updated_at: nowIso(),
    })
    .eq('id', analysisId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAnalysis(data) : null;
}

/** Marque l'analyse en échec, en conservant les étapes déjà obtenues. */
export async function failAnalysis(
  analysisId: string,
  message: string
): Promise<StudioAnalysis | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const analysis = memAnalyses.get(analysisId);
    if (!analysis) return null;
    const updated: StudioAnalysis = {
      ...analysis,
      status: 'error',
      error: message,
      updatedAt: nowIso(),
    };
    memAnalyses.set(analysisId, updated);
    return updated;
  }
  const { data, error } = await sb
    .from('studio_analyses')
    .update({ status: 'error', error: message, updated_at: nowIso() })
    .eq('id', analysisId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAnalysis(data) : null;
}

export async function getAnalysis(analysisId: string): Promise<StudioAnalysis | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return memAnalyses.get(analysisId) ?? null;
  const { data, error } = await sb
    .from('studio_analyses')
    .select('*')
    .eq('id', analysisId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAnalysis(data) : null;
}

export async function getLatestAnalysis(projectId: string): Promise<StudioAnalysis | null> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return (
      [...memAnalyses.values()]
        .filter((a) => a.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
    );
  }
  const { data, error } = await sb
    .from('studio_analyses')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapAnalysis(data) : null;
}

/* ------------------------------------------------------------------ */
/* Chiffrage de travail                                                */

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapChiffrage(row: any): StudioChiffrage {
  return {
    id: row.id,
    projectId: row.project_id,
    lignes: row.lignes ?? [],
    heures: row.heures ?? [],
    coefficientDefaut: Number(row.coefficient_defaut ?? 2.5),
    tauxHoraireDefaut: Number(row.taux_horaire_defaut ?? 35),
    commentaire: row.commentaire,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getChiffrage(projectId: string): Promise<StudioChiffrage | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return memChiffrages.get(projectId) ?? null;
  const { data, error } = await sb
    .from('studio_chiffrages')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapChiffrage(data) : null;
}

/** Crée ou remplace le chiffrage de travail d'un projet. */
export async function saveChiffrage(
  projectId: string,
  input: {
    lignes: ChiffrageItem[];
    heures: HeureItem[];
    coefficientDefaut: number;
    tauxHoraireDefaut: number;
    commentaire: string | null;
  }
): Promise<StudioChiffrage> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const existing = memChiffrages.get(projectId);
    const chiffrage: StudioChiffrage = {
      id: existing?.id ?? randomUUID(),
      projectId,
      ...input,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    memChiffrages.set(projectId, chiffrage);
    return chiffrage;
  }
  const { data, error } = await sb
    .from('studio_chiffrages')
    .upsert(
      {
        project_id: projectId,
        lignes: input.lignes,
        heures: input.heures,
        coefficient_defaut: input.coefficientDefaut,
        taux_horaire_defaut: input.tauxHoraireDefaut,
        commentaire: input.commentaire,
        updated_at: nowIso(),
      },
      { onConflict: 'project_id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapChiffrage(data);
}

/** Supprime un document du projet, en base et dans le stockage. */
export async function deleteDocument(projectId: string, documentId: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const doc = memDocs.get(documentId);
    if (!doc || doc.projectId !== projectId) return false;
    memDocs.delete(documentId);
    return true;
  }
  const { data, error } = await sb
    .from('studio_documents')
    .delete()
    .eq('id', documentId)
    .eq('project_id', projectId)
    .select()
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.storage_path) {
    await sb.storage.from(STORAGE_BUCKET).remove([data.storage_path]);
  }
  return !!data;
}

/** Historique des analyses d'un projet, la plus récente en premier. */
export async function listAnalyses(
  projectId: string,
  limit = 10
): Promise<StudioAnalysis[]> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return [...memAnalyses.values()]
      .filter((a) => a.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }
  const { data, error } = await sb
    .from('studio_analyses')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAnalysis);
}

/* ------------------------------------------------------------------ */
/* Profil d'entreprise                                                 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProfile(row: any): StudioProfile {
  return {
    ownerId: row.owner_id,
    companyName: row.company_name,
    settings: { ...SETTINGS_DEFAUT, ...(row.settings ?? {}) },
    reponses: row.reponses ?? {},
    updatedAt: row.updated_at ?? row.created_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getProfile(ownerId: string): Promise<StudioProfile> {
  const sb = getSupabaseAdmin();
  if (!sb) return memProfiles.get(ownerId) ?? emptyProfile(ownerId);
  const { data, error } = await sb
    .from('studio_profiles')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProfile(data) : emptyProfile(ownerId);
}

export async function saveProfile(
  ownerId: string,
  input: {
    companyName: string | null;
    settings: ProfileSettings;
    reponses: Record<string, string>;
  }
): Promise<StudioProfile> {
  const sb = getSupabaseAdmin();
  if (!sb) {
    const profile: StudioProfile = {
      ownerId,
      ...input,
      updatedAt: nowIso(),
    };
    memProfiles.set(ownerId, profile);
    return profile;
  }
  const { data, error } = await sb
    .from('studio_profiles')
    .upsert(
      {
        owner_id: ownerId,
        company_name: input.companyName,
        settings: input.settings,
        reponses: input.reponses,
        updated_at: nowIso(),
      },
      { onConflict: 'owner_id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapProfile(data);
}
