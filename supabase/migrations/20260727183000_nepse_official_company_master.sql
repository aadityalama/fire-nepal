-- Official NEPSE Company Master
-- Single source of truth for symbol/company/sector/instrument/status metadata.

create table if not exists public.nepse_company_master (
  symbol text primary key,
  security_id bigint unique,
  company_name text not null,
  sector text,
  instrument text,
  status text not null default 'UNKNOWN',
  website text,
  email text,
  listing_date date,
  delisted_date date,
  is_listed boolean not null default true,
  source text not null default 'nepalstock:security',
  official_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nepse_company_master_status_idx on public.nepse_company_master (status);
create index if not exists nepse_company_master_sector_idx on public.nepse_company_master (sector);
create index if not exists nepse_company_master_security_id_idx on public.nepse_company_master (security_id);

create table if not exists public.nepse_company_master_sync_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('preopen', 'postclose', 'weekly_validation', 'manual')),
  status text not null check (status in ('running', 'ok', 'partial', 'error')),
  total_seen integer not null default 0,
  total_active integer not null default 0,
  total_listed integer not null default 0,
  new_symbols integer not null default 0,
  changed_symbols integer not null default 0,
  delisted_symbols integer not null default 0,
  suspended_symbols integer not null default 0,
  message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists nepse_company_master_sync_runs_started_idx
  on public.nepse_company_master_sync_runs (started_at desc);

create table if not exists public.nepse_company_master_changes (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.nepse_company_master_sync_runs (id) on delete cascade,
  symbol text not null,
  security_id bigint,
  change_type text not null check (
    change_type in (
      'new_listing',
      'delisted',
      'suspended',
      'reactivated',
      'company_name_changed',
      'symbol_changed',
      'sector_changed',
      'instrument_changed',
      'status_changed',
      'metadata_changed'
    )
  ),
  old_values jsonb,
  new_values jsonb,
  note text,
  detected_at timestamptz not null default now()
);

create index if not exists nepse_company_master_changes_symbol_idx
  on public.nepse_company_master_changes (symbol, detected_at desc);

create index if not exists nepse_company_master_changes_run_idx
  on public.nepse_company_master_changes (sync_run_id);

create table if not exists public.nepse_company_master_validation_reports (
  id uuid primary key default gen_random_uuid(),
  sync_run_id uuid references public.nepse_company_master_sync_runs (id) on delete set null,
  generated_at timestamptz not null default now(),
  total_companies integer not null default 0,
  total_active integer not null default 0,
  total_listed integer not null default 0,
  sector_counts jsonb not null default '{}'::jsonb,
  missing_companies jsonb not null default '[]'::jsonb,
  duplicate_companies jsonb not null default '[]'::jsonb,
  sector_mismatches jsonb not null default '[]'::jsonb,
  symbol_mismatches jsonb not null default '[]'::jsonb,
  notes text
);

create index if not exists nepse_company_master_validation_generated_idx
  on public.nepse_company_master_validation_reports (generated_at desc);

alter table public.nepse_company_master enable row level security;
alter table public.nepse_company_master_sync_runs enable row level security;
alter table public.nepse_company_master_changes enable row level security;
alter table public.nepse_company_master_validation_reports enable row level security;

drop policy if exists "nepse_company_master_public_read" on public.nepse_company_master;
create policy "nepse_company_master_public_read" on public.nepse_company_master
for select using (true);

drop policy if exists "nepse_company_master_sync_runs_public_read" on public.nepse_company_master_sync_runs;
create policy "nepse_company_master_sync_runs_public_read" on public.nepse_company_master_sync_runs
for select using (true);

drop policy if exists "nepse_company_master_changes_public_read" on public.nepse_company_master_changes;
create policy "nepse_company_master_changes_public_read" on public.nepse_company_master_changes
for select using (true);

drop policy if exists "nepse_company_master_validation_reports_public_read" on public.nepse_company_master_validation_reports;
create policy "nepse_company_master_validation_reports_public_read" on public.nepse_company_master_validation_reports
for select using (true);

alter table public.nepse_company_profiles
  add column if not exists official_security_id bigint,
  add column if not exists official_status text,
  add column if not exists official_website text,
  add column if not exists official_email text,
  add column if not exists official_listing_date date,
  add column if not exists official_metadata jsonb not null default '{}'::jsonb;
