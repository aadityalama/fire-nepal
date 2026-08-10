export type BlogPostStatus = "draft" | "published";

export type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  reading_time: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  display_order: number;
  status: BlogPostStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

export type BlogPostPublic = Pick<
  BlogPostRow,
  | "id"
  | "title"
  | "slug"
  | "category"
  | "reading_time"
  | "excerpt"
  | "content"
  | "cover_image_url"
  | "display_order"
  | "published_at"
>;

export type BlogPostListItem = Pick<
  BlogPostRow,
  "id" | "title" | "slug" | "category" | "reading_time" | "excerpt" | "cover_image_url" | "display_order" | "published_at"
>;

export type BlogPostAdminStats = {
  total: number;
  draft: number;
  published: number;
  deleted: number;
};

export type BlogPostListFilters = {
  status?: BlogPostStatus | "all";
  include_deleted?: boolean;
  search?: string;
};
