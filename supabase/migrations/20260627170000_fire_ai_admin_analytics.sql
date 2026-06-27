-- FIRE Nepal Admin: AI analytics feature/status metadata + budget controls.

alter table public.fire_ai_usage_events
  add column if not exists ai_feature text not null default 'ai_chat',
  add column if not exists status text not null default 'success' check (status in ('success', 'failed', 'blocked_quota')),
  add column if not exists error_message text;

create index if not exists fire_ai_usage_events_feature_created_idx
  on public.fire_ai_usage_events (ai_feature, created_at desc);

create index if not exists fire_ai_usage_events_status_created_idx
  on public.fire_ai_usage_events (status, created_at desc);

create table if not exists public.fire_ai_admin_settings (
  id text primary key default 'global' check (id = 'global'),
  monthly_budget_usd numeric(12, 4) not null default 25,
  warn_50_enabled boolean not null default true,
  warn_80_enabled boolean not null default true,
  warn_100_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.fire_ai_admin_settings (id)
values ('global')
on conflict (id) do nothing;

alter table public.fire_ai_admin_settings enable row level security;

-- No user policies: admin APIs read/write this table with the service role only.
