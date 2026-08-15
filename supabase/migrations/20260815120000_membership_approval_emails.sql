-- Membership payment-plan approval emails: delivery log + duplicate protection.

create table if not exists public.membership_approval_emails (
  id uuid primary key default gen_random_uuid (),
  membership_request_id uuid not null references public.membership_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  sent_at timestamptz not null default now (),
  delivery_status text not null check (delivery_status in ('sent', 'failed', 'skipped')),
  subject text,
  provider_message text,
  resend_id text,
  created_at timestamptz not null default now ()
);

create index if not exists membership_approval_emails_user_sent_idx
  on public.membership_approval_emails (user_id, sent_at desc);

create index if not exists membership_approval_emails_request_idx
  on public.membership_approval_emails (membership_request_id, sent_at desc);

-- One successful approval email per membership payment request (approval event).
create unique index if not exists membership_approval_emails_sent_dedup_idx
  on public.membership_approval_emails (membership_request_id)
where
  delivery_status = 'sent';

comment on table public.membership_approval_emails is
  'Member emails sent after admin approves a membership payment request; service role + admin only.';

alter table public.membership_approval_emails enable row level security;
