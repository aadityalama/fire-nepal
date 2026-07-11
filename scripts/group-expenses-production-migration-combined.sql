-- Production migration: Group Expenses module only.
-- Apply via Supabase SQL Editor if the migration pipeline is not available.
-- Tables: group_members, group_expenses, settlements.

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_member_id text not null,
  name text not null,
  avatar_url text,
  phone text,
  kakao_id text,
  bank_name text,
  account_number text,
  emergency_contact text,
  notes text,
  sort_order integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists group_members_workspace_local_uidx
  on public.group_members (workspace_id, local_member_id)
  where deleted_at is null;

create index if not exists group_members_workspace_idx
  on public.group_members (workspace_id, sort_order);

create table if not exists public.group_expenses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_expense_id bigint,
  title text not null,
  amount numeric(18, 2) not null default 0,
  payer_member_id text not null,
  category text not null
    constraint group_expenses_category_check
    check (category in (
      'Rent', 'Electricity', 'Water', 'Gas', 'Internet', 'Grocery',
      'Kitchen', 'Cleaning', 'Shared Transport', 'Group Food', 'Other'
    )),
  split_equally boolean not null default true,
  expense_date date not null default current_date,
  split_among text[] not null default '{}'::text[],
  split_percentages jsonb not null default '{}'::jsonb,
  amount_currency text not null default 'NPR',
  receipt_image_url text,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists group_expenses_workspace_local_uidx
  on public.group_expenses (workspace_id, local_expense_id)
  where local_expense_id is not null and deleted_at is null;

create index if not exists group_expenses_workspace_date_idx
  on public.group_expenses (workspace_id, expense_date desc, created_at desc);

create index if not exists group_expenses_workspace_category_idx
  on public.group_expenses (workspace_id, category)
  where deleted_at is null;

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  from_member_id text,
  to_member_id text,
  amount numeric(18, 2) not null default 0,
  settlement_type text not null
    constraint settlements_type_check
    check (settlement_type in ('transfer', 'complete', 'override')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists settlements_workspace_month_idx
  on public.settlements (workspace_id, month_key desc, created_at desc);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.group_expenses to authenticated;
grant select, insert, update, delete on public.settlements to authenticated;

alter table public.group_members enable row level security;
alter table public.group_expenses enable row level security;
alter table public.settlements enable row level security;

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members for select
  using (exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members for insert
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members for update
  using (exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members for delete
  using (exists (select 1 from public.workspaces w where w.id = group_members.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_expenses_select on public.group_expenses;
create policy group_expenses_select on public.group_expenses for select
  using (exists (select 1 from public.workspaces w where w.id = group_expenses.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_expenses_insert on public.group_expenses;
create policy group_expenses_insert on public.group_expenses for insert
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = group_expenses.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_expenses_update on public.group_expenses;
create policy group_expenses_update on public.group_expenses for update
  using (exists (select 1 from public.workspaces w where w.id = group_expenses.workspace_id and w.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = group_expenses.workspace_id and w.user_id = auth.uid()));

drop policy if exists group_expenses_delete on public.group_expenses;
create policy group_expenses_delete on public.group_expenses for delete
  using (exists (select 1 from public.workspaces w where w.id = group_expenses.workspace_id and w.user_id = auth.uid()));

drop policy if exists settlements_select on public.settlements;
create policy settlements_select on public.settlements for select
  using (exists (select 1 from public.workspaces w where w.id = settlements.workspace_id and w.user_id = auth.uid()));

drop policy if exists settlements_insert on public.settlements;
create policy settlements_insert on public.settlements for insert
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = settlements.workspace_id and w.user_id = auth.uid()));

drop policy if exists settlements_update on public.settlements;
create policy settlements_update on public.settlements for update
  using (exists (select 1 from public.workspaces w where w.id = settlements.workspace_id and w.user_id = auth.uid()))
  with check (auth.uid() = user_id and exists (select 1 from public.workspaces w where w.id = settlements.workspace_id and w.user_id = auth.uid()));

drop policy if exists settlements_delete on public.settlements;
create policy settlements_delete on public.settlements for delete
  using (exists (select 1 from public.workspaces w where w.id = settlements.workspace_id and w.user_id = auth.uid()));

notify pgrst, 'reload schema';
