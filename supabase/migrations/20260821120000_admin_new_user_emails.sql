-- Admin new-user registration emails: delivery log + duplicate protection.

create table if not exists public.admin_new_user_emails (
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

create index if not exists admin_new_user_emails_user_sent_idx
  on public.admin_new_user_emails (user_id, sent_at desc);

-- One successful admin notification per newly registered auth user.
create unique index if not exists admin_new_user_emails_sent_dedup_idx
  on public.admin_new_user_emails (user_id)
where
  delivery_status = 'sent';

comment on table public.admin_new_user_emails is
  'Admin emails sent after a new FIRE Nepal user registers; service role only.';

alter table public.admin_new_user_emails enable row level security;
