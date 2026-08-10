import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { BlogPostStatus } from "@/lib/blog-posts/types";
import { buildBlogPostPatch } from "@/services/blog-posts-supabase";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
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
    action?: "publish" | "unpublish" | "soft_delete" | "restore";
  };

  const patch = await buildBlogPostPatch(admin, {
    id,
    title: body.title,
    slug: body.slug,
    category: body.category,
    reading_time: body.reading_time,
    excerpt: body.excerpt,
    content: body.content,
    cover_image_url: body.cover_image_url,
    display_order: body.display_order,
    status: body.status,
    action: body.action,
    updated_by: gate.userId,
  });

  if ("error" in patch) {
    return NextResponse.json({ error: patch.error }, { status: 400 });
  }

  const { data, error } = await admin
    .from("blog_posts")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const { data, error } = await admin
    .from("blog_posts")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: gate.userId,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
