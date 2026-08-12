import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicSupabaseClient, withServerTimeout } from "@/lib/supabase/server";
import { HOMEPAGE_BLOG_SEED, homepageBlogFallbackList } from "@/lib/blog-posts/seed-posts";
import type { BlogPostListItem, BlogPostPublic } from "@/lib/blog-posts/types";
import type { Database } from "@/types/supabase-database";

const LIST_COLUMNS =
  "id, title, slug, category, reading_time, excerpt, cover_image_url, display_order, published_at";

const FULL_COLUMNS =
  "id, title, slug, category, reading_time, excerpt, content, cover_image_url, display_order, published_at";

/** Keep homepage /blog SSR snappy when PostgREST/DB is saturated (DatabaseTimeout). */
const PUBLIC_FETCH_TIMEOUT_MS = 2_500;

async function queryPublishedList(
  client: SupabaseClient<Database>,
  limit: number,
): Promise<BlogPostListItem[] | null> {
  const { data, error } = await withServerTimeout(
    client
      .from("blog_posts")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit),
    PUBLIC_FETCH_TIMEOUT_MS,
    "blog_posts.list",
  );
  if (error || !data?.length) return null;
  return data as BlogPostListItem[];
}

/** Published posts for homepage Latest Blog Posts (numbered cards). */
export async function fetchPublishedBlogPosts(limit = 3): Promise<BlogPostListItem[]> {
  if (!isSupabaseConfigured()) {
    return homepageBlogFallbackList().slice(0, limit);
  }

  try {
    const rows = await queryPublishedList(createPublicSupabaseClient(), limit);
    if (rows?.length) return rows;

    const admin = createSupabaseServiceRoleClient();
    if (admin) {
      const seeded = await queryPublishedList(admin, limit);
      if (seeded?.length) return seeded;
    }
    return homepageBlogFallbackList().slice(0, limit);
  } catch {
    return homepageBlogFallbackList().slice(0, limit);
  }
}

/** All published posts for /blog index. */
export async function fetchAllPublishedBlogPosts(): Promise<BlogPostListItem[]> {
  return fetchPublishedBlogPosts(100);
}

/** Single published post by slug for /blog/[slug]. */
export async function fetchPublishedBlogPostBySlug(slug: string): Promise<BlogPostPublic | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  if (!isSupabaseConfigured()) {
    return HOMEPAGE_BLOG_SEED.find((p) => p.slug === normalized) ?? null;
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await withServerTimeout(
      supabase
        .from("blog_posts")
        .select(FULL_COLUMNS)
        .eq("slug", normalized)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle(),
      PUBLIC_FETCH_TIMEOUT_MS,
      "blog_posts.slug",
    );

    if (!error && data) return data as BlogPostPublic;

    const admin = createSupabaseServiceRoleClient();
    if (admin) {
      const seeded = await withServerTimeout(
        admin
          .from("blog_posts")
          .select(FULL_COLUMNS)
          .eq("slug", normalized)
          .eq("status", "published")
          .is("deleted_at", null)
          .maybeSingle(),
        PUBLIC_FETCH_TIMEOUT_MS,
        "blog_posts.slug.admin",
      );
      if (seeded.data) return seeded.data as BlogPostPublic;
    }

    return HOMEPAGE_BLOG_SEED.find((p) => p.slug === normalized) ?? null;
  } catch {
    return HOMEPAGE_BLOG_SEED.find((p) => p.slug === normalized) ?? null;
  }
}
