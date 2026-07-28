-- Ensure NEPSE Hub Admin override + audit tables exist with indexes, timestamps,
-- foreign keys, RLS policies, and a PostgREST schema reload.
-- Idempotent: safe when 20260727140000 already ran, or when production never applied it.
-- Fixes: "Could not find the table public.nepse_hub_admin_overrides in the schema cache."

-- ---------------------------------------------------------------------------
-- Overrides (field-level manual values; official cron continues to ingest)
-- ---------------------------------------------------------------------------
create table if not exists public.nepse_hub_admin_overrides (
  id uuid primary key default gen_random_uuid (),
  symbol text not null,
  domain text not null,
  record_key text not null default '_',
  field_key text not null,
  value_json jsonb not null,
  official_snapshot_json jsonb,
  note text,
  updated_by uuid not null,
  updated_by_email text not null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint nepse_hub_admin_overrides_unique unique (symbol, domain, record_key, field_key)
);

alter table public.nepse_hub_admin_overrides
  add column if not exists created_at timestamptz not null default now ();

alter table public.nepse_hub_admin_overrides
  add column if not exists updated_at timestamptz not null default now ();

alter table public.nepse_hub_admin_overrides
  add column if not exists official_snapshot_json jsonb;

alter table public.nepse_hub_admin_overrides
  add column if not exists note text;

alter table public.nepse_hub_admin_overrides
  add column if not exists updated_by_email text;

-- Backfill email column if an older partial table lacked NOT NULL.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'nepse_hub_admin_overrides'
      and column_name = 'updated_by_email'
      and is_nullable = 'YES'
  ) then
    update public.nepse_hub_admin_overrides
    set updated_by_email = coalesce(nullif(updated_by_email, ''), 'unknown@admin')
    where updated_by_email is null or updated_by_email = '';
    alter table public.nepse_hub_admin_overrides
      alter column updated_by_email set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nepse_hub_admin_overrides_unique'
      and conrelid = 'public.nepse_hub_admin_overrides'::regclass
  ) then
    alter table public.nepse_hub_admin_overrides
      add constraint nepse_hub_admin_overrides_unique
      unique (symbol, domain, record_key, field_key);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nepse_hub_admin_overrides_updated_by_fkey'
      and conrelid = 'public.nepse_hub_admin_overrides'::regclass
  ) then
    alter table public.nepse_hub_admin_overrides
      add constraint nepse_hub_admin_overrides_updated_by_fkey
      foreign key (updated_by) references auth.users (id) on delete restrict;
  end if;
end $$;

create index if not exists nepse_hub_admin_overrides_symbol_idx
  on public.nepse_hub_admin_overrides (symbol, domain);

create index if not exists nepse_hub_admin_overrides_updated_at_idx
  on public.nepse_hub_admin_overrides (updated_at desc);

create index if not exists nepse_hub_admin_overrides_updated_by_idx
  on public.nepse_hub_admin_overrides (updated_by, updated_at desc);

comment on table public.nepse_hub_admin_overrides is
  'NEPSE Hub Admin field overrides. Upsert on (symbol,domain,record_key,field_key); delete restores official data.';

alter table public.nepse_hub_admin_overrides enable row level security;

drop policy if exists "nepse_hub_admin_overrides_service_select" on public.nepse_hub_admin_overrides;
drop policy if exists "nepse_hub_admin_overrides_service_insert" on public.nepse_hub_admin_overrides;
drop policy if exists "nepse_hub_admin_overrides_service_update" on public.nepse_hub_admin_overrides;
drop policy if exists "nepse_hub_admin_overrides_service_delete" on public.nepse_hub_admin_overrides;

create policy "nepse_hub_admin_overrides_service_select"
  on public.nepse_hub_admin_overrides
  for select
  to service_role
  using (true);

create policy "nepse_hub_admin_overrides_service_insert"
  on public.nepse_hub_admin_overrides
  for insert
  to service_role
  with check (true);

create policy "nepse_hub_admin_overrides_service_update"
  on public.nepse_hub_admin_overrides
  for update
  to service_role
  using (true)
  with check (true);

create policy "nepse_hub_admin_overrides_service_delete"
  on public.nepse_hub_admin_overrides
  for delete
  to service_role
  using (true);

grant select, insert, update, delete on public.nepse_hub_admin_overrides to service_role;

-- ---------------------------------------------------------------------------
-- Audit log (immutable history of set / restore_field / restore_company)
-- ---------------------------------------------------------------------------
create table if not exists public.nepse_hub_admin_audit_log (
  id uuid primary key default gen_random_uuid (),
  symbol text not null,
  domain text not null,
  record_key text not null default '_',
  field_key text,
  action text not null check (action in ('set', 'restore_field', 'restore_company')),
  old_value_json jsonb,
  new_value_json jsonb,
  actor_user_id uuid not null,
  actor_email text not null,
  note text,
  created_at timestamptz not null default now ()
);

alter table public.nepse_hub_admin_audit_log
  add column if not exists created_at timestamptz not null default now ();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nepse_hub_admin_audit_log_action_check'
      and conrelid = 'public.nepse_hub_admin_audit_log'::regclass
  ) then
    alter table public.nepse_hub_admin_audit_log
      add constraint nepse_hub_admin_audit_log_action_check
      check (action in ('set', 'restore_field', 'restore_company'));
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'nepse_hub_admin_audit_log_actor_user_id_fkey'
      and conrelid = 'public.nepse_hub_admin_audit_log'::regclass
  ) then
    alter table public.nepse_hub_admin_audit_log
      add constraint nepse_hub_admin_audit_log_actor_user_id_fkey
      foreign key (actor_user_id) references auth.users (id) on delete restrict;
  end if;
end $$;

create index if not exists nepse_hub_admin_audit_log_symbol_idx
  on public.nepse_hub_admin_audit_log (symbol, created_at desc);

create index if not exists nepse_hub_admin_audit_log_actor_idx
  on public.nepse_hub_admin_audit_log (actor_user_id, created_at desc);

comment on table public.nepse_hub_admin_audit_log is
  'Audit trail for NEPSE Hub Admin override set/restore actions.';

alter table public.nepse_hub_admin_audit_log enable row level security;

drop policy if exists "nepse_hub_admin_audit_log_service_select" on public.nepse_hub_admin_audit_log;
drop policy if exists "nepse_hub_admin_audit_log_service_insert" on public.nepse_hub_admin_audit_log;

create policy "nepse_hub_admin_audit_log_service_select"
  on public.nepse_hub_admin_audit_log
  for select
  to service_role
  using (true);

create policy "nepse_hub_admin_audit_log_service_insert"
  on public.nepse_hub_admin_audit_log
  for insert
  to service_role
  with check (true);

grant select, insert on public.nepse_hub_admin_audit_log to service_role;

-- Make PostgREST pick up the new relations immediately.
notify pgrst, 'reload schema';
