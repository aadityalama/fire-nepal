-- Field-level manual overrides for NEPSE Hub Admin.
-- Official ingestion (cron) continues; overrides win only for edited fields at read time.
-- Restore removes the override so official values show again. Full audit history kept.
-- Prefer also applying 20260728030400_nepse_hub_admin_overrides_ensure.sql (idempotent repair + RLS + reload).

create table if not exists public.nepse_hub_admin_overrides (
  id uuid primary key default gen_random_uuid (),
  symbol text not null,
  domain text not null,
  record_key text not null default '_',
  field_key text not null,
  value_json jsonb not null,
  official_snapshot_json jsonb,
  note text,
  updated_by uuid not null references auth.users (id) on delete restrict,
  updated_by_email text not null,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  constraint nepse_hub_admin_overrides_unique unique (symbol, domain, record_key, field_key)
);

create index if not exists nepse_hub_admin_overrides_symbol_idx
  on public.nepse_hub_admin_overrides (symbol, domain);

create index if not exists nepse_hub_admin_overrides_updated_at_idx
  on public.nepse_hub_admin_overrides (updated_at desc);

alter table public.nepse_hub_admin_overrides enable row level security;

-- Service-role policies (admin APIs + server loaders). Anon/authenticated have no access.
drop policy if exists "nepse_hub_admin_overrides_service_select" on public.nepse_hub_admin_overrides;
drop policy if exists "nepse_hub_admin_overrides_service_insert" on public.nepse_hub_admin_overrides;
drop policy if exists "nepse_hub_admin_overrides_service_update" on public.nepse_hub_admin_overrides;
drop policy if exists "nepse_hub_admin_overrides_service_delete" on public.nepse_hub_admin_overrides;

create policy "nepse_hub_admin_overrides_service_select"
  on public.nepse_hub_admin_overrides for select to service_role using (true);

create policy "nepse_hub_admin_overrides_service_insert"
  on public.nepse_hub_admin_overrides for insert to service_role with check (true);

create policy "nepse_hub_admin_overrides_service_update"
  on public.nepse_hub_admin_overrides for update to service_role using (true) with check (true);

create policy "nepse_hub_admin_overrides_service_delete"
  on public.nepse_hub_admin_overrides for delete to service_role using (true);

grant select, insert, update, delete on public.nepse_hub_admin_overrides to service_role;

create table if not exists public.nepse_hub_admin_audit_log (
  id uuid primary key default gen_random_uuid (),
  symbol text not null,
  domain text not null,
  record_key text not null default '_',
  field_key text,
  action text not null check (action in ('set', 'restore_field', 'restore_company')),
  old_value_json jsonb,
  new_value_json jsonb,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  actor_email text not null,
  note text,
  created_at timestamptz not null default now ()
);

create index if not exists nepse_hub_admin_audit_log_symbol_idx
  on public.nepse_hub_admin_audit_log (symbol, created_at desc);

create index if not exists nepse_hub_admin_audit_log_actor_idx
  on public.nepse_hub_admin_audit_log (actor_user_id, created_at desc);

alter table public.nepse_hub_admin_audit_log enable row level security;

drop policy if exists "nepse_hub_admin_audit_log_service_select" on public.nepse_hub_admin_audit_log;
drop policy if exists "nepse_hub_admin_audit_log_service_insert" on public.nepse_hub_admin_audit_log;

create policy "nepse_hub_admin_audit_log_service_select"
  on public.nepse_hub_admin_audit_log for select to service_role using (true);

create policy "nepse_hub_admin_audit_log_service_insert"
  on public.nepse_hub_admin_audit_log for insert to service_role with check (true);

grant select, insert on public.nepse_hub_admin_audit_log to service_role;

notify pgrst, 'reload schema';
