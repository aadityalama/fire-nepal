import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";
import { normalizeReadingTime, slugifyBlogTitle } from "@/lib/blog-posts/slug";
import type {
  BlogPostAdminStats,
  BlogPostListFilters,
  BlogPostRow,
  BlogPostStatus,
} from "@/lib/blog-posts/types";

type Client = SupabaseClient<Database>;
type BlogPostUpdate = Database["public"]["Tables"]["blog_posts"]["Update"];
type BlogPostInsert = Database["public"]["Tables"]["blog_posts"]["Insert"];

export const BLOG_COVER_BUCKET = "blog_covers";

const ADMIN_COLUMNS =
  "id, title, slug, category, reading_time, excerpt, content, cover_image_url, display_order, status, created_at, updated_at, published_at, updated_by, deleted_at";

export function blogCoverPath(postId: string, ext: string): string {
  return `${postId}/cover.${ext.replace(/^\./, "")}`;
}

export async function listBlogPostsAdmin(
  client: Client,
  filters: BlogPostListFilters = {},
): Promise<{ rows: BlogPostRow[]; total: number }> {
  let query = client.from("blog_posts").select(ADMIN_COLUMNS, { count: "exact" });

  if (!filters.include_deleted) {
    query = query.is("deleted_at", null);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const search = filters.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    query = query.or(
      `title.ilike.%${escaped}%,category.ilike.%${escaped}%,slug.ilike.%${escaped}%,excerpt.ilike.%${escaped}%`,
    );
  }

  const { data, error, count } = await query
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as BlogPostRow[], total: count ?? 0 };
}

export async function blogPostAdminStats(client: Client): Promise<BlogPostAdminStats> {
  const [allRes, draftRes, publishedRes, deletedRes] = await Promise.all([
    client.from("blog_posts").select("*", { count: "exact", head: true }).is("deleted_at", null),
    client
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft")
      .is("deleted_at", null),
    client
      .from("blog_posts")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    client.from("blog_posts").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
  ]);

  return {
    total: allRes.count ?? 0,
    draft: draftRes.count ?? 0,
    published: publishedRes.count ?? 0,
    deleted: deletedRes.count ?? 0,
  };
}

async function ensureUniqueSlug(client: Client, slug: string, excludeId?: string): Promise<string> {
  let candidate = slug;
  for (let i = 0; i < 50; i += 1) {
    let q = client.from("blog_posts").select("id").eq("slug", candidate).is("deleted_at", null);
    if (excludeId) q = q.neq("id", excludeId);
    const { data } = await q.limit(1).maybeSingle();
    if (!data) return candidate;
    candidate = `${slug}-${i + 2}`;
  }
  return `${slug}-${Date.now()}`;
}

export async function buildBlogPostInsert(
  client: Client,
  input: {
    title: string;
    slug?: string;
    category?: string;
    reading_time?: string;
    excerpt?: string;
    content?: string;
    cover_image_url?: string | null;
    display_order?: number;
    status?: BlogPostStatus;
    updated_by: string;
  },
): Promise<BlogPostInsert | { error: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  const content = (input.content ?? "").trim();
  if (!content) return { error: "Blog content is required." };

  const rawSlug = (input.slug?.trim() || slugifyBlogTitle(title)).toLowerCase();
  const slug = await ensureUniqueSlug(client, slugifyBlogTitle(rawSlug));
  const status: BlogPostStatus = input.status ?? "draft";
  const now = new Date().toISOString();

  return {
    title,
    slug,
    category: (input.category ?? "").trim(),
    reading_time: normalizeReadingTime(input.reading_time),
    excerpt: (input.excerpt ?? "").trim(),
    content,
    cover_image_url: input.cover_image_url?.trim() || null,
    display_order: input.display_order ?? 0,
    status,
    updated_by: input.updated_by,
    published_at: status === "published" ? now : null,
  };
}

export async function buildBlogPostPatch(
  client: Client,
  input: {
    id: string;
    title?: string;
    slug?: string;
    category?: string;
    reading_time?: string;
    excerpt?: string;
    content?: string;
    cover_image_url?: string | null;
    display_order?: number;
    status?: BlogPostStatus;
    updated_by: string;
    action?: "publish" | "unpublish" | "soft_delete" | "restore";
  },
): Promise<BlogPostUpdate | { error: string }> {
  const patch: BlogPostUpdate = { updated_by: input.updated_by };
  const now = new Date().toISOString();

  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (!title) return { error: "Title is required." };
    patch.title = title;
  }

  if (typeof input.slug === "string" && input.slug.trim()) {
    patch.slug = await ensureUniqueSlug(client, slugifyBlogTitle(input.slug.trim()), input.id);
  }

  if (typeof input.category === "string") patch.category = input.category.trim();
  if (typeof input.reading_time === "string") patch.reading_time = normalizeReadingTime(input.reading_time);
  if (typeof input.excerpt === "string") patch.excerpt = input.excerpt.trim();
  if (typeof input.content === "string") {
    const content = input.content.trim();
    if (!content) return { error: "Blog content is required." };
    patch.content = content;
  }
  if (input.cover_image_url !== undefined) {
    patch.cover_image_url = input.cover_image_url?.trim() || null;
  }
  if (typeof input.display_order === "number" && Number.isFinite(input.display_order)) {
    patch.display_order = Math.round(input.display_order);
  }

  if (input.status === "draft" || input.status === "published") {
    patch.status = input.status;
    if (input.status === "published") {
      patch.published_at = now;
      patch.deleted_at = null;
    } else {
      patch.published_at = null;
    }
  }

  if (input.action === "publish") {
    patch.status = "published";
    patch.published_at = now;
    patch.deleted_at = null;
  } else if (input.action === "unpublish") {
    patch.status = "draft";
    patch.published_at = null;
  } else if (input.action === "soft_delete") {
    patch.deleted_at = now;
  } else if (input.action === "restore") {
    patch.deleted_at = null;
  }

  return patch;
}

export async function reorderBlogPosts(
  client: Client,
  orderedIds: string[],
  updatedBy: string,
): Promise<void> {
  const ids = orderedIds.filter(Boolean);
  if (!ids.length) return;

  const updates = ids.map((id, index) =>
    client
      .from("blog_posts")
      .update({ display_order: index + 1, updated_by: updatedBy })
      .eq("id", id)
      .is("deleted_at", null),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
