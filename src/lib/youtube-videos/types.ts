export type YoutubeVideoStatus = "draft" | "published";

export type YoutubeVideoRow = {
  id: string;
  title: string;
  youtube_url: string;
  youtube_video_id: string;
  duration: string;
  thumbnail_url: string;
  display_order: number;
  status: YoutubeVideoStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

export type YoutubeVideoPublic = Pick<
  YoutubeVideoRow,
  "id" | "title" | "youtube_url" | "youtube_video_id" | "duration" | "thumbnail_url" | "display_order"
>;

export type YoutubeVideoInput = {
  title: string;
  youtube_url: string;
  duration?: string;
  display_order?: number;
  status?: YoutubeVideoStatus;
};

export type YoutubeVideoAdminStats = {
  total: number;
  draft: number;
  published: number;
  deleted: number;
};

export type YoutubeVideoListFilters = {
  status?: YoutubeVideoStatus | "all";
  include_deleted?: boolean;
  search?: string;
};
