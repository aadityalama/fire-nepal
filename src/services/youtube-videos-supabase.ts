import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-database";
import {
  extractYoutubeVideoId,
  normalizeDuration,
  normalizeYoutubeWatchUrl,
  youtubeThumbnailUrl,
} from "@/lib/youtube-videos/parse-youtube-url";
import type {
  YoutubeVideoAdminStats,
  YoutubeVideoListFilters,
  YoutubeVideoRow,
  YoutubeVideoStatus,
} from "@/lib/youtube-videos/types";

type Client = SupabaseClient<Database>;
type YoutubeVideoUpdate = Database["public"]["Tables"]["youtube_videos"]["Update"];
type YoutubeVideoInsert = Database["public"]["Tables"]["youtube_videos"]["Insert"];

const ADMIN_COLUMNS =
  "id, title, youtube_url, youtube_video_id, duration, thumbnail_url, display_order, status, created_at, updated_at, published_at, updated_by, deleted_at";

export type ParsedYoutubeFields = {
  youtube_url: string;
  youtube_video_id: string;
  thumbnail_url: string;
};

export function parseYoutubeFields(rawUrl: string): ParsedYoutubeFields | { error: string } {
  const videoId = extractYoutubeVideoId(rawUrl);
  if (!videoId) {
    return { error: "Enter a valid YouTube URL (watch, youtu.be, shorts, or embed)." };
  }
  return {
    youtube_video_id: videoId,
    youtube_url: normalizeYoutubeWatchUrl(videoId),
    thumbnail_url: youtubeThumbnailUrl(videoId),
  };
}

export async function listYoutubeVideosAdmin(
  client: Client,
  filters: YoutubeVideoListFilters = {},
): Promise<{ rows: YoutubeVideoRow[]; total: number }> {
  let query = client.from("youtube_videos").select(ADMIN_COLUMNS, { count: "exact" });

  if (!filters.include_deleted) {
    query = query.is("deleted_at", null);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  const search = filters.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_]/g, "\\$&");
    query = query.or(`title.ilike.%${escaped}%,youtube_url.ilike.%${escaped}%,youtube_video_id.ilike.%${escaped}%`);
  }

  const { data, error, count } = await query
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return { rows: (data ?? []) as YoutubeVideoRow[], total: count ?? 0 };
}

export async function youtubeVideoAdminStats(client: Client): Promise<YoutubeVideoAdminStats> {
  const [allRes, draftRes, publishedRes, deletedRes] = await Promise.all([
    client.from("youtube_videos").select("*", { count: "exact", head: true }).is("deleted_at", null),
    client
      .from("youtube_videos")
      .select("*", { count: "exact", head: true })
      .eq("status", "draft")
      .is("deleted_at", null),
    client
      .from("youtube_videos")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    client.from("youtube_videos").select("*", { count: "exact", head: true }).not("deleted_at", "is", null),
  ]);

  return {
    total: allRes.count ?? 0,
    draft: draftRes.count ?? 0,
    published: publishedRes.count ?? 0,
    deleted: deletedRes.count ?? 0,
  };
}

export function buildYoutubeVideoInsert(input: {
  title: string;
  youtube_url: string;
  duration?: string;
  display_order?: number;
  status?: YoutubeVideoStatus;
  updated_by: string;
}): YoutubeVideoInsert | { error: string } {
  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  const parsed = parseYoutubeFields(input.youtube_url);
  if ("error" in parsed) return parsed;

  const status: YoutubeVideoStatus = input.status ?? "draft";
  const now = new Date().toISOString();

  return {
    title,
    youtube_url: parsed.youtube_url,
    youtube_video_id: parsed.youtube_video_id,
    thumbnail_url: parsed.thumbnail_url,
    duration: normalizeDuration(input.duration),
    display_order: input.display_order ?? 0,
    status,
    updated_by: input.updated_by,
    published_at: status === "published" ? now : null,
  };
}

export function buildYoutubeVideoPatch(input: {
  title?: string;
  youtube_url?: string;
  duration?: string;
  display_order?: number;
  status?: YoutubeVideoStatus;
  updated_by: string;
  action?: "publish" | "unpublish" | "soft_delete" | "restore";
}): YoutubeVideoUpdate | { error: string } {
  const patch: YoutubeVideoUpdate = { updated_by: input.updated_by };
  const now = new Date().toISOString();

  if (typeof input.title === "string") {
    const title = input.title.trim();
    if (!title) return { error: "Title is required." };
    patch.title = title;
  }

  if (typeof input.youtube_url === "string") {
    const parsed = parseYoutubeFields(input.youtube_url);
    if ("error" in parsed) return parsed;
    patch.youtube_url = parsed.youtube_url;
    patch.youtube_video_id = parsed.youtube_video_id;
    patch.thumbnail_url = parsed.thumbnail_url;
  }

  if (typeof input.duration === "string") {
    patch.duration = normalizeDuration(input.duration);
  }

  if (typeof input.display_order === "number" && Number.isFinite(input.display_order)) {
    patch.display_order = Math.round(input.display_order);
  }

  if (input.status === "draft" || input.status === "published") {
    patch.status = input.status;
    if (input.status === "published") {
      patch.published_at = now;
      patch.deleted_at = null;
    } else {
      patch.published_at = null;
    }
  }

  if (input.action === "publish") {
    patch.status = "published";
    patch.published_at = now;
    patch.deleted_at = null;
  } else if (input.action === "unpublish") {
    patch.status = "draft";
    patch.published_at = null;
  } else if (input.action === "soft_delete") {
    patch.deleted_at = now;
  } else if (input.action === "restore") {
    patch.deleted_at = null;
  }

  return patch;
}

export async function reorderYoutubeVideos(
  client: Client,
  orderedIds: string[],
  updatedBy: string,
): Promise<void> {
  const ids = orderedIds.filter(Boolean);
  if (!ids.length) return;

  const updates = ids.map((id, index) =>
    client
      .from("youtube_videos")
      .update({ display_order: index + 1, updated_by: updatedBy })
      .eq("id", id)
      .is("deleted_at", null),
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
