import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HOMEPAGE_BLOG_SEED, homepageBlogFallbackList } from "@/lib/blog-posts/seed-posts";
import type { BlogPostListItem, BlogPostPublic } from "@/lib/blog-posts/types";

const LIST_COLUMNS =
  "id, title, slug, category, reading_time, excerpt, cover_image_url, display_order, published_at";

const FULL_COLUMNS =
  "id, title, slug, category, reading_time, excerpt, content, cover_image_url, display_order, published_at";

/** Published posts for homepage Latest Blog Posts (numbered cards). */
export async function fetchPublishedBlogPosts(limit = 3): Promise<BlogPostListItem[]> {
  if (!isSupabaseConfigured()) {
    return homepageBlogFallbackList().slice(0, limit);
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(LIST_COLUMNS)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data?.length) {
      const admin = createSupabaseServiceRoleClient();
      if (admin) {
        const seeded = await admin
          .from("blog_posts")
          .select(LIST_COLUMNS)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false })
          .limit(limit);
        if (seeded.data?.length) return seeded.data as BlogPostListItem[];
      }
      return homepageBlogFallbackList().slice(0, limit);
    }

    return data as BlogPostListItem[];
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
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(FULL_COLUMNS)
      .eq("slug", normalized)
      .eq("status", "published")
      .is("deleted_at", null)
      .maybeSingle();

    if (!error && data) return data as BlogPostPublic;

    const admin = createSupabaseServiceRoleClient();
    if (admin) {
      const seeded = await admin
        .from("blog_posts")
        .select(FULL_COLUMNS)
        .eq("slug", normalized)
        .eq("status", "published")
        .is("deleted_at", null)
        .maybeSingle();
      if (seeded.data) return seeded.data as BlogPostPublic;
    }

    return HOMEPAGE_BLOG_SEED.find((p) => p.slug === normalized) ?? null;
  } catch {
    return HOMEPAGE_BLOG_SEED.find((p) => p.slug === normalized) ?? null;
  }
}
