import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HOMEPAGE_DEMO_REVIEWS } from "@/lib/community-reviews/demo-reviews-seed";
import type { CommunityReviewPublic } from "@/lib/community-reviews/types";

const PUBLIC_COLUMNS =
  "id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, created_at";

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

/** Server-side: approved community reviews for the homepage (anon-safe via RLS). */
export async function fetchApprovedCommunityReviews(): Promise<CommunityReviewPublic[]> {
  if (!isSupabaseConfigured()) {
    return fallbackReviews();
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("community_reviews")
      .select(PUBLIC_COLUMNS)
      .eq("status", "approved")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      const admin = createSupabaseServiceRoleClient();
      if (admin) {
        const seeded = await admin
          .from("community_reviews")
          .select(PUBLIC_COLUMNS)
          .eq("status", "approved")
          .is("deleted_at", null)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (seeded.data?.length) return seeded.data as CommunityReviewPublic[];
      }
      return fallbackReviews();
    }

    return data as CommunityReviewPublic[];
  } catch {
    return fallbackReviews();
  }
}
