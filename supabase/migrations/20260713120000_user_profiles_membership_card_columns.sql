-- Member card + public verification fields on public.user_profiles (idempotent).

alter table public.user_profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists membership_plan text not null default 'free',
  add column if not exists membership_start timestamptz,
  add column if not exists membership_expiry timestamptz;

update public.user_profiles
set membership_plan = 'free'
where membership_plan is null
   or membership_plan not in ('free', 'premium', 'elite');

alter table public.user_profiles
  drop constraint if exists user_profiles_membership_plan_check;

alter table public.user_profiles
  add constraint user_profiles_membership_plan_check
  check (membership_plan in ('free', 'premium', 'elite'));

-- Backfill email from auth.users
update public.user_profiles up
set email = lower(trim(au.email))
from auth.users au
where up.id = au.id
  and (up.email is null or btrim(up.email) = '');

-- Backfill phone from dial + national digits
update public.user_profiles
set phone = trim(concat_ws(' ', nullif(phone_dial_code, ''), nullif(phone_national_digits, '')))
where (phone is null or btrim(phone) = '')
  and phone_national_digits is not null
  and btrim(phone_national_digits) <> '';

-- Backfill membership from profiles
update public.user_profiles up
set
  membership_plan = coalesce(nullif(p.plan_type, ''), 'free'),
  membership_start = coalesce(up.membership_start, p.membership_activated_at, up.created_at),
  membership_expiry = coalesce(up.membership_expiry, p.expires_at)
from public.profiles p
where p.id = up.id;

create or replace function public.sync_user_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select lower(trim(email)) into v_email from auth.users where id = new.id;
  if v_email is not null and v_email <> '' then
    new.email := v_email;
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_email_from_auth on public.user_profiles;
create trigger user_profiles_email_from_auth
before insert or update on public.user_profiles
for each row
execute function public.sync_user_profile_email_from_auth();

create or replace function public.sync_user_profile_phone_display()
returns trigger
language plpgsql
as $$
begin
  if new.phone_national_digits is not null and btrim(new.phone_national_digits) <> '' then
    new.phone := trim(concat_ws(' ', nullif(new.phone_dial_code, ''), nullif(new.phone_national_digits, '')));
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_phone_display on public.user_profiles;
create trigger user_profiles_phone_display
before insert or update of phone_dial_code, phone_national_digits on public.user_profiles
for each row
execute function public.sync_user_profile_phone_display();

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
    membership_start = coalesce(membership_start, new.membership_activated_at),
    membership_expiry = new.expires_at,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_user_profiles_membership on public.profiles;
create trigger profiles_sync_user_profiles_membership
after insert or update of plan_type, membership_activated_at, expires_at on public.profiles
for each row
execute function public.sync_user_profiles_membership_from_profiles();

create or replace function public.get_public_member_verification(p_fire_nepal_id text)
returns json
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (
      select json_build_object(
        'found', true,
        'full_name', full_name,
        'avatar_url', avatar_url,
        'fire_nepal_id', fire_nepal_id,
        'membership_plan', membership_plan,
        'membership_start', membership_start,
        'membership_expiry', membership_expiry,
        'country_of_work', country_of_work,
        'preferred_currency', preferred_currency
      )
      from public.user_profiles
      where fire_nepal_id = p_fire_nepal_id
      limit 1
    ),
    json_build_object('found', false)
  );
$$;

revoke all on function public.get_public_member_verification(text) from public;
grant execute on function public.get_public_member_verification(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
