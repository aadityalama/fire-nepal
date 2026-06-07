-- Admin-only member notes (Phase 2). Accessed exclusively via service role in Next.js admin API routes.

create table if not exists public.admin_member_notes (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) > 0 and char_length(body) <= 8000),
  author_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now ()
);

create index if not exists admin_member_notes_user_created_idx on public.admin_member_notes (user_id, created_at desc);

comment on table public.admin_member_notes is 'Internal admin notes per member; no client RLS policies — use service role only.';

alter table public.admin_member_notes enable row level security;

drop trigger if exists admin_member_notes_updated_at on public.admin_member_notes;

create trigger admin_member_notes_updated_at before update on public.admin_member_notes for each row
execute procedure public.set_updated_at ();
