import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { reorderYoutubeVideos } from "@/services/youtube-videos-supabase";

export async function POST(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { orderedIds?: string[] };
  const orderedIds = Array.isArray(body.orderedIds) ? body.orderedIds.filter((id) => typeof id === "string") : [];

  if (!orderedIds.length) {
    return NextResponse.json({ error: "orderedIds is required" }, { status: 400 });
  }

  try {
    await reorderYoutubeVideos(admin, orderedIds, gate.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to reorder videos";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
