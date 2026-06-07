-- Phase 3: automatic membership renewal reminder emails + optional queue audit.

-- ---------------------------------------------------------------------------
-- membership_reminder_emails — delivery log + duplicate protection (auto reminders)
-- ---------------------------------------------------------------------------
create table if not exists public.membership_reminder_emails (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  reminder_type text not null check (
    reminder_type in (
      'expiry_7_days',
      'expiry_3_days',
      'expiry_today',
      'expired_7_days',
      'admin_send',
      'admin_resend'
    )
  ),
  sent_at timestamptz not null default now(),
  delivery_status text not null check (delivery_status in ('sent', 'failed', 'skipped')),
  membership_plan text not null check (membership_plan in ('premium', 'elite')),
  expires_at timestamptz not null,
  subject text,
  provider_message text,
  resend_id text,
  created_at timestamptz not null default now()
);

create index if not exists membership_reminder_emails_user_sent_idx on public.membership_reminder_emails (user_id, sent_at desc);

create index if not exists membership_reminder_emails_status_idx on public.membership_reminder_emails (delivery_status, sent_at desc);

-- One successful auto reminder per (user, type, membership period end).
create unique index if not exists membership_reminder_emails_auto_dedup_idx on public.membership_reminder_emails (
  user_id,
  reminder_type,
  expires_at
)
where
  reminder_type in ('expiry_7_days', 'expiry_3_days', 'expiry_today', 'expired_7_days')
  and delivery_status = 'sent';

comment on table public.membership_reminder_emails is 'Membership renewal reminder sends; RLS off for service role + admin API only.';

alter table public.membership_reminder_emails enable row level security;

-- ---------------------------------------------------------------------------
-- membership_reminder_queue — lightweight audit / idempotency helper (cron may insert before send)
-- ---------------------------------------------------------------------------
create table if not exists public.membership_reminder_queue (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  reminder_type text not null check (
    reminder_type in ('expiry_7_days', 'expiry_3_days', 'expiry_today', 'expired_7_days')
  ),
  membership_expires_at timestamptz not null,
  scheduled_for date not null,
  created_at timestamptz not null default now(),
  unique (user_id, reminder_type, membership_expires_at, scheduled_for)
);

create index if not exists membership_reminder_queue_scheduled_idx on public.membership_reminder_queue (scheduled_for desc);

comment on table public.membership_reminder_queue is 'Optional per-day idempotency rows for cron; safe to leave empty if only emails table is used.';

alter table public.membership_reminder_queue enable row level security;

-- ---------------------------------------------------------------------------
-- system_health row for membership renewal cron
-- ---------------------------------------------------------------------------
insert into public.system_health (id, label, last_status)
values
  ('membership_renewal_reminders_cron', 'Membership renewal reminder emails cron', 'never')
on conflict (id) do nothing;
