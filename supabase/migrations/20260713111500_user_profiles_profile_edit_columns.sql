-- Profile Edit: ensure production user_profiles has the canonical editable profile columns.
-- Idempotent and data-preserving; do not recreate public.user_profiles.

alter table public.user_profiles
  add column if not exists country text,
  add column if not exists country_of_work text,
  add column if not exists preferred_currency text not null default 'NPR',
  add column if not exists fire_goal numeric,
  add column if not exists monthly_investment numeric,
  add column if not exists risk_profile text,
  add column if not exists phone_dial_code text,
  add column if not exists phone_national_digits text,
  add column if not exists fire_nepal_id text,
  add column if not exists full_name text;

update public.user_profiles
set preferred_currency = 'NPR'
where preferred_currency is null
   or preferred_currency not in ('NPR', 'KRW', 'USD');

alter table public.user_profiles
  alter column preferred_currency set default 'NPR',
  alter column preferred_currency set not null;

update public.user_profiles
set full_name = nullif(trim(display_name), '')
where (full_name is null or trim(full_name) = '')
  and display_name is not null
  and trim(display_name) <> '';

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
    where conname = 'user_profiles_preferred_currency_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_preferred_currency_check
      check (preferred_currency in ('NPR', 'KRW', 'USD'));
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

create sequence if not exists public.user_profiles_fire_nepal_serial_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create or replace function public.format_fire_nepal_id(joined_at timestamptz, member_serial bigint)
returns text
language sql
stable
as $$
  select 'FN-'
    || extract(year from coalesce(joined_at, now()))::int::text
    || '-'
    || lpad(member_serial::text, 6, '0');
$$;

update public.user_profiles
set fire_nepal_id = public.format_fire_nepal_id(
  created_at,
  nextval('public.user_profiles_fire_nepal_serial_seq'::regclass)
)
where fire_nepal_id is null
   or btrim(fire_nepal_id) = '';

select setval(
  'public.user_profiles_fire_nepal_serial_seq'::regclass,
  greatest(
    coalesce(
      (
        select max(split_part(fire_nepal_id, '-', 3)::bigint)
        from public.user_profiles
        where fire_nepal_id ~ '^FN-[0-9]{4}-[0-9]{6}$'
      ),
      1
    ),
    1
  ),
  true
);

create unique index if not exists user_profiles_fire_nepal_id_uidx
  on public.user_profiles (fire_nepal_id)
  where fire_nepal_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_fire_nepal_id_format_check'
      and conrelid = 'public.user_profiles'::regclass
  ) then
    alter table public.user_profiles
      add constraint user_profiles_fire_nepal_id_format_check
      check (fire_nepal_id is null or fire_nepal_id ~ '^FN-[0-9]{4}-[0-9]{6}$');
  end if;
end
$$;

create or replace function public.set_user_profile_fire_nepal_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fire_nepal_id is null or btrim(new.fire_nepal_id) = '' then
    new.fire_nepal_id := public.format_fire_nepal_id(
      coalesce(new.created_at, now()),
      nextval('public.user_profiles_fire_nepal_serial_seq'::regclass)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists user_profiles_fire_nepal_id_before_insert on public.user_profiles;

create trigger user_profiles_fire_nepal_id_before_insert
before insert on public.user_profiles
for each row
execute procedure public.set_user_profile_fire_nepal_id();

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    nullif(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'avatarUrl'), '')
  )
  on conflict (id) do update
  set
    full_name = coalesce(nullif(public.user_profiles.full_name, ''), excluded.full_name),
    avatar_url = coalesce(public.user_profiles.avatar_url, excluded.avatar_url),
    updated_at = now();
  return new;
end;
$$;

notify pgrst, 'reload schema';
