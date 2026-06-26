export type CommunityReviewStatus = "pending" | "approved" | "rejected";

export type CommunityReviewRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  country: string | null;
  city: string | null;
  avatar_url: string | null;
  rating: number;
  review_title: string;
  review_text: string;
  verified: boolean;
  is_demo: boolean;
  status: CommunityReviewStatus;
  display_order: number;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

export type CommunityReviewPublic = Pick<
  CommunityReviewRow,
  | "id"
  | "full_name"
  | "country"
  | "city"
  | "avatar_url"
  | "rating"
  | "review_title"
  | "review_text"
  | "verified"
  | "created_at"
>;

export type CommunityReviewInput = {
  full_name: string;
  country?: string | null;
  city?: string | null;
  avatar_url?: string | null;
  rating: number;
  review_title: string;
  review_text: string;
  verified?: boolean;
  is_demo?: boolean;
  status?: CommunityReviewStatus;
  display_order?: number;
};

export type CommunityReviewAdminStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  demo: number;
  real: number;
  deleted: number;
};

export type CommunityReviewListFilters = {
  page?: number;
  limit?: number;
  status?: CommunityReviewStatus | "all";
  is_demo?: "all" | "true" | "false";
  include_deleted?: boolean;
  search?: string;
};
