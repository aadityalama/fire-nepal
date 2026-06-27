import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { clampRating } from "@/services/community-reviews-supabase";
import { fetchUserProfile } from "@/services/user-profile-supabase";

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

  const { data, error } = await supabase
    .from("community_reviews")
    .select(
      "id, user_id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, is_demo, status, display_order, created_at, updated_at, deleted_at",
    )
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review: data ?? null });
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

  const body = (await req.json().catch(() => ({}))) as {
    full_name?: string;
    country?: string;
    city?: string;
    rating?: number;
    review_title?: string;
    review_text?: string;
  };

  const fullName = body.full_name?.trim();
  const reviewTitle = body.review_title?.trim();
  const reviewText = body.review_text?.trim();
  if (!fullName || !reviewTitle || !reviewText) {
    return NextResponse.json({ error: "Name, title, and review text are required." }, { status: 400 });
  }

  const profile = await fetchUserProfile(supabase, user.id);
  const displayName = fullName || profile?.display_name?.trim() || user.email?.split("@")[0] || "Member";

  const { data, error } = await supabase
    .from("community_reviews")
    .insert({
      user_id: user.id,
      full_name: displayName,
      country: body.country?.trim() || null,
      city: body.city?.trim() || null,
      avatar_url: profile?.avatar_url ?? null,
      rating: clampRating(body.rating ?? 5),
      review_title: reviewTitle,
      review_text: reviewText,
      verified: false,
      is_demo: false,
      status: "pending",
      review_type: "community",
      display_order: 9999,
    })
    .select(
      "id, user_id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, is_demo, status, review_type, display_order, created_at, updated_at",
    )
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
