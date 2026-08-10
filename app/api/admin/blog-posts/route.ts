import { NextResponse } from "next/server";
import { withContentSchemaHint } from "@/lib/admin/content-schema-hint";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { BlogPostListFilters, BlogPostStatus } from "@/lib/blog-posts/types";
import {
  blogPostAdminStats,
  buildBlogPostInsert,
  listBlogPostsAdmin,
} from "@/services/blog-posts-supabase";

function parseStatus(v: string | null): BlogPostListFilters["status"] {
  if (v === "draft" || v === "published" || v === "all") return v;
  return "all";
}

export async function GET(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const filters: BlogPostListFilters = {
    status: parseStatus(url.searchParams.get("status")),
    include_deleted: url.searchParams.get("include_deleted") === "1",
    search: url.searchParams.get("search") ?? undefined,
  };

  try {
    const [{ rows, total }, stats] = await Promise.all([
      listBlogPostsAdmin(admin, filters),
      blogPostAdminStats(admin),
    ]);
    return NextResponse.json({ posts: rows, total, stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load blog posts";
    return NextResponse.json({ error: withContentSchemaHint(msg) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    slug?: string;
    category?: string;
    reading_time?: string;
    excerpt?: string;
    content?: string;
    cover_image_url?: string | null;
    display_order?: number;
    status?: BlogPostStatus;
  };

  const insert = await buildBlogPostInsert(admin, {
    title: body.title ?? "",
    slug: body.slug,
    category: body.category,
    reading_time: body.reading_time,
    excerpt: body.excerpt,
    content: body.content,
    cover_image_url: body.cover_image_url,
    display_order: body.display_order,
    status: body.status,
    updated_by: gate.userId,
  });

  if ("error" in insert) {
    return NextResponse.json({ error: insert.error }, { status: 400 });
  }

  const { data, error } = await admin.from("blog_posts").insert(insert).select("*").single();

  if (error) {
    return NextResponse.json({ error: withContentSchemaHint(error.message) }, { status: 500 });
  }

  return NextResponse.json({ post: data }, { status: 201 });
}
