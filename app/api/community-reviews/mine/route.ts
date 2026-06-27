import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateReviewInput } from "@/lib/community-reviews/validate-review-input";
import { clampRating, fetchUserCommunityReview } from "@/services/community-reviews-supabase";
import { fetchUserProfile } from "@/services/user-profile-supabase";

const REVIEW_COLUMNS =
  "id, user_id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, is_demo, status, review_type, display_order, created_at, updated_at, deleted_at";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ review: null });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const review = await fetchUserCommunityReview(supabase, user.id);
  return NextResponse.json({ review });
}

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

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

  const existing = await fetchUserCommunityReview(supabase, user.id);
  if (existing) {
    return NextResponse.json(
      { error: "You already submitted a review. Edit your existing review instead." },
      { status: 409 },
    );
  }

  const profile = await fetchUserProfile(supabase, user.id);
  const { data, error } = await supabase
    .from("community_reviews")
    .insert({
      user_id: user.id,
      full_name: validated.data.full_name,
      country: validated.data.country,
      city: validated.data.city,
      avatar_url: profile?.avatar_url ?? null,
      rating: clampRating(validated.data.rating),
      review_title: validated.data.review_title,
      review_text: validated.data.review_text,
      verified: false,
      is_demo: false,
      status: "pending",
      review_type: "homepage",
      display_order: 9999,
    })
    .select(REVIEW_COLUMNS)
    .single();

  if (error) {
    const msg =
      error.code === "23505"
        ? "You already submitted a review. Edit your existing review instead."
        : error.message;
    return NextResponse.json({ error: msg }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
