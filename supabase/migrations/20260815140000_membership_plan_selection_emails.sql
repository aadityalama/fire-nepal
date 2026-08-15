-- Admin Quick Action: plan-selection invite emails for Free members.

create table if not exists public.membership_plan_selection_emails (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  sent_at timestamptz not null default now (),
  delivery_status text not null check (delivery_status in ('sent', 'failed', 'skipped')),
  subject text,
  provider_message text,
  resend_id text,
  created_at timestamptz not null default now ()
);

create index if not exists membership_plan_selection_emails_user_sent_idx
  on public.membership_plan_selection_emails (user_id, sent_at desc);

-- At most one successful send per user per calendar day (UTC) to prevent accidental duplicates.
create unique index if not exists membership_plan_selection_emails_daily_sent_dedup_idx
  on public.membership_plan_selection_emails (user_id, ((sent_at at time zone 'utc')::date))
where
  delivery_status = 'sent';

comment on table public.membership_plan_selection_emails is
  'Admin-sent plan selection / upgrade invite emails for Free members; service role only.';

alter table public.membership_plan_selection_emails enable row level security;
