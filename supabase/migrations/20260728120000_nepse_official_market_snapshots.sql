-- Official NEPSE live market snapshots for sync history + last-successful fallback.
-- Writes via service-role sync/cron; reads are public market metadata.

create table if not exists public.nepse_market_snapshots (
  id uuid primary key default gen_random_uuid (),
  synced_at timestamptz not null default now(),
  trade_date date not null,
  source text not null default 'official' check (source = 'official'),
  is_market_open boolean,
  market_as_of timestamptz,
  generated_time timestamptz,
  index_name text,
  index_value numeric,
  index_change_npr numeric,
  index_change_pct numeric,
  previous_close numeric,
  total_turnover_npr numeric,
  total_volume numeric,
  total_trades numeric,
  scrips_traded numeric,
  advancing integer,
  declining integer,
  unchanged integer,
  upper_circuit integer,
  lower_circuit integer,
  payload_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists nepse_market_snapshots_synced_idx
  on public.nepse_market_snapshots (synced_at desc);

create index if not exists nepse_market_snapshots_trade_date_idx
  on public.nepse_market_snapshots (trade_date desc, synced_at desc);

alter table public.nepse_market_snapshots enable row level security;

drop policy if exists "nepse_market_snapshots_public_read" on public.nepse_market_snapshots;

create policy "nepse_market_snapshots_public_read" on public.nepse_market_snapshots for
select
  using (true);

-- Extend ingestion run kinds for official live sync observability.
alter table public.nepse_ingestion_runs drop constraint if exists nepse_ingestion_runs_kind_check;

alter table public.nepse_ingestion_runs
  add constraint nepse_ingestion_runs_kind_check check (
    kind in ('eod', 'news', 'fundamentals', 'statements', 'official_live')
  );
