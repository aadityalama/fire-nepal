-- FIRE Nepal AI Phase 2.5: authenticated cashflow snapshots for server-side intelligence.

create table if not exists public.cashflow_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cashflow_snapshots_updated_idx
  on public.cashflow_snapshots (updated_at desc);

alter table public.cashflow_snapshots enable row level security;

drop policy if exists "Users read own cashflow snapshots" on public.cashflow_snapshots;
drop policy if exists "Users insert own cashflow snapshots" on public.cashflow_snapshots;
drop policy if exists "Users update own cashflow snapshots" on public.cashflow_snapshots;
drop policy if exists "Users delete own cashflow snapshots" on public.cashflow_snapshots;

create policy "Users read own cashflow snapshots"
  on public.cashflow_snapshots for select
  using (auth.uid() = user_id);

create policy "Users insert own cashflow snapshots"
  on public.cashflow_snapshots for insert
  with check (auth.uid() = user_id);

create policy "Users update own cashflow snapshots"
  on public.cashflow_snapshots for update
  using (auth.uid() = user_id);

create policy "Users delete own cashflow snapshots"
  on public.cashflow_snapshots for delete
  using (auth.uid() = user_id);
