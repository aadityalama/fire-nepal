-- NEPSE automatic market data engine (Phase 3)
-- EOD price history, aggregated market news and ingestion run log.
-- Writes happen only through the service-role cron route; reads are public market data.
-- Apply in Supabase SQL editor or via `supabase db push`.

-- 1) End-of-day price history (populated automatically after market close)
create table if not exists public.nepse_eod_prices (
  symbol text not null,
  trade_date date not null,
  open_npr numeric,
  high_npr numeric,
  low_npr numeric,
  close_npr numeric not null check (close_npr > 0),
  previous_close_npr numeric,
  change_pct numeric,
  volume bigint,
  turnover_npr numeric,
  trades integer,
  sector text,
  created_at timestamptz not null default now(),
  primary key (symbol, trade_date)
);

create index if not exists nepse_eod_prices_date_idx on public.nepse_eod_prices (trade_date desc);

alter table public.nepse_eod_prices enable row level security;

drop policy if exists "nepse_eod_prices_public_read" on public.nepse_eod_prices;

create policy "nepse_eod_prices_public_read" on public.nepse_eod_prices for
select
  using (true);

-- 2) Aggregated market news (headline + metadata + source link only; no article bodies)
create table if not exists public.nepse_market_news (
  id uuid primary key default gen_random_uuid (),
  headline text not null,
  source_name text not null,
  source_url text not null unique,
  published_at timestamptz,
  category text not null default 'Economy',
  sentiment text not null default 'neutral' check (sentiment in ('positive', 'neutral', 'negative')),
  summary text,
  is_corporate_action boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists nepse_market_news_published_idx on public.nepse_market_news (published_at desc nulls last);

create index if not exists nepse_market_news_corporate_idx on public.nepse_market_news (is_corporate_action, published_at desc);

alter table public.nepse_market_news enable row level security;

drop policy if exists "nepse_market_news_public_read" on public.nepse_market_news;

create policy "nepse_market_news_public_read" on public.nepse_market_news for
select
  using (true);

-- 3) Ingestion run log (observability for the automatic data engine)
create table if not exists public.nepse_ingestion_runs (
  id uuid primary key default gen_random_uuid (),
  kind text not null check (kind in ('eod', 'news')),
  status text not null check (status in ('ok', 'partial', 'error')),
  items integer not null default 0,
  message text,
  started_at timestamptz not null,
  finished_at timestamptz not null default now()
);

create index if not exists nepse_ingestion_runs_kind_idx on public.nepse_ingestion_runs (kind, finished_at desc);

alter table public.nepse_ingestion_runs enable row level security;

drop policy if exists "nepse_ingestion_runs_public_read" on public.nepse_ingestion_runs;

create policy "nepse_ingestion_runs_public_read" on public.nepse_ingestion_runs for
select
  using (true);
