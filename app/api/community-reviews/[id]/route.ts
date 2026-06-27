import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase-database";
import { validateReviewInput } from "@/lib/community-reviews/validate-review-input";
import { clampRating } from "@/services/community-reviews-supabase";
import { fetchUserProfile } from "@/services/user-profile-supabase";

type RouteCtx = { params: Promise<{ id: string }> };
type CommunityReviewUpdate = Database["public"]["Tables"]["community_reviews"]["Update"];

const REVIEW_COLUMNS =
  "id, user_id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, is_demo, status, review_type, display_order, created_at, updated_at, deleted_at";

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

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const validated = validateReviewInput(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const profile = await fetchUserProfile(supabase, user.id);
  const patch: CommunityReviewUpdate = {
    full_name: validated.data.full_name,
    country: validated.data.country,
    city: validated.data.city,
    rating: clampRating(validated.data.rating),
    review_title: validated.data.review_title,
    review_text: validated.data.review_text,
    avatar_url: profile?.avatar_url ?? null,
    updated_by: user.id,
    status: "pending",
    review_type: "homepage",
    approved_by: null,
    approved_at: null,
  };

  const { data, error } = await supabase
    .from("community_reviews")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .select(REVIEW_COLUMNS)
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
