import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import type {
  NewProjectInput,
  ProjectPatch,
  StudioDocument,
  StudioProject,
} from './types';

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
};
const globalStore = globalThis as unknown as { __studioMemStore?: MemStore };
const mem: MemStore =
  globalStore.__studioMemStore ??
  (globalStore.__studioMemStore = { projects: new Map(), docs: new Map() });
const memProjects = mem.projects;
const memDocs = mem.docs;

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
