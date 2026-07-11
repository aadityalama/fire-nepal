-- Persist the Savings finance workspace in Supabase.
-- One workspace snapshot per authenticated user, protected by RLS.

create table if not exists public.finance_savings_workspace (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.finance_savings_workspace enable row level security;

drop policy if exists finance_savings_workspace_select on public.finance_savings_workspace;
create policy finance_savings_workspace_select
  on public.finance_savings_workspace for select
  using (auth.uid() = user_id);

drop policy if exists finance_savings_workspace_insert on public.finance_savings_workspace;
create policy finance_savings_workspace_insert
  on public.finance_savings_workspace for insert
  with check (auth.uid() = user_id);

drop policy if exists finance_savings_workspace_update on public.finance_savings_workspace;
create policy finance_savings_workspace_update
  on public.finance_savings_workspace for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
