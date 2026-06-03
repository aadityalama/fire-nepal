-- FIRE Nepal: admin dashboard tables — profiles, subscriptions, revenue, reminder audit, admins, system health.
-- Service role bypasses RLS for server-side admin aggregates; authenticated users may read own admin_users row.

-- ---------------------------------------------------------------------------
-- profiles (plan + activity; joins with user_profiles for display name)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan_type text not null default 'free' check (plan_type in ('free', 'premium', 'elite')),
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_plan_type_idx on public.profiles (plan_type);
create index if not exists profiles_last_active_idx on public.profiles (last_active_at desc nulls last);

-- ---------------------------------------------------------------------------
-- subscriptions (billing state; revenue_events records cash)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('premium', 'elite')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  amount_minor bigint,
  currency text not null default 'USD',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists subscriptions_user_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ---------------------------------------------------------------------------
-- revenue_events (immutable ledger for admin “total revenue” + trends)
-- ---------------------------------------------------------------------------
create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid (),
  user_id uuid references auth.users (id) on delete set null,
  amount_npr numeric(18, 2) not null,
  kind text not null default 'subscription' check (kind in ('subscription', 'one_time', 'adjustment', 'other')),
  note text,
  external_ref text,
  created_at timestamptz not null default now()
);

create index if not exists revenue_events_created_idx on public.revenue_events (created_at desc);

-- ---------------------------------------------------------------------------
-- reminder_logs (email failures + optional operational events)
-- ---------------------------------------------------------------------------
create table if not exists public.reminder_logs (
  id uuid primary key default gen_random_uuid (),
  reminder_id uuid references public.scheduled_reminders (id) on delete set null,
  user_id uuid references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('email_sent', 'email_failed', 'cron_started', 'cron_completed', 'other')),
  provider_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reminder_logs_created_idx on public.reminder_logs (created_at desc);
create index if not exists reminder_logs_event_idx on public.reminder_logs (event_type);
create index if not exists reminder_logs_reminder_idx on public.reminder_logs (reminder_id);

-- ---------------------------------------------------------------------------
-- admin_users (role gate for /admin)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- system_health (cron + deployment metadata; updated by app/cron)
-- ---------------------------------------------------------------------------
create table if not exists public.system_health (
  id text primary key,
  label text,
  last_run_at timestamptz,
  last_status text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.system_health (id, label, last_status)
values
  ('scheduled_reminders_cron', 'Scheduled reminder emails cron', 'never'),
  ('deployment', 'Application deployment', 'unknown')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.revenue_events enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.admin_users enable row level security;
alter table public.system_health enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid () = id);

create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid () = id);

create policy "profiles_update_own" on public.profiles for update using (auth.uid () = id) with check (auth.uid () = id);

create policy "subscriptions_select_own" on public.subscriptions for select using (auth.uid () = user_id);

create policy "admin_users_select_self" on public.admin_users for select using (auth.uid () = user_id);

-- No policies for revenue_events / reminder_logs / system_health for anon/auth — service role only.

-- ---------------------------------------------------------------------------
-- New user → profiles row (alongside user_profiles trigger)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user_profiles ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, plan_type)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profiles on auth.users;

create trigger on_auth_user_created_profiles
after insert on auth.users for each row
execute procedure public.handle_new_user_profiles ();

-- Backfill existing accounts
insert into public.profiles (id, plan_type)
select id, 'free'
from public.user_profiles
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create trigger profiles_updated_at before update on public.profiles for each row
execute procedure public.set_updated_at ();

create trigger subscriptions_updated_at before update on public.subscriptions for each row
execute procedure public.set_updated_at ();

create trigger system_health_updated_at before update on public.system_health for each row
execute procedure public.set_updated_at ();
