-- FIRE Nepal: community reviews — public homepage testimonials + user submissions + admin moderation.

-- ---------------------------------------------------------------------------
-- Admin helper (RLS)
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
-- community_reviews
-- ---------------------------------------------------------------------------
create table if not exists public.community_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  full_name text not null,
  country text,
  city text,
  avatar_url text,
  rating smallint not null check (rating >= 1 and rating <= 5),
  review_title text not null,
  review_text text not null,
  verified boolean not null default false,
  is_demo boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz
);

create index if not exists community_reviews_status_order_idx
  on public.community_reviews (status, display_order asc, created_at desc)
  where deleted_at is null;

create index if not exists community_reviews_user_idx
  on public.community_reviews (user_id)
  where user_id is not null;

create index if not exists community_reviews_demo_idx
  on public.community_reviews (is_demo, display_order asc);

create index if not exists community_reviews_deleted_idx
  on public.community_reviews (deleted_at desc nulls last);

create unique index if not exists community_reviews_one_active_per_user_uidx
  on public.community_reviews (user_id)
  where user_id is not null and deleted_at is null;

alter table public.community_reviews enable row level security;

-- Public: approved, non-deleted reviews only
drop policy if exists community_reviews_select_public on public.community_reviews;
create policy community_reviews_select_public
  on public.community_reviews for select
  using (
    deleted_at is null
    and status = 'approved'
  );

-- Authenticated users: read own review regardless of status
drop policy if exists community_reviews_select_own on public.community_reviews;
create policy community_reviews_select_own
  on public.community_reviews for select
  to authenticated
  using (
    auth.uid() = user_id
  );

-- Admins: read all
drop policy if exists community_reviews_select_admin on public.community_reviews;
create policy community_reviews_select_admin
  on public.community_reviews for select
  to authenticated
  using (public.is_admin());

-- Users: insert one pending review for themselves
drop policy if exists community_reviews_insert_own on public.community_reviews;
create policy community_reviews_insert_own
  on public.community_reviews for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and is_demo = false
    and deleted_at is null
    and not exists (
      select 1
      from public.community_reviews cr
      where cr.user_id = auth.uid()
        and cr.deleted_at is null
    )
  );

-- Users: update own non-deleted review (cannot self-approve)
drop policy if exists community_reviews_update_own on public.community_reviews;
create policy community_reviews_update_own
  on public.community_reviews for update
  to authenticated
  using (
    auth.uid() = user_id
    and deleted_at is null
  )
  with check (
    auth.uid() = user_id
    and status in ('pending', 'approved', 'rejected')
    and is_demo = false
  );

-- Admins: full write access
drop policy if exists community_reviews_insert_admin on public.community_reviews;
create policy community_reviews_insert_admin
  on public.community_reviews for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists community_reviews_update_admin on public.community_reviews;
create policy community_reviews_update_admin
  on public.community_reviews for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists community_reviews_delete_admin on public.community_reviews;
create policy community_reviews_delete_admin
  on public.community_reviews for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
drop trigger if exists community_reviews_updated_at on public.community_reviews;
create trigger community_reviews_updated_at
before update on public.community_reviews
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: review avatars (public read for homepage cards)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community_review_avatars',
  'community_review_avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists community_review_avatars_public_read on storage.objects;
create policy community_review_avatars_public_read
  on storage.objects for select
  using (bucket_id = 'community_review_avatars');

drop policy if exists community_review_avatars_admin_insert on storage.objects;
create policy community_review_avatars_admin_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community_review_avatars'
    and public.is_admin()
  );

drop policy if exists community_review_avatars_admin_update on storage.objects;
create policy community_review_avatars_admin_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community_review_avatars'
    and public.is_admin()
  )
  with check (
    bucket_id = 'community_review_avatars'
    and public.is_admin()
  );

drop policy if exists community_review_avatars_admin_delete on storage.objects;
create policy community_review_avatars_admin_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community_review_avatars'
    and public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Seed homepage demo reviews (idempotent — preserves existing rows)
-- ---------------------------------------------------------------------------
insert into public.community_reviews (
  user_id,
  full_name,
  country,
  city,
  avatar_url,
  rating,
  review_title,
  review_text,
  verified,
  is_demo,
  status,
  display_order,
  created_at,
  updated_at
)
select
  null,
  v.full_name,
  v.country,
  v.city,
  null,
  v.rating,
  v.review_title,
  v.review_text,
  v.verified,
  true,
  'approved',
  v.display_order,
  now() - (v.display_order || ' days')::interval,
  now() - (v.display_order || ' days')::interval
from (
  values
    ('Bikash Gurung', 'Korea', 'Busan', 5, 'Nepal return planning made practical', 'The planner finally made my Nepal return number feel practical.', true, 1),
    ('Sita Magar', 'Korea', 'Incheon', 5, 'Savings and remittance planning', 'Savings tracker and cost planning changed how I send money home.', true, 2),
    ('Rajesh Chaudhary', 'Korea', 'Daegu', 5, 'Clear emergency fund and SIP steps', 'AI advice gave me clear steps for emergency fund and SIPs.', true, 3),
    ('Anita Shrestha', 'Korea', 'Seoul', 5, 'All-in-one FIRE progress view', 'I can see FIRE progress, family goals, and readiness in one place.', true, 4)
) as v(full_name, country, city, rating, review_title, review_text, verified, display_order)
where not exists (
  select 1
  from public.community_reviews cr
  where cr.is_demo = true
    and cr.full_name = v.full_name
    and cr.display_order = v.display_order
);
