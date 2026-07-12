-- Premium Profile Dashboard: persist saved member profile fields in Supabase.

alter table public.user_profiles
  add column if not exists phone_dial_code text,
  add column if not exists phone_national_digits text,
  add column if not exists country text,
  add column if not exists country_of_work text,
  add column if not exists fire_goal_amount numeric,
  add column if not exists monthly_investment numeric,
  add column if not exists risk_profile text check (
    risk_profile is null
    or risk_profile in ('conservative', 'balanced', 'growth', 'aggressive')
  );
