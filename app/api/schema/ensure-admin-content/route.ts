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

function authorizeSync(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const cron = (process.env.CRON_SECRET ?? "").trim();
  if (!cron) {
    // Match other public schema-ensure diagnostics when no cron secret is configured.
    return { ok: true };
  }
  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (auth === `Bearer ${cron}`) return { ok: true };
  return { ok: false, status: 401, error: "Unauthorized — pass Authorization: Bearer <CRON_SECRET>." };
}

/**
 * Sync HOMEPAGE_BLOG_SEED content onto existing published rows by slug.
 * Preserves id, status, display_order, published_at, cover_image_url, deleted_at.
 */
async function syncSeedBlogContent(
  admin: NonNullable<ReturnType<typeof createSupabaseServiceRoleClient>>,
): Promise<SeedSyncResult[]> {
  const results: SeedSyncResult[] = [];

  for (const seed of HOMEPAGE_BLOG_SEED) {
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
 * Optional: `?syncSeed=1` updates existing published seed posts via service role
 * (used when SUPABASE_DB_URL is unavailable on Vercel).
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
    const authz = authorizeSync(req);
    if (!authz.ok) {
      return NextResponse.json({ ok: false, error: authz.error }, { status: authz.status });
    }
    seedSync = await syncSeedBlogContent(admin);
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
