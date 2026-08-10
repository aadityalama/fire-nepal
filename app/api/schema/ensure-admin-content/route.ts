import { NextResponse } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ADMIN_CONTENT_MIGRATION_HINT } from "@/lib/admin/content-schema-hint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TableProbe = {
  table: "youtube_videos" | "blog_posts";
  exists: boolean;
  error: string | null;
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

/**
 * Diagnostic for Admin Content schema (YouTube Videos + Blog Posts).
 * Does not run DDL here — production currently has no SUPABASE_DB_URL / ACCESS_TOKEN.
 * Use the combined SQL file in Supabase SQL Editor.
 */
export async function GET() {
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
  });
}
