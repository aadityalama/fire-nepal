-- NEPSE watchlist (per-user symbol list, synced to all devices)
-- Apply in Supabase SQL editor or via `supabase db push`.

create table if not exists public.nepse_watchlist (
  user_id uuid primary key references auth.users (id) on delete cascade,
  symbols text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create index if not exists nepse_watchlist_updated_at_idx on public.nepse_watchlist (updated_at desc);

alter table public.nepse_watchlist enable row level security;

create policy "nepse_watchlist_self" on public.nepse_watchlist for all using (auth.uid () = user_id) with check (auth.uid () = user_id);

create trigger nepse_watchlist_updated_at before update on public.nepse_watchlist for each row
execute procedure public.set_updated_at ();
