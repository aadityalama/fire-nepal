import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ADMIN_CONTENT_MIGRATION_HINT } from "@/lib/admin/content-schema-hint";
import { HOMEPAGE_BLOG_SEED } from "@/lib/blog-posts/seed-posts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TableProbe = {
  table: "youtube_videos" | "blog_posts";
  exists: boolean;
  error: string | null;
};

type SeedSyncResult = {
  slug: string;
  updated: boolean;
  reason: string;
};

const DEFAULT_SYNC_SLUG = "how-to-invest-your-abroad-salary-for-nepal-goals";

async function probeTable(
  admin: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  table: TableProbe["table"],
): Promise<TableProbe> {
  const { error } = await admin.from(table).select("id").limit(1);
  if (!error) return { table, exists: true, error: null };
  return {
    table,
    exists: false,
    error: `${error.code ?? "error"}: ${error.message}`,
  };
}

/**
 * Sync selected HOMEPAGE_BLOG_SEED rows onto existing published posts by slug.
 * Preserves id, status, display_order, published_at, cover_image_url, deleted_at.
 */
async function syncSeedBlogContent(
  admin: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
  slugs: string[],
): Promise<SeedSyncResult[]> {
  const results: SeedSyncResult[] = [];
  const seeds = HOMEPAGE_BLOG_SEED.filter((p) => slugs.includes(p.slug));

  for (const wanted of slugs) {
    if (!seeds.some((s) => s.slug === wanted)) {
      results.push({ slug: wanted, updated: false, reason: "slug not in seed" });
    }
  }

  for (const seed of seeds) {
    const { data: existing, error: readErr } = await admin
      .from("blog_posts")
      .select("id, title, category, reading_time, excerpt, content, status, deleted_at")
      .eq("slug", seed.slug)
      .is("deleted_at", null)
      .maybeSingle();

    if (readErr) {
      results.push({ slug: seed.slug, updated: false, reason: readErr.message });
      continue;
    }
    if (!existing) {
      results.push({ slug: seed.slug, updated: false, reason: "row not found" });
      continue;
    }
    if (existing.status !== "published") {
      results.push({ slug: seed.slug, updated: false, reason: `status=${existing.status}` });
      continue;
    }

    const same =
      existing.title === seed.title &&
      existing.category === seed.category &&
      existing.reading_time === seed.reading_time &&
      existing.excerpt === seed.excerpt &&
      existing.content === seed.content;

    if (same) {
      results.push({ slug: seed.slug, updated: false, reason: "already in sync" });
      continue;
    }

    const { error: writeErr } = await admin
      .from("blog_posts")
      .update({
        title: seed.title,
        category: seed.category,
        reading_time: seed.reading_time,
        excerpt: seed.excerpt,
        content: seed.content,
      })
      .eq("id", existing.id)
      .eq("slug", seed.slug)
      .eq("status", "published")
      .is("deleted_at", null);

    if (writeErr) {
      results.push({ slug: seed.slug, updated: false, reason: writeErr.message });
      continue;
    }
    results.push({ slug: seed.slug, updated: true, reason: "synced from seed" });
  }

  return results;
}

/**
 * Diagnostic for Admin Content schema (YouTube Videos + Blog Posts).
 *
 * Optional content sync (uses Vercel Production SUPABASE_SERVICE_ROLE_KEY — no DB URL needed):
 *   GET /api/schema/ensure-admin-content?syncSeed=1
 *     → updates only how-to-invest-your-abroad-salary-for-nepal-goals
 *   GET /api/schema/ensure-admin-content?syncSeed=1&slug=<slug>
 *     → updates one seed slug
 *   GET /api/schema/ensure-admin-content?syncSeed=1&all=1
 *     → updates all HOMEPAGE_BLOG_SEED rows
 *
 * Same public schema-ensure pattern as cashflow/insurance ensure routes.
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Supabase is not configured" }, { status: 503 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY missing — cannot probe tables." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const wantsSync = url.searchParams.get("syncSeed") === "1";
  let seedSync: SeedSyncResult[] | null = null;

  if (wantsSync) {
    const all = url.searchParams.get("all") === "1";
    const slugParam = (url.searchParams.get("slug") ?? "").trim().toLowerCase();
    const slugs = all
      ? HOMEPAGE_BLOG_SEED.map((p) => p.slug)
      : [slugParam || DEFAULT_SYNC_SLUG];
    seedSync = await syncSeedBlogContent(admin, slugs);
  }

  const [youtube, blog] = await Promise.all([
    probeTable(admin, "youtube_videos"),
    probeTable(admin, "blog_posts"),
  ]);

  const ok = youtube.exists && blog.exists;
  return NextResponse.json({
    ok,
    tables: { youtube_videos: youtube, blog_posts: blog },
    hasDbUrl: Boolean(
      (process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "").trim(),
    ),
    hasAccessToken: Boolean((process.env.SUPABASE_ACCESS_TOKEN ?? "").trim()),
    applyHint: ok ? null : ADMIN_CONTENT_MIGRATION_HINT,
    seedSync,
  });
}
