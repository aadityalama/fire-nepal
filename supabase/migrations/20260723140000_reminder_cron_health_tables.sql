-- Missing pieces from 20250602160000_admin_dashboard.sql on production:
-- cron health logging + email failure logs. Safe to re-run.

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
  ('membership_renewal_reminders_cron', 'Membership renewal reminder emails cron', 'never'),
  ('deployment', 'Application deployment', 'unknown')
on conflict (id) do nothing;

alter table public.reminder_logs enable row level security;
alter table public.system_health enable row level security;

-- Service role only (no anon/auth policies).
