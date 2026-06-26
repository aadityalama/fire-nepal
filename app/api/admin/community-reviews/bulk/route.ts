import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase-database";

type CommunityReviewUpdate = Database["public"]["Tables"]["community_reviews"]["Update"];

export async function POST(req: Request) {
  const gate = await requireAdminApi();
  if (gate instanceof NextResponse) return gate;

  const admin = createSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    ids?: string[];
    action?: "approve" | "reject" | "soft_delete";
  };

  const ids = (body.ids ?? []).filter(Boolean);
  const action = body.action;
  if (!ids.length || !action) {
    return NextResponse.json({ error: "ids and action are required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  let patch: CommunityReviewUpdate = { updated_by: gate.userId };

  if (action === "approve") {
    patch = {
      ...patch,
      status: "approved",
      approved_by: gate.userId,
      approved_at: now,
      deleted_at: null,
    };
  } else if (action === "reject") {
    patch = {
      ...patch,
      status: "rejected",
      approved_by: gate.userId,
      approved_at: now,
    };
  } else if (action === "soft_delete") {
    patch = { ...patch, deleted_at: now };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("community_reviews")
    .update(patch)
    .in("id", ids)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
