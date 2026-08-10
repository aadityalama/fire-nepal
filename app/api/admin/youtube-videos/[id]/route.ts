import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { YoutubeVideoStatus } from "@/lib/youtube-videos/types";
import { buildYoutubeVideoPatch } from "@/services/youtube-videos-supabase";

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
    youtube_url?: string;
    duration?: string;
    display_order?: number;
    status?: YoutubeVideoStatus;
    action?: "publish" | "unpublish" | "soft_delete" | "restore";
  };

  const patch = buildYoutubeVideoPatch({
    title: body.title,
    youtube_url: body.youtube_url,
    duration: body.duration,
    display_order: body.display_order,
    status: body.status,
    action: body.action,
    updated_by: gate.userId,
  });

  if ("error" in patch) {
    return NextResponse.json({ error: patch.error }, { status: 400 });
  }

  const { data, error } = await admin
    .from("youtube_videos")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({ video: data });
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
    .from("youtube_videos")
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
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
