-- Membership Phase 1: expiry + suspension on profiles, helper for UI status, backfill from subscriptions.

-- ---------------------------------------------------------------------------
-- profiles: activation, expiry, suspension
-- ---------------------------------------------------------------------------
alter table public.profiles
add column if not exists membership_activated_at timestamptz;

alter table public.profiles
add column if not exists expires_at timestamptz;

alter table public.profiles
add column if not exists suspended_at timestamptz;

comment on column public.profiles.membership_activated_at is 'First paid activation / approval time (display + audit).';

comment on column public.profiles.expires_at is 'End of current paid membership window (authoritative with subscriptions.current_period_end).';

comment on column public.profiles.suspended_at is 'When set, user is suspended — no premium/elite access until cleared.';

create index if not exists profiles_expires_at_idx on public.profiles (expires_at desc nulls last);

create index if not exists profiles_suspended_at_idx on public.profiles (suspended_at desc nulls last)
where
  suspended_at is not null;

-- Backfill from subscriptions for existing paid members
update public.profiles p
set
  expires_at = coalesce(p.expires_at, s.current_period_end),
  membership_activated_at = coalesce(p.membership_activated_at, s.current_period_start, s.created_at)
from
  public.subscriptions s
where
  s.user_id = p.id
  and p.plan_type in ('premium', 'elite');

-- ---------------------------------------------------------------------------
-- Helper: UI / filter bucket (stable — uses statement_timestamp() via now())
-- ---------------------------------------------------------------------------
create or replace function public.profile_membership_ui_bucket (
  p_plan_type text,
  p_expires_at timestamptz,
  p_suspended_at timestamptz,
  p_now timestamptz default now()
) returns text
language sql
stable
as $$
  select case
    when p_suspended_at is not null then 'suspended'
    when p_plan_type is null
    or p_plan_type = 'free' then 'free'
    when p_expires_at is not null
    and p_expires_at <= p_now then 'expired'
    when p_expires_at is not null
    and p_expires_at <= p_now + interval '7 days' then 'expiring_soon'
    when p_plan_type in ('premium', 'elite') then 'active'
    else 'free'
  end;
$$;

comment on function public.profile_membership_ui_bucket (text, timestamptz, timestamptz, timestamptz) is
'Returns free | active | expiring_soon | expired | suspended for admin filters and badges.';
