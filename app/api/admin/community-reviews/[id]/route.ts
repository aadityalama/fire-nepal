import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase-database";
import { buildReviewPatch } from "@/services/community-reviews-supabase";
import type { CommunityReviewStatus, CommunityReviewType } from "@/lib/community-reviews/types";

type CommunityReviewUpdate = Database["public"]["Tables"]["community_reviews"]["Update"];

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
    full_name?: string;
    country?: string;
    city?: string;
    avatar_url?: string;
    rating?: number;
    review_title?: string;
    review_text?: string;
    verified?: boolean;
    is_demo?: boolean;
    status?: CommunityReviewStatus;
    review_type?: CommunityReviewType;
    display_order?: number;
    action?: "approve" | "reject" | "publish" | "unpublish" | "restore" | "soft_delete";
  };

  const now = new Date().toISOString();
  const patch: CommunityReviewUpdate = buildReviewPatch({
    full_name: body.full_name,
    country: body.country,
    city: body.city,
    avatar_url: body.avatar_url,
    rating: body.rating,
    review_title: body.review_title,
    review_text: body.review_text,
    verified: body.verified,
    is_demo: body.is_demo,
    status: body.status,
    review_type: body.review_type,
    display_order: body.display_order,
    updated_by: gate.userId,
  });

  if (body.action === "approve" || body.action === "publish") {
    patch.status = "approved";
    patch.approved_by = gate.userId;
    patch.approved_at = now;
    patch.deleted_at = null;
  } else if (body.action === "reject") {
    patch.status = "rejected";
    patch.approved_by = gate.userId;
    patch.approved_at = now;
  } else if (body.action === "unpublish") {
    patch.status = "pending";
    patch.approved_by = null;
    patch.approved_at = null;
  } else if (body.action === "soft_delete") {
    patch.deleted_at = now;
  } else if (body.action === "restore") {
    patch.deleted_at = null;
  }

  const { data, error } = await admin
    .from("community_reviews")
    .update(patch)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json({ review: data });
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
    .from("community_reviews")
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
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
