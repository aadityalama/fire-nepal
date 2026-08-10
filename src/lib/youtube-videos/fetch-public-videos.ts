import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { youtubeThumbnailUrl } from "@/lib/youtube-videos/parse-youtube-url";
import type { YoutubeVideoPublic } from "@/lib/youtube-videos/types";

const PUBLIC_COLUMNS =
  "id, title, youtube_url, youtube_video_id, duration, thumbnail_url, display_order";

/** Static fallback matching the previous homepage placeholders when DB is empty/unavailable. */
export const HOMEPAGE_YOUTUBE_FALLBACK: YoutubeVideoPublic[] = [
  {
    id: "fallback-1",
    title: "Overseas income to FIRE strategy",
    youtube_url: "https://www.youtube.com/@Firenepal853",
    youtube_video_id: "",
    duration: "9:05",
    thumbnail_url: "",
    display_order: 1,
  },
  {
    id: "fallback-2",
    title: "Passive income after returning",
    youtube_url: "https://www.youtube.com/@Firenepal853",
    youtube_video_id: "",
    duration: "12:18",
    thumbnail_url: "",
    display_order: 2,
  },
  {
    id: "fallback-3",
    title: "Nepal bazaar investment basics",
    youtube_url: "https://www.youtube.com/@Firenepal853",
    youtube_video_id: "",
    duration: "8:29",
    thumbnail_url: "",
    display_order: 3,
  },
];

function withThumbnail(row: YoutubeVideoPublic): YoutubeVideoPublic {
  if (row.thumbnail_url) return row;
  if (!row.youtube_video_id) return row;
  return { ...row, thumbnail_url: youtubeThumbnailUrl(row.youtube_video_id) };
}

/** Server-side: published YouTube videos for the homepage (anon-safe via RLS). */
export async function fetchPublishedYoutubeVideos(): Promise<YoutubeVideoPublic[]> {
  if (!isSupabaseConfigured()) {
    return HOMEPAGE_YOUTUBE_FALLBACK;
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("youtube_videos")
      .select(PUBLIC_COLUMNS)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error || !data?.length) {
      const admin = createSupabaseServiceRoleClient();
      if (admin) {
        const seeded = await admin
          .from("youtube_videos")
          .select(PUBLIC_COLUMNS)
          .eq("status", "published")
          .is("deleted_at", null)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (seeded.data?.length) {
          return (seeded.data as YoutubeVideoPublic[]).map(withThumbnail);
        }
      }
      return HOMEPAGE_YOUTUBE_FALLBACK;
    }

    return (data as YoutubeVideoPublic[]).map(withThumbnail);
  } catch {
    return HOMEPAGE_YOUTUBE_FALLBACK;
  }
}
