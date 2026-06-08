-- Idempotent: some databases never received `20260607150000_profiles_membership_expiry_suspend.sql`
-- (or were created from an older snapshot). App code expects these columns on `public.profiles`.

alter table public.profiles
add column if not exists membership_activated_at timestamptz;

alter table public.profiles
add column if not exists expires_at timestamptz;

alter table public.profiles
add column if not exists suspended_at timestamptz;

alter table public.profiles
add column if not exists archived_at timestamptz;

comment on column public.profiles.membership_activated_at is 'First paid activation / approval time (display + audit).';

comment on column public.profiles.expires_at is 'End of current paid membership window (authoritative with subscriptions.current_period_end).';

comment on column public.profiles.suspended_at is 'When set, user is suspended — no premium/elite access until cleared.';

comment on column public.profiles.archived_at is
'When set, member is archived — excluded from active renewal KPIs; paid access revoked; reversible by clearing.';

create index if not exists profiles_expires_at_idx on public.profiles (expires_at desc nulls last);

create index if not exists profiles_suspended_at_idx on public.profiles (suspended_at desc nulls last)
where
  suspended_at is not null;

create index if not exists profiles_archived_at_idx on public.profiles (archived_at desc nulls last)
where
  archived_at is not null;

-- Align profile mirror with subscription period end where missing
update public.profiles p
set
  expires_at = coalesce(p.expires_at, s.current_period_end),
  membership_activated_at = coalesce(p.membership_activated_at, s.current_period_start, s.created_at)
from
  public.subscriptions s
where
  s.user_id = p.id
  and p.plan_type in ('premium', 'elite');

notify pgrst, 'reload schema';
