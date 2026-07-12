-- Canonical FIRE Nepal member ID.
-- The UI must read public.user_profiles.fire_nepal_id directly and never derive or reformat it.

alter table public.user_profiles
  add column if not exists fire_nepal_id text;

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

notify pgrst, 'reload schema';
