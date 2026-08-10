-- FIRE Nepal: Admin Content (YouTube Videos + Blog Posts) production migration
-- Safe to re-run (IF NOT EXISTS / idempotent policies where applicable).
-- Apply in Supabase Dashboard → SQL Editor, or:
--   npm run db:apply:youtube-videos && npm run db:apply:blog-posts
-- Verify:
--   npm run db:verify:youtube-videos && npm run db:verify:blog-posts

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


-- FIRE Nepal: blog posts — admin-managed homepage "Latest Blog Posts" + /blog routes.

-- ---------------------------------------------------------------------------
-- Admin helper (RLS) — idempotent
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
-- blog_posts
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  category text not null default '',
  reading_time text not null default '',
  excerpt text not null default '',
  content text not null default '',
  cover_image_url text,
  display_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  updated_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz
);

create unique index if not exists blog_posts_slug_active_uidx
  on public.blog_posts (slug)
  where deleted_at is null;

create index if not exists blog_posts_status_order_idx
  on public.blog_posts (status, display_order asc, created_at desc)
  where deleted_at is null;

create index if not exists blog_posts_deleted_idx
  on public.blog_posts (deleted_at desc nulls last);

alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_select_public on public.blog_posts;
create policy blog_posts_select_public
  on public.blog_posts for select
  using (
    deleted_at is null
    and status = 'published'
  );

drop policy if exists blog_posts_select_admin on public.blog_posts;
create policy blog_posts_select_admin
  on public.blog_posts for select
  to authenticated
  using (public.is_admin());

drop policy if exists blog_posts_insert_admin on public.blog_posts;
create policy blog_posts_insert_admin
  on public.blog_posts for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists blog_posts_update_admin on public.blog_posts;
create policy blog_posts_update_admin
  on public.blog_posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists blog_posts_delete_admin on public.blog_posts;
create policy blog_posts_delete_admin
  on public.blog_posts for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at
before update on public.blog_posts
for each row
execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: optional cover images (public read for blog pages)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog_covers',
  'blog_covers',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists blog_covers_public_read on storage.objects;
create policy blog_covers_public_read
  on storage.objects for select
  using (bucket_id = 'blog_covers');

drop policy if exists blog_covers_admin_insert on storage.objects;
create policy blog_covers_admin_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'blog_covers'
    and public.is_admin()
  );

drop policy if exists blog_covers_admin_update on storage.objects;
create policy blog_covers_admin_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'blog_covers'
    and public.is_admin()
  )
  with check (
    bucket_id = 'blog_covers'
    and public.is_admin()
  );

drop policy if exists blog_covers_admin_delete on storage.objects;
create policy blog_covers_admin_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'blog_covers'
    and public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- Seed existing homepage blog posts (idempotent by slug)
-- ---------------------------------------------------------------------------
insert into public.blog_posts (
  title,
  slug,
  category,
  reading_time,
  excerpt,
  content,
  cover_image_url,
  display_order,
  status,
  published_at,
  created_at,
  updated_at
)
select
  v.title,
  v.slug,
  v.category,
  v.reading_time,
  v.excerpt,
  v.content,
  null,
  v.display_order,
  'published',
  now() - (v.display_order || ' days')::interval,
  now() - (v.display_order || ' days')::interval,
  now() - (v.display_order || ' days')::interval
