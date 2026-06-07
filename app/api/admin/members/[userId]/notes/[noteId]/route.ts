import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ userId: string; noteId: string }> };

type PatchBody = { body?: string };

export async function PATCH(request: Request, ctx: RouteParams) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const { userId, noteId } = await ctx.params;
  if (!userId || !noteId) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  let json: PatchBody;
  try {
    json = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const body = typeof json.body === "string" ? json.body.trim() : "";
  if (!body || body.length > 8000) {
    return NextResponse.json({ error: "body must be 1–8000 characters" }, { status: 400 });
  }

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("admin_member_notes")
    .update({ body, updated_at: now })
    .eq("id", noteId)
    .eq("user_id", userId)
    .select("id, user_id, body, author_id, created_at, updated_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ note: data });
}
