-- Align public.membership_requests with app columns: plan_type, proof_url (storage object path), created_at.
-- Idempotent: creates the table if missing; renames legacy columns (plan, proof_storage_path, submitted_at) when present.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'membership_requests'
      and c.relkind = 'r'
  ) then
    create table public.membership_requests (
      id uuid primary key default gen_random_uuid (),
      user_id uuid not null references auth.users (id) on delete cascade,
      email text not null,
      plan_type text not null check (plan_type in ('premium', 'elite')),
      payment_method text not null check (payment_method in ('khalti_qr', 'esewa_qr', 'global_ime_qr')),
      -- Object path in private bucket `membership_payment_proofs`; app issues signed URLs on read.
      proof_url text not null,
      reference text,
      status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
      created_at timestamptz not null default now (),
      reviewed_at timestamptz,
      reviewed_by uuid references auth.users (id) on delete set null
    );
  else
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'membership_requests'
        and column_name = 'plan'
    )
    and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'membership_requests'
        and column_name = 'plan_type'
    ) then
      alter table public.membership_requests rename column plan to plan_type;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'membership_requests'
        and column_name = 'proof_storage_path'
    )
    and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'membership_requests'
        and column_name = 'proof_url'
    ) then
      alter table public.membership_requests rename column proof_storage_path to proof_url;
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'membership_requests'
        and column_name = 'submitted_at'
    )
    and not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'membership_requests'
        and column_name = 'created_at'
    ) then
      alter table public.membership_requests rename column submitted_at to created_at;
    end if;
  end if;
end $$;

create index if not exists membership_requests_user_idx on public.membership_requests (user_id);

drop index if exists membership_requests_status_submitted_idx;

create index if not exists membership_requests_status_created_idx on public.membership_requests (status, created_at desc);

alter table public.membership_requests enable row level security;

drop policy if exists "membership_requests_select_own" on public.membership_requests;

create policy "membership_requests_select_own" on public.membership_requests for select to authenticated using (auth.uid () = user_id);

drop policy if exists "membership_requests_insert_own" on public.membership_requests;

create policy "membership_requests_insert_own" on public.membership_requests for insert to authenticated with check (auth.uid () = user_id);
