-- Re-applies the same DDL as 20250602140000_scheduled_reminders.sql for projects that skipped it.
-- Idempotent: tables/indexes use IF NOT EXISTS; policies are dropped before recreate so this file can run twice.

create table if not exists public.scheduled_reminders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  amount numeric(18, 2),
  due_date date not null,
  due_time text not null default '09:00' check (due_time ~ '^\d{2}:\d{2}$'),
  timezone text not null default 'Asia/Kathmandu',
  email text not null,
  repeat_frequency text not null default 'monthly' check (
    repeat_frequency in ('once', 'daily', 'weekly', 'monthly', 'yearly')
  ),
  notify_7d boolean not null default false,
  notify_3d boolean not null default false,
  notify_1d boolean not null default false,
  notify_at_due boolean not null default true,
  notify_overdue boolean not null default false,
  reminder_type text not null default 'room_rent',
  notes text,
  shared_with_family boolean not null default false,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduled_reminders_user_due_idx on public.scheduled_reminders (user_id, due_date);
create index if not exists scheduled_reminders_user_active_idx on public.scheduled_reminders (user_id) where not is_completed;

create table if not exists public.scheduled_reminder_email_sends (
  id uuid primary key default gen_random_uuid (),
  reminder_id uuid not null references public.scheduled_reminders (id) on delete cascade,
  slot text not null check (slot in ('d7', 'd3', 'd1', 'due', 'overdue')),
  anchor_due_date date not null,
  overdue_local_date date,
  sent_at timestamptz not null default now()
);

create unique index if not exists scheduled_reminder_email_sends_dedupe_scheduled
  on public.scheduled_reminder_email_sends (reminder_id, slot, anchor_due_date)
  where slot <> 'overdue';

create unique index if not exists scheduled_reminder_email_sends_dedupe_overdue
  on public.scheduled_reminder_email_sends (reminder_id, overdue_local_date)
  where slot = 'overdue' and overdue_local_date is not null;

create index if not exists scheduled_reminder_email_sends_reminder_idx on public.scheduled_reminder_email_sends (reminder_id);

alter table public.scheduled_reminders enable row level security;
alter table public.scheduled_reminder_email_sends enable row level security;

drop policy if exists "Users read own scheduled reminders" on public.scheduled_reminders;
drop policy if exists "Users insert own scheduled reminders" on public.scheduled_reminders;
drop policy if exists "Users update own scheduled reminders" on public.scheduled_reminders;
drop policy if exists "Users delete own scheduled reminders" on public.scheduled_reminders;

create policy "Users read own scheduled reminders"
  on public.scheduled_reminders for select
  using (auth.uid () = user_id);

create policy "Users insert own scheduled reminders"
  on public.scheduled_reminders for insert
  with check (auth.uid () = user_id);

create policy "Users update own scheduled reminders"
  on public.scheduled_reminders for update
  using (auth.uid () = user_id);

create policy "Users delete own scheduled reminders"
  on public.scheduled_reminders for delete
  using (auth.uid () = user_id);

-- Send log is written only by the cron job (service role). No RLS policies for anon/auth.

notify pgrst, 'reload schema';
