import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicSupabaseClient, withServerTimeout } from "@/lib/supabase/server";
import { HOMEPAGE_DEMO_REVIEWS } from "@/lib/community-reviews/demo-reviews-seed";
import type { CommunityReviewPublic } from "@/lib/community-reviews/types";
import type { Database } from "@/types/supabase-database";

const PUBLIC_COLUMNS =
  "id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, created_at";

/** Keep homepage SSR snappy when PostgREST/DB is saturated (DatabaseTimeout). */
const PUBLIC_FETCH_TIMEOUT_MS = 2_500;

function fallbackReviews(): CommunityReviewPublic[] {
  const now = new Date().toISOString();
  return HOMEPAGE_DEMO_REVIEWS.map((r, i) => ({
    id: `demo-fallback-${i + 1}`,
    full_name: r.full_name,
    country: r.country,
    city: r.city,
    avatar_url: null,
    rating: r.rating,
    review_title: r.review_title,
    review_text: r.review_text,
    verified: r.verified,
    created_at: now,
  }));
}

async function queryApprovedReviews(
  client: SupabaseClient<Database>,
): Promise<CommunityReviewPublic[] | null> {
  const { data, error } = await withServerTimeout(
    client
      .from("community_reviews")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false }),
    PUBLIC_FETCH_TIMEOUT_MS,
    "community_reviews",
  );
  if (error || !data?.length) return null;
  return data as CommunityReviewPublic[];
}

/** Server-side: approved community reviews for the homepage (anon-safe via RLS). */
export async function fetchApprovedCommunityReviews(): Promise<CommunityReviewPublic[]> {
  if (!isSupabaseConfigured()) {
    return fallbackReviews();
  }

  try {
    const rows = await queryApprovedReviews(createPublicSupabaseClient());
    if (rows?.length) return rows;

    const admin = createSupabaseServiceRoleClient();
    if (admin) {
      const seeded = await queryApprovedReviews(admin);
      if (seeded?.length) return seeded;
    }
    return fallbackReviews();
  } catch {
    return fallbackReviews();
  }
}
