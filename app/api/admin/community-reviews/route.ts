import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/verify-admin-api";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import {
  clampRating,
  communityReviewAdminStats,
  listCommunityReviewsAdmin,
} from "@/services/community-reviews-supabase";
import type { CommunityReviewListFilters, CommunityReviewStatus } from "@/lib/community-reviews/types";

function parseStatus(v: string | null): CommunityReviewListFilters["status"] {
  if (v === "pending" || v === "approved" || v === "rejected" || v === "all") return v;
  return "all";
}

function parseDemo(v: string | null): CommunityReviewListFilters["is_demo"] {
  if (v === "true" || v === "false") return v;
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
  const filters: CommunityReviewListFilters = {
    page: Number(url.searchParams.get("page") ?? "1"),
    limit: Number(url.searchParams.get("limit") ?? "20"),
    status: parseStatus(url.searchParams.get("status")),
    is_demo: parseDemo(url.searchParams.get("is_demo")),
    include_deleted: url.searchParams.get("include_deleted") === "1",
    search: url.searchParams.get("search") ?? undefined,
  };

  try {
    const [{ rows, total }, stats] = await Promise.all([
      listCommunityReviewsAdmin(admin, filters),
      communityReviewAdminStats(admin),
    ]);
    return NextResponse.json({ reviews: rows, total, stats, page: filters.page, limit: filters.limit });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load reviews";
    return NextResponse.json({ error: msg }, { status: 500 });
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
    display_order?: number;
  };

  if (!body.full_name?.trim() || !body.review_title?.trim() || !body.review_text?.trim()) {
    return NextResponse.json({ error: "Name, title, and review text are required." }, { status: 400 });
  }

  const status: CommunityReviewStatus = body.status ?? "approved";
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("community_reviews")
    .insert({
      user_id: null,
      full_name: body.full_name.trim(),
      country: body.country?.trim() || null,
      city: body.city?.trim() || null,
      avatar_url: body.avatar_url?.trim() || null,
      rating: clampRating(body.rating ?? 5),
      review_title: body.review_title.trim(),
      review_text: body.review_text.trim(),
      verified: body.verified ?? false,
      is_demo: body.is_demo ?? false,
      status,
      display_order: body.display_order ?? 0,
      updated_by: gate.userId,
      approved_by: status === "approved" ? gate.userId : null,
      approved_at: status === "approved" ? now : null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review: data }, { status: 201 });
}
