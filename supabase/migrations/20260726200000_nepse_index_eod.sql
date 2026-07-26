-- Daily NEPSE / Sensitive / sector index closes for portfolio benchmarks.
-- Populated by cron from official public index snapshots — never fabricated.

create table if not exists public.nepse_index_eod (
  index_key text not null,
  index_name text not null,
  trade_date date not null,
  close_value numeric not null check (close_value > 0),
  previous_close numeric,
  change_pct numeric,
  high_value numeric,
  low_value numeric,
  source text,
  created_at timestamptz not null default now(),
  primary key (index_key, trade_date)
);

create index if not exists nepse_index_eod_date_idx on public.nepse_index_eod (trade_date desc);

create index if not exists nepse_index_eod_name_idx on public.nepse_index_eod (index_name, trade_date desc);

alter table public.nepse_index_eod enable row level security;

drop policy if exists "nepse_index_eod_public_read" on public.nepse_index_eod;

create policy "nepse_index_eod_public_read" on public.nepse_index_eod for
select
  using (true);
