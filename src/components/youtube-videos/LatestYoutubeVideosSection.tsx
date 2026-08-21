import { LatestYoutubeVideosGrid } from "@/components/youtube-videos/LatestYoutubeVideosGrid";
import { fetchPublishedYoutubeVideos } from "@/lib/youtube-videos/fetch-public-videos";

/** Homepage Latest YouTube Videos grid — loads published rows from Supabase. */
export async function LatestYoutubeVideosSection() {
  const videos = await fetchPublishedYoutubeVideos();
  return <LatestYoutubeVideosGrid videos={videos} />;
}
