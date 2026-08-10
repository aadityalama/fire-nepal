import { Play } from "lucide-react";
import Image from "next/image";
import { fetchPublishedYoutubeVideos } from "@/lib/youtube-videos/fetch-public-videos";
import type { YoutubeVideoPublic } from "@/lib/youtube-videos/types";

const FALLBACK_GRADIENTS = [
  "from-green-950 to-emerald-700",
  "from-amber-600 to-yellow-400",
  "from-slate-900 to-green-700",
];

function VideoCard({ video, index }: { video: YoutubeVideoPublic; index: number }) {
  const gradient = FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
  const href = video.youtube_video_id
    ? `https://www.youtube.com/watch?v=${video.youtube_video_id}`
    : video.youtube_url;
  const hasThumb = Boolean(video.thumbnail_url);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur transition hover:-translate-y-1"
    >
      <article>
        <div className={`relative grid h-28 place-items-center overflow-hidden bg-gradient-to-br ${gradient}`}>
          {hasThumb ? (
            <Image
              src={video.thumbnail_url}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, 33vw"
              unoptimized
            />
          ) : null}
          <span className="relative z-[1] grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition group-hover:scale-110">
            <Play size={18} fill="currentColor" />
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm font-black text-emerald-950">{video.title}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">
            FIRE Nepal{video.duration ? ` - ${video.duration}` : ""}
          </p>
        </div>
      </article>
    </a>
  );
}

/** Homepage Latest YouTube Videos grid — loads published rows from Supabase. */
export async function LatestYoutubeVideosSection() {
  const videos = await fetchPublishedYoutubeVideos();

  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {videos.map((video, index) => (
        <VideoCard key={video.id} video={video} index={index} />
      ))}
    </div>
  );
}
