-- Canonical logged-in user display name.
-- UI reads public.user_profiles.full_name only.

alter table public.user_profiles
  add column if not exists full_name text;

update public.user_profiles
set full_name = nullif(trim(display_name), '')
where (full_name is null or trim(full_name) = '')
  and display_name is not null
  and trim(display_name) <> '';

create or replace function public.handle_new_user_profile ()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'avatarUrl')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
