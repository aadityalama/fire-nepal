import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";
import type {
  CommunityReviewAdminStats,
  CommunityReviewInput,
  CommunityReviewListFilters,
  CommunityReviewRow,
  CommunityReviewStatus,
} from "@/lib/community-reviews/types";

type Client = SupabaseClient<Database>;
type CommunityReviewUpdate = Database["public"]["Tables"]["community_reviews"]["Update"];

const ADMIN_COLUMNS =
  "id, user_id, full_name, country, city, avatar_url, rating, review_title, review_text, verified, is_demo, status, review_type, display_order, created_at, updated_at, approved_by, approved_at, updated_by, deleted_at";

export function clampRating(rating: number): number {
  return Math.min(5, Math.max(1, Math.round(rating)));
}

export async function fetchUserCommunityReview(
  client: Client,
  userId: string,
): Promise<CommunityReviewRow | null> {
  const { data, error } = await client
    .from("community_reviews")
    .select(ADMIN_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) return null;
  return (data as CommunityReviewRow | null) ?? null;
}

export async function listCommunityReviewsAdmin(
  client: Client,
  filters: CommunityReviewListFilters,
): Promise<{ rows: CommunityReviewRow[]; total: number }> {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client.from("community_reviews").select(ADMIN_COLUMNS, { count: "exact" });

  if (!filters.include_deleted) {
    query = query.is("deleted_at", null);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.is_demo === "true") query = query.eq("is_demo", true);
  if (filters.is_demo === "false") query = query.eq("is_demo", false);

  const search = filters.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    query = query.or(
      `full_name.ilike.%${escaped}%,review_title.ilike.%${escaped}%,review_text.ilike.%${escaped}%,city.ilike.%${escaped}%,country.ilike.%${escaped}%`,
    );
  }

  const { data, error, count } = await query
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as CommunityReviewRow[], total: count ?? 0 };
}

export async function communityReviewAdminStats(client: Client): Promise<CommunityReviewAdminStats> {
  const [allRes, pendingRes, approvedRes, rejectedRes, demoRes, realRes, deletedRes] = await Promise.all([
    client
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null),
    client
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
    client
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .is("deleted_at", null),
    client
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected")
      .is("deleted_at", null),
    client
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .eq("is_demo", true)
      .is("deleted_at", null),
    client
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .eq("is_demo", false)
      .is("deleted_at", null),
    client
      .from("community_reviews")
      .select("*", { count: "exact", head: true })
      .not("deleted_at", "is", null),
  ]);

  return {
    total: allRes.count ?? 0,
    pending: pendingRes.count ?? 0,
    approved: approvedRes.count ?? 0,
    rejected: rejectedRes.count ?? 0,
    demo: demoRes.count ?? 0,
    real: realRes.count ?? 0,
    deleted: deletedRes.count ?? 0,
  };
}

export function buildReviewPatch(
  input: Partial<CommunityReviewInput> & {
    status?: CommunityReviewStatus;
    review_type?: CommunityReviewInput["review_type"];
    deleted_at?: string | null;
    approved_by?: string | null;
    approved_at?: string | null;
    updated_by?: string | null;
  },
): CommunityReviewUpdate {
  const patch: CommunityReviewUpdate = {};
  if (input.full_name !== undefined) patch.full_name = input.full_name.trim();
  if (input.country !== undefined) patch.country = input.country?.trim() || null;
  if (input.city !== undefined) patch.city = input.city?.trim() || null;
  if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url?.trim() || null;
  if (input.rating !== undefined) patch.rating = clampRating(input.rating);
  if (input.review_title !== undefined) patch.review_title = input.review_title.trim();
  if (input.review_text !== undefined) patch.review_text = input.review_text.trim();
  if (input.verified !== undefined) patch.verified = input.verified;
  if (input.is_demo !== undefined) patch.is_demo = input.is_demo;
  if (input.status !== undefined) patch.status = input.status;
  if (input.review_type !== undefined) patch.review_type = input.review_type;
  if (input.display_order !== undefined) patch.display_order = input.display_order;
  if (input.deleted_at !== undefined) patch.deleted_at = input.deleted_at;
  if (input.approved_by !== undefined) patch.approved_by = input.approved_by;
  if (input.approved_at !== undefined) patch.approved_at = input.approved_at;
  if (input.updated_by !== undefined) patch.updated_by = input.updated_by;
  return patch;
}

export const COMMUNITY_REVIEW_AVATAR_BUCKET = "community_review_avatars";

export function communityReviewAvatarPath(reviewId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  return `reviews/${reviewId}/${Date.now()}.${safeExt}`;
}
