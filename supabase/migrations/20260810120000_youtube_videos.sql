-- FIRE Nepal: YouTube videos — admin-managed homepage "Latest YouTube Videos".

-- ---------------------------------------------------------------------------
-- Admin helper (RLS) — idempotent if community_reviews migration already ran
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- youtube_videos
-- ---------------------------------------------------------------------------
create table if not exists public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  youtube_video_id text not null,
  duration text not null default '',
  thumbnail_url text not null,
  display_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz
);

create index if not exists youtube_videos_status_order_idx
  on public.youtube_videos (status, display_order asc, created_at desc)
  where deleted_at is null;

create index if not exists youtube_videos_video_id_idx
  on public.youtube_videos (youtube_video_id)
  where deleted_at is null;

create index if not exists youtube_videos_deleted_idx
  on public.youtube_videos (deleted_at desc nulls last);

alter table public.youtube_videos enable row level security;

-- Public: published, non-deleted videos only
drop policy if exists youtube_videos_select_public on public.youtube_videos;
create policy youtube_videos_select_public
  on public.youtube_videos for select
  using (
    deleted_at is null
    and status = 'published'
  );

-- Admins: read all
drop policy if exists youtube_videos_select_admin on public.youtube_videos;
create policy youtube_videos_select_admin
  on public.youtube_videos for select
  to authenticated
  using (public.is_admin());

-- Admins: full write access
drop policy if exists youtube_videos_insert_admin on public.youtube_videos;
create policy youtube_videos_insert_admin
  on public.youtube_videos for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists youtube_videos_update_admin on public.youtube_videos;
create policy youtube_videos_update_admin
  on public.youtube_videos for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists youtube_videos_delete_admin on public.youtube_videos;
create policy youtube_videos_delete_admin
  on public.youtube_videos for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
drop trigger if exists youtube_videos_updated_at on public.youtube_videos;
create trigger youtube_videos_updated_at
before update on public.youtube_videos
for each row
execute procedure public.set_updated_at();
