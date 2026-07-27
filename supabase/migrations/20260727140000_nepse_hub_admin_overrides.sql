-- Field-level manual overrides for NEPSE Hub Admin.
-- Official ingestion (cron) continues; overrides win only for edited fields at read time.
-- Restore removes the override so official values show again. Full audit history kept.

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
  updated_at timestamptz not null default now (),
  constraint nepse_hub_admin_overrides_unique unique (symbol, domain, record_key, field_key)
);

create index if not exists nepse_hub_admin_overrides_symbol_idx
  on public.nepse_hub_admin_overrides (symbol, domain);

alter table public.nepse_hub_admin_overrides enable row level security;

-- No public policies: service-role only (admin APIs + server loaders).

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

create index if not exists nepse_hub_admin_audit_log_symbol_idx
  on public.nepse_hub_admin_audit_log (symbol, created_at desc);

create index if not exists nepse_hub_admin_audit_log_actor_idx
  on public.nepse_hub_admin_audit_log (actor_user_id, created_at desc);

alter table public.nepse_hub_admin_audit_log enable row level security;
