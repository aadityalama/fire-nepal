-- Anti-regression: profiles trigger must NEVER demote user_profiles paid plans to Free.
-- user_profiles remains the sole source of truth for membership_plan.

create or replace function public.sync_user_profiles_membership_from_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Never invent Free from empty/null plan_type. Explicit Free on profiles is also ignored
  -- here — demotions must go through MembershipService.writeMembership with an admin reason.
  if new.plan_type is null or btrim(new.plan_type) = '' or new.plan_type = 'free' then
    -- Still sync suspend/archive flags without touching plan.
    update public.user_profiles
    set
      membership_suspended_at = new.suspended_at,
      membership_archived_at = new.archived_at,
      updated_at = now()
    where id = new.id;
    return new;
  end if;

  if new.plan_type not in ('premium', 'elite') then
    return new;
  end if;

  update public.user_profiles
  set
    membership_plan = new.plan_type,
    membership_start = coalesce(membership_start, new.membership_activated_at),
    membership_expiry = coalesce(new.expires_at, membership_expiry),
    membership_suspended_at = new.suspended_at,
    membership_archived_at = new.archived_at,
    updated_at = now()
  where id = new.id
    and (
      membership_plan is null
      or membership_plan = 'free'
      or membership_plan = new.plan_type
      or (membership_plan = 'premium' and new.plan_type = 'elite')
    );

  return new;
end;
$$;
