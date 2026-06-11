-- FIRE Nepal: one authenticated workspace per user.
-- This gives dashboard data a first-class ownership record instead of relying only on
-- localStorage namespace conventions or portfolio row user_id fields.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default 'FIRE Nepal Workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_user_id_unique unique (user_id)
);

create index if not exists workspaces_user_idx on public.workspaces (user_id);
create index if not exists workspaces_updated_at_idx on public.workspaces (updated_at desc);

alter table public.workspaces enable row level security;

drop policy if exists "workspaces_self" on public.workspaces;
create policy "workspaces_self"
  on public.workspaces for all
  using (auth.uid () = user_id)
  with check (auth.uid () = user_id);

create or replace function public.ensure_user_workspace ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspaces (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_workspace on auth.users;

create trigger on_auth_user_created_workspace
after insert on auth.users for each row
execute procedure public.ensure_user_workspace ();

insert into public.workspaces (user_id)
select id from auth.users
on conflict (user_id) do nothing;

do $$
begin
  if exists (
    select 1
    from information_schema.routines
    where routine_schema = 'public'
      and routine_name = 'set_updated_at'
  ) then
    drop trigger if exists workspaces_updated_at on public.workspaces;
    create trigger workspaces_updated_at
    before update on public.workspaces for each row
    execute procedure public.set_updated_at ();
  end if;
end $$;

notify pgrst, 'reload schema';
