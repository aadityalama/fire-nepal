-- FIRE Nepal: persisted personal finance budgets (authenticated users only).

create table if not exists public.finance_budget_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  icon text not null default '💼',
  gradient text not null default 'from-emerald-300 to-lime-300',
  period text not null check (period in ('Monthly', 'Yearly')),
  amount_npr numeric(14, 2) not null check (amount_npr >= 0),
  monthly_budget_npr numeric(14, 2) not null check (monthly_budget_npr >= 0),
  monthly_spent_npr numeric(14, 2) not null default 0 check (monthly_spent_npr >= 0),
  days_remaining integer not null default 30 check (days_remaining >= 0),
  notification_settings jsonb not null default '{}'::jsonb,
  ai_recommendation jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_budget_records_user_sort_idx
  on public.finance_budget_records (user_id, sort_order asc, created_at asc);

alter table public.finance_budget_records enable row level security;

drop policy if exists "Users read own finance budget records" on public.finance_budget_records;
drop policy if exists "Users insert own finance budget records" on public.finance_budget_records;
drop policy if exists "Users update own finance budget records" on public.finance_budget_records;
drop policy if exists "Users delete own finance budget records" on public.finance_budget_records;

create policy "Users read own finance budget records"
  on public.finance_budget_records for select
  using (auth.uid() = user_id);

create policy "Users insert own finance budget records"
  on public.finance_budget_records for insert
  with check (auth.uid() = user_id);

create policy "Users update own finance budget records"
  on public.finance_budget_records for update
  using (auth.uid() = user_id);

create policy "Users delete own finance budget records"
  on public.finance_budget_records for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
