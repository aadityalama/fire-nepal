-- NEPSE company fundamental data engine
-- Profiles, valuation, financial statements, dividends and structured corporate actions.
-- Writes via service-role (future cron / licensed provider). Public read for market research.
-- Apply in Supabase SQL editor or via `supabase db push`.

-- 1) Company profile / capital structure
create table if not exists public.nepse_company_profiles (
  symbol text primary key,
  company_name text,
  sector text,
  industry text,
  market_cap_npr numeric,
  paid_up_capital_npr numeric,
  listed_shares numeric,
  public_shares numeric,
  promoter_shares numeric,
  source text,
  updated_at timestamptz not null default now()
);

alter table public.nepse_company_profiles enable row level security;

drop policy if exists "nepse_company_profiles_public_read" on public.nepse_company_profiles;

create policy "nepse_company_profiles_public_read" on public.nepse_company_profiles for
select
  using (true);

-- 2) Valuation snapshot (raw fundamentals; ratios may also be derived from LTP at read time)
create table if not exists public.nepse_company_valuation (
  symbol text primary key,
  as_of_date date,
  eps numeric,
  pe numeric,
  book_value_npr numeric,
  pb numeric,
  roe_pct numeric,
  roa_pct numeric,
  net_worth_npr numeric,
  graham_number numeric,
  source text,
  updated_at timestamptz not null default now()
);

alter table public.nepse_company_valuation enable row level security;

drop policy if exists "nepse_company_valuation_public_read" on public.nepse_company_valuation;

create policy "nepse_company_valuation_public_read" on public.nepse_company_valuation for
select
  using (true);

-- 3) Annual / period financial statements
create table if not exists public.nepse_company_financials (
  symbol text not null,
  fiscal_year text not null,
  period_label text,
  revenue_npr numeric,
  operating_profit_npr numeric,
  net_profit_npr numeric,
  reserves_npr numeric,
  cash_npr numeric,
  borrowings_npr numeric,
  assets_npr numeric,
  liabilities_npr numeric,
  source text,
  updated_at timestamptz not null default now(),
  primary key (symbol, fiscal_year)
);

create index if not exists nepse_company_financials_symbol_idx on public.nepse_company_financials (symbol, fiscal_year desc);

alter table public.nepse_company_financials enable row level security;

drop policy if exists "nepse_company_financials_public_read" on public.nepse_company_financials;

create policy "nepse_company_financials_public_read" on public.nepse_company_financials for
select
  using (true);

-- 4) Dividend / bonus history
create table if not exists public.nepse_company_dividends (
  id uuid primary key default gen_random_uuid (),
  symbol text not null,
  fiscal_year text not null,
  bonus_pct numeric,
  cash_pct numeric,
  book_close_date date,
  agm_date date,
  source text,
  updated_at timestamptz not null default now(),
  unique (symbol, fiscal_year)
);

create index if not exists nepse_company_dividends_symbol_idx on public.nepse_company_dividends (symbol, fiscal_year desc);

alter table public.nepse_company_dividends enable row level security;

drop policy if exists "nepse_company_dividends_public_read" on public.nepse_company_dividends;

create policy "nepse_company_dividends_public_read" on public.nepse_company_dividends for
select
  using (true);

-- 5) Structured corporate actions
create table if not exists public.nepse_company_actions (
  id uuid primary key default gen_random_uuid (),
  symbol text not null,
  action_type text not null check (
    action_type in ('rights', 'bonus', 'dividend', 'agm', 'book_close', 'fpo', 'ipo', 'merger')
  ),
  title text not null,
  action_date date,
  details text,
  source_url text,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists nepse_company_actions_symbol_idx on public.nepse_company_actions (symbol, action_date desc nulls last);

alter table public.nepse_company_actions enable row level security;

drop policy if exists "nepse_company_actions_public_read" on public.nepse_company_actions;

create policy "nepse_company_actions_public_read" on public.nepse_company_actions for
select
  using (true);

-- Allow fundamentals kind on ingestion run log (additive check replacement)
alter table public.nepse_ingestion_runs drop constraint if exists nepse_ingestion_runs_kind_check;

alter table public.nepse_ingestion_runs
  add constraint nepse_ingestion_runs_kind_check check (kind in ('eod', 'news', 'fundamentals'));