from (
  values
    (
      'How to invest your abroad salary for Nepal goals',
      'how-to-invest-your-abroad-salary-for-nepal-goals',
      'Money guide',
      '5 min read',
      'Turn overseas income into a clear Nepal-focused investment plan without losing money to fees or currency swings.',
      E'## Invest your abroad salary with Nepal in mind\n\nEarning in KRW (or another foreign currency) while building wealth for Nepal requires a simple system: **save first, convert with intent, and invest toward named goals**.\n\n### 1. Separate lifestyle and Nepal capital\nKeep a fixed monthly transfer target for Nepal goals (home, emergency fund, SIP, family support) before discretionary spending abroad.\n\n### 2. Choose the right remittance path\nCompare fee + FX spread, not just the advertised rate. Small monthly differences compound over years of overseas work.\n\n### 3. Match products to time horizon\n- **0–12 months:** emergency cash / high-liquidity NPR reserves\n- **1–5 years:** balanced SIPs and diversified mutual funds\n- **5+ years:** equity-heavy long-term FIRE portfolio\n\n### 4. Track net worth in both currencies\nReview KRW income, NPR goals, and FX impact monthly so a strong month abroad still maps to progress at home.\n\nFIRE Nepal tools (Currency Converter, Remittance Calculator, Saving Goals, and FIRE Summary) help you keep this system visible in one place.',
      1
    ),
    (
      'FIRE mistakes Nepali workers make abroad',
      'fire-mistakes-nepali-workers-make-abroad',
      'Retirement',
      '7 min read',
      'Common FIRE traps for Nepalis working overseas — and practical fixes that protect your return timeline.',
      E'## FIRE mistakes that delay Nepal return\n\nMany Nepali workers abroad save hard but still miss FIRE targets. These are the mistakes we see most often — and how to fix them.\n\n### 1. No written Nepal return number\nWithout a corpus target in NPR (and a date), saving feels endless. Define housing, lifestyle, and buffer in today''s NPR, then inflate forward.\n\n### 2. Ignoring currency and remittance drag\nSending money home ad hoc can erase years of discipline. Plan transfers when spreads are reasonable and automate a baseline amount.\n\n### 3. Lifestyle creep abroad\nA higher KRW salary often expands rent, gadgets, and dining. Lock a savings rate first; let lifestyle grow only after goals are funded.\n\n### 4. All cash, no growth assets\nParking everything in a bank account feels safe but loses to inflation. Pair safety cash with long-term SIPs sized to your FIRE date.\n\n### 5. Skipping insurance and emergency funds\nOne medical or visa shock can force early withdrawals. Keep 6–12 months of expenses liquid before aggressive investing.\n\n### 6. No review cadence\nFIRE is a system, not a one-time plan. Review savings rate, FX, and progress every month — then adjust.\n\nUse FIRE Nepal''s readiness score, reminders, and planners to catch these issues early.',
      2
    ),
    (
      'Multi-currency remittance: what to track before coming home',
      'multi-currency-remittance-what-to-track-before-coming-home',
      'Currency',
      '4 min read',
      'A practical checklist for KRW→NPR remittance before you return — fees, timing, and records that matter.',
      E'## Remittance checklist before returning to Nepal\n\nMoving money home is part logistics, part strategy. Track these items so your final months abroad do not leak value.\n\n### Fee + FX spread\nAlways compare **all-in NPR received**, not just the mid-market rate. Note weekends, holidays, and bank cut-offs.\n\n### Transfer timing\nLarge one-time transfers near departure can hit poor rates. Ladder transfers over weeks when your schedule allows.\n\n### Destination account readiness\nConfirm NPR account limits, KYC, and whether family accounts can receive funds if you travel.\n\n### Tax and documentation\nKeep remittance receipts, employment proof, and bank statements organized for Nepal banking or property purchases.\n\n### Emergency buffer abroad\nLeave enough KRW for final rent, flights, deposits, and contingencies so you are not forced into a panic transfer.\n\n### Goal tagging\nLabel each transfer: emergency fund, home down payment, SIP capital, family support. Clarity prevents “mystery money” later.\n\nFIRE Nepal''s Remittance Calculator and Currency Converter make fee and rate comparisons faster before you hit send.',
      3
    )
) as v(title, slug, category, reading_time, excerpt, content, display_order)
where not exists (
  select 1
  from public.blog_posts bp
  where bp.slug = v.slug
    and bp.deleted_at is null
);

