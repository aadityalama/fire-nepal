-- Phase 4: Member CRM — profile geo/login hints + auditable admin actions for merged timelines.

alter table public.profiles
  add column if not exists last_login_at timestamptz;

alter table public.profiles
  add column if not exists country text;

alter table public.profiles
  add column if not exists region text;

alter table public.profiles
  add column if not exists timezone text;

comment on column public.profiles.last_login_at is 'Optional mirror of last auth sign-in; may be synced when admin opens CRM.';
comment on column public.profiles.country is 'Member country (manual or future enrichment).';
comment on column public.profiles.region is 'Member region/state.';
comment on column public.profiles.timezone is 'IANA or display timezone string.';

-- ---------------------------------------------------------------------------
-- admin_member_crm_events — suspend / reactivate / renew audit for timelines
-- ---------------------------------------------------------------------------
create table if not exists public.admin_member_crm_events (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'membership_renewed',
      'user_suspended',
      'user_reactivated'
    )
  ),
  title text not null,
  body text,
  meta jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users (id) on delete set null
);

create index if not exists admin_member_crm_events_user_occurred_idx on public.admin_member_crm_events (user_id, occurred_at desc);

comment on table public.admin_member_crm_events is 'Admin-driven membership actions merged into member CRM timelines.';

alter table public.admin_member_crm_events enable row level security;
