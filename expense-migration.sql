-- Roommate expense dashboard: workspace profile columns + persistent transaction history.
-- Run in Supabase SQL Editor (production) if `npm run db:push:remote` is not available.

-- ---------------------------------------------------------------------------
-- Workspace settlement + group profile columns (20260624130000 + 20260624140000)
-- ---------------------------------------------------------------------------
alter table public.workspaces
  add column if not exists company_name text,
  add column if not exists room_number text,
  add column if not exists company_type text,
  add column if not exists description text,
  add column if not exists logo_url text;

comment on column public.workspaces.company_name is 'Employer or dorm company shown on roommate settlement exports.';
comment on column public.workspaces.room_number is 'Room number badge and header for roommate settlement exports.';
comment on column public.workspaces.company_type is 'Optional company or dorm type shown on group profile.';
comment on column public.workspaces.description is 'Optional group description for Members page profile card.';
comment on column public.workspaces.logo_url is 'Group logo or photo URL (or data URL) for settlement exports.';

-- ---------------------------------------------------------------------------
-- expense_transactions + audit log (20260624150000)
-- ---------------------------------------------------------------------------
create table if not exists public.expense_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  local_expense_id bigint,
  transaction_type text not null
    constraint expense_transactions_type_check
    check (transaction_type in ('income', 'expense', 'transfer', 'settlement', 'adjustment')),
  description text not null,
  category text,
  amount numeric(18, 2) not null default 0,
  currency text not null default 'NPR',
  member_id text,
  member_name text,
  transaction_date date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_by_name text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_transactions_workspace_idx
  on public.expense_transactions (workspace_id, transaction_date desc, created_at desc);

create index if not exists expense_transactions_user_idx
  on public.expense_transactions (user_id, transaction_date desc);

create index if not exists expense_transactions_type_idx
  on public.expense_transactions (workspace_id, transaction_type);

create index if not exists expense_transactions_category_idx
  on public.expense_transactions (workspace_id, category)
  where category is not null;

create unique index if not exists expense_transactions_workspace_local_expense_uidx
  on public.expense_transactions (workspace_id, local_expense_id)
  where local_expense_id is not null and deleted_at is null;

create table if not exists public.expense_transaction_audit_log (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.expense_transactions (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null
    constraint expense_transaction_audit_action_check
    check (action in ('created', 'updated', 'deleted', 'restored')),
  changes jsonb not null default '{}'::jsonb,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists expense_transaction_audit_tx_idx
  on public.expense_transaction_audit_log (transaction_id, created_at desc);

alter table public.expense_transactions enable row level security;
alter table public.expense_transaction_audit_log enable row level security;

drop policy if exists expense_transactions_select on public.expense_transactions;
create policy expense_transactions_select
  on public.expense_transactions for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = expense_transactions.workspace_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists expense_transactions_insert on public.expense_transactions;
create policy expense_transactions_insert
  on public.expense_transactions for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = expense_transactions.workspace_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists expense_transactions_update on public.expense_transactions;
create policy expense_transactions_update
  on public.expense_transactions for update
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = expense_transactions.workspace_id
        and w.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = expense_transactions.workspace_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists expense_transactions_delete on public.expense_transactions;
create policy expense_transactions_delete
  on public.expense_transactions for delete
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = expense_transactions.workspace_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists expense_transaction_audit_select on public.expense_transaction_audit_log;
create policy expense_transaction_audit_select
  on public.expense_transaction_audit_log for select
  using (
    exists (
      select 1 from public.workspaces w
      where w.id = expense_transaction_audit_log.workspace_id
        and w.user_id = auth.uid()
    )
  );

drop policy if exists expense_transaction_audit_insert on public.expense_transaction_audit_log;
create policy expense_transaction_audit_insert
  on public.expense_transaction_audit_log for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.workspaces w
      where w.id = expense_transaction_audit_log.workspace_id
        and w.user_id = auth.uid()
    )
  );

do $$
begin
  if exists (
    select 1
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name = 'set_updated_at'
  ) then
    drop trigger if exists expense_transactions_updated_at on public.expense_transactions;
    create trigger expense_transactions_updated_at
    before update on public.expense_transactions for each row
    execute procedure public.set_updated_at ();
  end if;
end $$;

notify pgrst, 'reload schema';
