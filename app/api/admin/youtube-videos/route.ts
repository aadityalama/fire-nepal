import { NextResponse } from "next/server";
import { withContentSchemaHint } from "@/lib/admin/content-schema-hint";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { YoutubeVideoListFilters, YoutubeVideoStatus } from "@/lib/youtube-videos/types";
import {
  buildYoutubeVideoInsert,
  listYoutubeVideosAdmin,
  youtubeVideoAdminStats,
} from "@/services/youtube-videos-supabase";

function parseStatus(v: string | null): YoutubeVideoListFilters["status"] {
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
  const filters: YoutubeVideoListFilters = {
    status: parseStatus(url.searchParams.get("status")),
    include_deleted: url.searchParams.get("include_deleted") === "1",
    search: url.searchParams.get("search") ?? undefined,
  };

  try {
    const [{ rows, total }, stats] = await Promise.all([
      listYoutubeVideosAdmin(admin, filters),
      youtubeVideoAdminStats(admin),
    ]);
    return NextResponse.json({ videos: rows, total, stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load videos";
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
    youtube_url?: string;
    duration?: string;
    display_order?: number;
    status?: YoutubeVideoStatus;
  };

  const insert = buildYoutubeVideoInsert({
    title: body.title ?? "",
    youtube_url: body.youtube_url ?? "",
    duration: body.duration,
    display_order: body.display_order,
    status: body.status,
    updated_by: gate.userId,
  });

  if ("error" in insert) {
    return NextResponse.json({ error: insert.error }, { status: 400 });
  }

  const { data, error } = await admin.from("youtube_videos").insert(insert).select("*").single();

  if (error) {
    return NextResponse.json({ error: withContentSchemaHint(error.message) }, { status: 500 });
  }

  return NextResponse.json({ video: data }, { status: 201 });
}
