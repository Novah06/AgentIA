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

-- Ressources IA : documents de référence du compte injectés dans les analyses
create table if not exists studio_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  category text not null default 'autre'
    check (category in ('ancien_dossier', 'fournisseur', 'regle_metier', 'autre')),
  file_name text not null,
  file_type text not null,
  size_bytes integer not null default 0,
  storage_path text,
  extracted_text text,
  status text not null default 'en_attente'
    check (status in ('traite', 'en_attente', 'erreur')),
  created_at timestamptz default now()
);

create index if not exists idx_studio_sources_owner
  on studio_sources(owner_id, category);

-- Analyses IA générées pour chaque projet
create table if not exists studio_analyses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references studio_projects(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'done', 'error')),
  completed_steps text[] not null default '{}',
  model text,
  result jsonb,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migration pour une base déjà créée avec l'ancienne version :
alter table studio_analyses
  add column if not exists completed_steps text[] not null default '{}';
alter table studio_analyses
  add column if not exists updated_at timestamptz default now();
alter table studio_analyses drop constraint if exists studio_analyses_status_check;
alter table studio_analyses
  add constraint studio_analyses_status_check
  check (status in ('pending', 'done', 'error'));

create index if not exists idx_studio_analyses_project
  on studio_analyses(project_id, created_at desc);

-- Chiffrage de travail : la version corrigée et validée par le chargé d'affaires
create table if not exists studio_chiffrages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid unique references studio_projects(id) on delete cascade,
  lignes jsonb not null default '[]',
  heures jsonb not null default '[]',
  coefficient_defaut numeric not null default 2.5,
  taux_horaire_defaut numeric not null default 35,
  commentaire text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_studio_chiffrages_project
  on studio_chiffrages(project_id);

-- Profil d'entreprise : paramètres de chiffrage et règles métier du client
create table if not exists studio_profiles (
  owner_id text primary key,
  company_name text,
  settings jsonb not null default '{}',
  reponses jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
