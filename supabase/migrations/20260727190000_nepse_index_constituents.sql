-- Official NEPSE market-index catalog + company membership.
-- Composition is refreshed from NEPSE endpoints by cron (never hardcoded lists).

create table if not exists public.nepse_market_indices (
  index_key text primary key,
  nepse_id integer not null unique,
  index_code text,
  index_name text not null,
  display_name text not null,
  description text,
  sector_name text,
  sector_id integer,
  key_index_flag text,
  base_year_market_cap numeric,
  source text not null default 'nepalstock:index',
  updated_at timestamptz not null default now()
);

create table if not exists public.nepse_index_constituents (
  index_key text not null references public.nepse_market_indices (index_key) on delete cascade,
  symbol text not null,
  security_id bigint,
  membership_source text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (index_key, symbol)
);

create index if not exists nepse_index_constituents_symbol_idx
  on public.nepse_index_constituents (symbol);

create index if not exists nepse_index_constituents_last_seen_idx
  on public.nepse_index_constituents (index_key, last_seen_at desc);

alter table public.nepse_market_indices enable row level security;
alter table public.nepse_index_constituents enable row level security;

drop policy if exists "nepse_market_indices_public_read" on public.nepse_market_indices;
create policy "nepse_market_indices_public_read" on public.nepse_market_indices
for select using (true);

drop policy if exists "nepse_index_constituents_public_read" on public.nepse_index_constituents;
create policy "nepse_index_constituents_public_read" on public.nepse_index_constituents
for select using (true);
