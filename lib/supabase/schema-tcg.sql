-- Portefeuille de produits Pokémon — catalogue FR, cotes, items et courbes.
-- À exécuter dans l'éditeur SQL Supabase.
--
-- Deux familles de tables :
--  * le CATALOGUE et les COTES (tcg_sets, tcg_cards, tcg_sealed, tcg_prices)
--    sont communs à tous les comptes et alimentés par les bots ;
--  * le PORTEFEUILLE (tcg_items, tcg_snapshots, tcg_scans) appartient à un
--    propriétaire (identifiant Clerk, ou « collection-demo » hors Clerk).

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------
-- Catalogue

create table if not exists tcg_sets (
  id text primary key,                    -- identifiant TCGdex : « sv08 »
  serie text not null default 'Autres',   -- bloc : « Écarlate et Violet »
  name_fr text not null,
  name_en text,
  code text,
  release_date date,
  card_count integer,
  logo_url text,
  symbol_url text,
  updated_at timestamptz default now()
);

create index if not exists idx_tcg_sets_release on tcg_sets(release_date desc);

create table if not exists tcg_cards (
  id text primary key,                    -- « sv08-238 »
  set_id text references tcg_sets(id) on delete cascade,
  number text not null,
  name_fr text not null,
  name_en text,
  rarity text,
  illustrator text,
  image_url text,
  variants text[] not null default '{normale}',
  updated_at timestamptz default now()
);

create index if not exists idx_tcg_cards_set on tcg_cards(set_id, number);
-- Recherche par nom : l'interface interroge en « contient », insensible à la casse.
create index if not exists idx_tcg_cards_name on tcg_cards(lower(name_fr) text_pattern_ops);

create table if not exists tcg_sealed (
  id text primary key,                    -- « sc-ev08-display »
  set_id text references tcg_sets(id) on delete set null,
  kind text not null default 'display'
    check (kind in ('display','etb','coffret','booster','tripack','bundle','premium','blister')),
  name_fr text not null,
  release_date date,
  image_url text,
  booster_count integer,
  updated_at timestamptz default now()
);

create index if not exists idx_tcg_sealed_set on tcg_sealed(set_id);

-- --------------------------------------------------------------------
-- Cotes : une ligne par référence et par relevé (00 h et 12 h)

create table if not exists tcg_prices (
  id uuid primary key default gen_random_uuid(),
  ref_type text not null check (ref_type in ('carte','scelle')),
  ref_id text not null,
  variant text check (variant in ('normale','reverse','holo','promo')),
  price_eur numeric(12,2) not null,
  low_eur numeric(12,2),
  trend_eur numeric(12,2),
  source text not null default 'inconnue',
  captured_at timestamptz not null default now()
);

-- Index principal : « dernier prix connu de cette référence » et historique.
create index if not exists idx_tcg_prices_ref on tcg_prices(ref_id, captured_at desc);
-- Un seul relevé par référence, variante et instant : relancer un bot ne
-- duplique pas les points de la courbe.
create unique index if not exists idx_tcg_prices_unique
  on tcg_prices(ref_id, coalesce(variant, ''), captured_at);

-- --------------------------------------------------------------------
-- Portefeuille

create table if not exists tcg_items (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  kind text not null check (kind in ('loose','gradee','scelle')),
  ref_id text not null,
  variant text check (variant in ('normale','reverse','holo','promo')),
  condition text check (condition in ('MT','NM','EX','GD','LP','PL','PO')),
  grading_company text check (grading_company in ('PSA','PCA','BGS','CGC','AFG')),
  grade numeric(3,1) check (grade is null or (grade >= 1 and grade <= 10)),
  quantity integer not null default 1 check (quantity > 0),
  purchase_price_eur numeric(12,2),
  purchase_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- Cohérence entre la nature de l'item et ses attributs : une carte gradée
  -- porte une note, une loose porte un état, un scellé ni l'un ni l'autre.
  constraint tcg_items_coherence check (
    (kind = 'loose'  and condition is not null and grade is null) or
    (kind = 'gradee' and grade is not null) or
    (kind = 'scelle' and condition is null and grade is null)
  )
);

create index if not exists idx_tcg_items_owner on tcg_items(owner_id, kind);
create index if not exists idx_tcg_items_ref on tcg_items(ref_id);

-- Courbe du coffre-fort : un point par passage du bot et par propriétaire
create table if not exists tcg_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  captured_at timestamptz not null default now(),
  total_eur numeric(14,2) not null default 0,
  loose_eur numeric(14,2) not null default 0,
  gradee_eur numeric(14,2) not null default 0,
  scelle_eur numeric(14,2) not null default 0,
  item_count integer not null default 0
);

create index if not exists idx_tcg_snapshots_owner
  on tcg_snapshots(owner_id, captured_at desc);

-- Historique des scans, pour retrouver ce qui a été identifié et repartir de là
create table if not exists tcg_scans (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  matched_ref_id text,
  read_name text,
  read_number text,
  condition text,
  confidence numeric(4,3),
  estimated_value_eur numeric(12,2),
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_tcg_scans_owner on tcg_scans(owner_id, created_at desc);

-- ====================================================================
-- SÉCURITÉ — À EXÉCUTER IMPÉRATIVEMENT
-- --------------------------------------------------------------------
-- Comme pour les tables studio_*, l'application n'accède aux données
-- qu'avec la clé « service_role », côté serveur, qui n'est pas soumise à
-- RLS. Activer RLS sans politique ferme donc l'accès via la clé « anon »
-- (publique par conception) sans rien changer au fonctionnement.
-- ====================================================================

alter table tcg_sets      enable row level security;
alter table tcg_cards     enable row level security;
alter table tcg_sealed    enable row level security;
alter table tcg_prices    enable row level security;
alter table tcg_items     enable row level security;
alter table tcg_snapshots enable row level security;
alter table tcg_scans     enable row level security;

-- Vérification : la colonne rowsecurity doit valoir true partout.
-- select tablename, rowsecurity from pg_tables
--   where schemaname = 'public' and tablename like 'tcg_%';
