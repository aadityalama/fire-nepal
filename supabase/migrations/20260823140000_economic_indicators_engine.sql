-- FIRE Nepal Economic Data Engine
-- Historical economic indicators + refresh run log.
-- Writes via service role (cron / server); public read for latest dashboard values.

create table if not exists public.economic_indicators (
  id uuid primary key default gen_random_uuid(),
  metric_key text not null,
  metric_name text not null,
  value numeric not null,
  display_value text not null,
  unit text not null,
  currency text,
  source text not null,
  source_url text not null,
  period text,
  published_at timestamptz,
  observed_at timestamptz not null default now(),
  frequency text not null,
  status text not null check (status in ('live', 'official', 'cached', 'stale', 'unavailable')),
  value_kind text not null default 'actual',
  change_value numeric,
  change_percent numeric,
  change_label text,
  tone text not null default 'neutral',
  raw_data jsonb,
  fetch_error text,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists economic_indicators_metric_key_idx
  on public.economic_indicators (metric_key);

create index if not exists economic_indicators_observed_at_idx
  on public.economic_indicators (observed_at desc);

create index if not exists economic_indicators_metric_observed_idx
  on public.economic_indicators (metric_key, observed_at desc);

create index if not exists economic_indicators_period_idx
  on public.economic_indicators (period);

create table if not exists public.economic_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('ok', 'partial', 'error')),
  items integer not null default 0,
  message text,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists economic_refresh_runs_finished_idx
  on public.economic_refresh_runs (finished_at desc);

alter table public.economic_indicators enable row level security;
alter table public.economic_refresh_runs enable row level security;

drop policy if exists "economic_indicators_public_read" on public.economic_indicators;
create policy "economic_indicators_public_read"
  on public.economic_indicators for select
  using (true);

drop policy if exists "economic_refresh_runs_public_read" on public.economic_refresh_runs;
create policy "economic_refresh_runs_public_read"
  on public.economic_refresh_runs for select
  using (true);

-- No insert/update/delete policies for anon/auth — service role only.

insert into public.system_health (id, label, last_status)
values ('nepal_economy_refresh', 'Nepal Economy data refresh', 'never')
on conflict (id) do nothing;

-- Optional Supabase pg_cron + pg_net scheduler (non-Vercel).
-- Requires extensions: pg_cron, pg_net (usually enabled on Supabase).
-- Replace the URL and secret via Vault / dashboard before enabling.
--
-- create extension if not exists pg_cron with schema extensions;
-- create extension if not exists pg_net with schema extensions;
--
-- select cron.schedule(
--   'nepal-economy-refresh',
--   '15 */6 * * *',
--   $$
--   select net.http_get(
--     url := current_setting('app.settings.nepal_economy_cron_url', true),
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true),
--       'Accept', 'application/json'
--     )
--   );
--   $$
-- );

notify pgrst, 'reload schema';
