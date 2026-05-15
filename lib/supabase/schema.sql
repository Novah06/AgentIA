-- SynapseAI Workforce — Supabase schema

create extension if not exists "pgcrypto";

create table if not exists client_profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  company_name text,
  sector text,
  city text,
  employee_count integer,
  vat_regime text,
  accounting_software text,
  collective_agreement text,
  autonomy_threshold integer default 500,
  active_agents text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_profiles(id) on delete cascade,
  agent_id text not null,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null,
  content text not null,
  files jsonb,
  created_at timestamptz default now()
);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_profiles(id) on delete cascade,
  agent_id text not null,
  action_type text,
  summary text,
  amount decimal,
  created_at timestamptz default now()
);

create table if not exists uploaded_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client_profiles(id) on delete cascade,
  agent_id text not null,
  file_name text not null,
  file_type text not null,
  storage_path text not null,
  extracted_content text,
  created_at timestamptz default now()
);

create index if not exists idx_conversations_client on conversations(client_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_agent_logs_client on agent_logs(client_id, agent_id);
