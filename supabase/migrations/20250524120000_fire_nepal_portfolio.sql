-- FIRE Nepal: user profiles, portfolio tables, RLS, realtime, auth hook.
-- Apply in Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- user_profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  preferred_currency text not null default 'NPR' check (preferred_currency in ('NPR', 'KRW', 'USD')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_updated_at_idx on public.user_profiles (updated_at desc);

-- ---------------------------------------------------------------------------
-- Portfolio: JSON payload per row (client row id = stable id from app)
-- ---------------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null,
  account_kind text not null check (account_kind in ('liquid', 'fd')),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, row_id)
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, row_id)
);

create table if not exists public.gold_assets (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, row_id)
);

create table if not exists public.real_estate (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, row_id)
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, row_id)
);

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, row_id)
);

create table if not exists public.retirement_assets (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  row_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, row_id)
);

create table if not exists public.fire_goals (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'FIRE target',
  target_amount_npr numeric,
  target_age integer,
  target_month text,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists fire_goals_user_idx on public.fire_goals (user_id);

-- Ledger + net worth history (rest of WealthPortfolioStateV2)
create table if not exists public.portfolio_extensions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ledger jsonb not null default '[]'::jsonb,
  net_worth_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.user_profiles enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.investments enable row level security;
alter table public.gold_assets enable row level security;
alter table public.real_estate enable row level security;
alter table public.vehicles enable row level security;
alter table public.liabilities enable row level security;
alter table public.retirement_assets enable row level security;
alter table public.fire_goals enable row level security;
alter table public.portfolio_extensions enable row level security;

create policy "user_profiles_self" on public.user_profiles for all using (auth.uid () = id) with check (auth.uid () = id);

create policy "bank_accounts_self" on public.bank_accounts for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "investments_self" on public.investments for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "gold_assets_self" on public.gold_assets for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "real_estate_self" on public.real_estate for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "vehicles_self" on public.vehicles for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "liabilities_self" on public.liabilities for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "retirement_assets_self" on public.retirement_assets for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "fire_goals_self" on public.fire_goals for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create policy "portfolio_extensions_self" on public.portfolio_extensions for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

-- ---------------------------------------------------------------------------
-- New user → profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- Realtime: in the Supabase dashboard, enable replication for
-- public.portfolio_extensions (Database → Replication) for live cross-tab sync.
-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at before update on public.user_profiles for each row
execute procedure public.set_updated_at ();

create trigger portfolio_extensions_updated_at before update on public.portfolio_extensions for each row
execute procedure public.set_updated_at ();
