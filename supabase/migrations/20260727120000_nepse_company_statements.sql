-- Complete audited / interim financial statements for NEPSE Hub.
-- Canonical store for annual + quarterly statement line items ingested from
-- official NEPSE fiscal reports (+ text-extractable attached PDFs only).
-- Never fabricate: missing official values stay null.

create table if not exists public.nepse_company_statements (
  symbol text not null,
  period_key text not null,
  period_type text not null check (period_type in ('annual', 'quarterly')),
  fiscal_year text not null,
  fiscal_year_nepali text,
  quarter smallint check (quarter is null or (quarter >= 1 and quarter <= 4)),
  period_label text,
  report_id text,
  document_path text,
  document_hash text,
  submitted_date date,
  report_modified_at timestamptz,
  -- Income statement
  revenue_npr numeric,
  operating_revenue_npr numeric,
  other_income_npr numeric,
  gross_profit_npr numeric,
  operating_profit_npr numeric,
  ebitda_npr numeric,
  ebit_npr numeric,
  net_profit_npr numeric,
  eps numeric,
  diluted_eps numeric,
  -- Balance sheet
  total_assets_npr numeric,
  current_assets_npr numeric,
  non_current_assets_npr numeric,
  cash_npr numeric,
  investments_npr numeric,
  inventories_npr numeric,
  receivables_npr numeric,
  total_equity_npr numeric,
  share_capital_npr numeric,
  reserves_npr numeric,
  retained_earnings_npr numeric,
  total_liabilities_npr numeric,
  current_liabilities_npr numeric,
  non_current_liabilities_npr numeric,
  borrowings_npr numeric,
  -- Cash flow
  operating_cash_flow_npr numeric,
  investing_cash_flow_npr numeric,
  financing_cash_flow_npr numeric,
  free_cash_flow_npr numeric,
  net_cash_movement_npr numeric,
  -- Filing-published scalars (also from NEPSE fiscalReport JSON)
  paid_up_capital_npr numeric,
  pe numeric,
  net_worth_per_share_npr numeric,
  extraction_status text not null default 'structured_only'
    check (extraction_status in ('structured_only', 'pdf_parsed', 'pdf_unreadable', 'no_document')),
  source text,
  updated_at timestamptz not null default now(),
  primary key (symbol, period_key)
);

create index if not exists nepse_company_statements_symbol_fy_idx
  on public.nepse_company_statements (symbol, fiscal_year desc, quarter desc nulls last);

create index if not exists nepse_company_statements_modified_idx
  on public.nepse_company_statements (report_modified_at desc nulls last);

alter table public.nepse_company_statements enable row level security;

drop policy if exists "nepse_company_statements_public_read" on public.nepse_company_statements;

create policy "nepse_company_statements_public_read" on public.nepse_company_statements for
select
  using (true);

-- Preserve prior values when an official report is restated / corrected.
create table if not exists public.nepse_company_statement_revisions (
  id uuid primary key default gen_random_uuid (),
  symbol text not null,
  period_key text not null,
  revised_at timestamptz not null default now(),
  previous_row jsonb not null,
  reason text,
  source text
);

create index if not exists nepse_company_statement_revisions_symbol_idx
  on public.nepse_company_statement_revisions (symbol, period_key, revised_at desc);

alter table public.nepse_company_statement_revisions enable row level security;

drop policy if exists "nepse_company_statement_revisions_public_read" on public.nepse_company_statement_revisions;

create policy "nepse_company_statement_revisions_public_read" on public.nepse_company_statement_revisions for
select
  using (true);

-- Allow statements kind on ingestion run log
alter table public.nepse_ingestion_runs drop constraint if exists nepse_ingestion_runs_kind_check;

alter table public.nepse_ingestion_runs
  add constraint nepse_ingestion_runs_kind_check check (kind in ('eod', 'news', 'fundamentals', 'statements'));
