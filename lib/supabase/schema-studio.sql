-- Metria — studio d'avant-chiffrage : projets et documents d'entrée
-- À exécuter dans l'éditeur SQL Supabase.
-- Créer également un bucket de storage PRIVÉ nommé 'studio-docs'
-- (Storage → New bucket → studio-docs, public désactivé).

create extension if not exists "pgcrypto";

create table if not exists studio_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  name text not null,
  client_name text,
  salon text,
  city text,
  surface_m2 numeric,
  brief text,
  status text not null default 'en_cours'
    check (status in ('en_cours', 'valide', 'sans_suite', 'termine')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_studio_projects_owner
  on studio_projects(owner_id, status);

create table if not exists studio_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references studio_projects(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  size_bytes integer not null default 0,
  storage_path text,
  created_at timestamptz default now()
);

create index if not exists idx_studio_documents_project
  on studio_documents(project_id);
