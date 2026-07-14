-- Membership access flags on user_profiles (single source of truth alongside plan/expiry).
-- Admin + app must read membership_plan / membership_expiry / membership_suspended_at /
-- membership_archived_at from public.user_profiles only.

alter table public.user_profiles
  add column if not exists membership_suspended_at timestamptz,
  add column if not exists membership_archived_at timestamptz;

comment on column public.user_profiles.membership_suspended_at is
  'When set, paid access is blocked until cleared. Canonical suspend flag (SOT).';
comment on column public.user_profiles.membership_archived_at is
  'When set, member is archived. Canonical archive flag (SOT).';

-- Mirror existing profiles suspend/archive onto user_profiles once.
update public.user_profiles up
set
  membership_suspended_at = p.suspended_at,
  membership_archived_at = p.archived_at,
  updated_at = now()
from public.profiles p
where p.id = up.id
  and (
    up.membership_suspended_at is distinct from p.suspended_at
    or up.membership_archived_at is distinct from p.archived_at
  );

-- Keep user_profiles in sync when profiles lifecycle columns change
-- (profiles remains a mirror for legacy admin tooling; user_profiles is SOT for app reads).
create or replace function public.sync_user_profiles_membership_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_profiles
  set
    membership_plan = coalesce(nullif(new.plan_type, ''), 'free'),
    membership_start = coalesce(new.membership_activated_at, membership_start),
    membership_expiry = new.expires_at,
    membership_suspended_at = new.suspended_at,
    membership_archived_at = new.archived_at,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_user_profiles_membership on public.profiles;
create trigger profiles_sync_user_profiles_membership
after insert or update of plan_type, membership_activated_at, expires_at, suspended_at, archived_at
on public.profiles
for each row
execute function public.sync_user_profiles_membership_from_profiles();
