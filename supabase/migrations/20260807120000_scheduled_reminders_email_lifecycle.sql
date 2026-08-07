-- FIRE Nepal: production email reminder lifecycle
-- Active = not completed, not archived, email_enabled
-- Tracks last_email_sent_at; user-level email preference for cron.

alter table public.scheduled_reminders
  add column if not exists email_enabled boolean not null default true;

alter table public.scheduled_reminders
  add column if not exists is_archived boolean not null default false;

alter table public.scheduled_reminders
  add column if not exists last_email_sent_at timestamptz;

create index if not exists scheduled_reminders_cron_active_idx
  on public.scheduled_reminders (due_date)
  where (not is_completed) and (not is_archived) and email_enabled;

create table if not exists public.user_reminder_email_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email_notifications_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_reminder_email_preferences enable row level security;

drop policy if exists "Users read own reminder email prefs" on public.user_reminder_email_preferences;
create policy "Users read own reminder email prefs"
  on public.user_reminder_email_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users upsert own reminder email prefs" on public.user_reminder_email_preferences;
create policy "Users upsert own reminder email prefs"
  on public.user_reminder_email_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own reminder email prefs" on public.user_reminder_email_preferences;
create policy "Users update own reminder email prefs"
  on public.user_reminder_email_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on column public.scheduled_reminders.email_enabled is
  'When false, cron skips email delivery (disabled / preference off).';
comment on column public.scheduled_reminders.is_archived is
  'Archived reminders are inactive and never emailed.';
comment on column public.scheduled_reminders.last_email_sent_at is
  'Timestamp of the most recent successful reminder email send.';
