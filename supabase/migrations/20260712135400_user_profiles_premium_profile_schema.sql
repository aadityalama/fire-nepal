-- Premium Profile Dashboard: production-safe user_profiles schema extension.
-- Idempotent and data-preserving for existing user profile rows.

alter table public.user_profiles
  add column if not exists phone_dial_code text,
  add column if not exists phone_national_digits text,
  add column if not exists country text,
  add column if not exists country_of_work text,
  add column if not exists fire_goal numeric,
  add column if not exists monthly_investment numeric,
  add column if not exists risk_profile text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'fire_goal_amount'
  ) then
    execute 'update public.user_profiles set fire_goal = coalesce(fire_goal, fire_goal_amount) where fire_goal_amount is not null';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_risk_profile_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_risk_profile_check
      check (
        risk_profile is null
        or risk_profile in ('conservative', 'balanced', 'growth', 'aggressive')
      );
  end if;
end
$$;

notify pgrst, 'reload schema';
