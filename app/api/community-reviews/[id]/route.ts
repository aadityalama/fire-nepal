import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase-database";
import { clampRating } from "@/services/community-reviews-supabase";
import { fetchUserProfile } from "@/services/user-profile-supabase";

type RouteCtx = { params: Promise<{ id: string }> };
type CommunityReviewUpdate = Database["public"]["Tables"]["community_reviews"]["Update"];

export async function PATCH(req: Request, ctx: RouteCtx) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    full_name?: string;
    country?: string;
    city?: string;
    rating?: number;
    review_title?: string;
    review_text?: string;
  };

  const profile = await fetchUserProfile(supabase, user.id);
  const patch: CommunityReviewUpdate = {
    updated_by: user.id,
    status: "pending",
    approved_by: null,
    approved_at: null,
  };

  if (body.full_name !== undefined) patch.full_name = body.full_name.trim();
  if (body.country !== undefined) patch.country = body.country.trim() || null;
  if (body.city !== undefined) patch.city = body.city.trim() || null;
  if (body.rating !== undefined) patch.rating = clampRating(body.rating);
  if (body.review_title !== undefined) patch.review_title = body.review_title.trim();
  if (body.review_text !== undefined) patch.review_text = body.review_text.trim();
  patch.avatar_url = profile?.avatar_url ?? null;

  const { data, error } = await supabase
    .from("community_reviews")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(
      "id, user_id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, is_demo, status, display_order, created_at, updated_at",
    )
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
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("community_reviews")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
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
