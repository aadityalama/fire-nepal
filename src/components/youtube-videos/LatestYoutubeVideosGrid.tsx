"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { YoutubeVideoPlayerModal } from "@/components/youtube-videos/YoutubeVideoPlayerModal";
import { resolveYoutubeVideoId } from "@/lib/youtube-videos/parse-youtube-url";
import type { YoutubeVideoPublic } from "@/lib/youtube-videos/types";

const FALLBACK_GRADIENTS = [
  "from-green-950 to-emerald-700",
  "from-amber-600 to-yellow-400",
  "from-slate-900 to-green-700",
];

type ActiveVideo = {
  videoId: string;
  title: string;
};

function VideoCard({
  video,
  index,
  onPlay,
}: {
  video: YoutubeVideoPublic;
  index: number;
  onPlay: (video: YoutubeVideoPublic) => void;
}) {
  const gradient = FALLBACK_GRADIENTS[index % FALLBACK_GRADIENTS.length];
  const hasThumb = Boolean(video.thumbnail_url);
  const playable = Boolean(resolveYoutubeVideoId(video.youtube_video_id, video.youtube_url));

  return (
    <button
      type="button"
      onClick={() => onPlay(video)}
      aria-label={playable ? `Play ${video.title}` : `${video.title} (video unavailable)`}
      className="group block w-full overflow-hidden rounded-2xl border border-white/60 bg-white/70 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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
          <span
            className="relative z-[1] grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white shadow-lg backdrop-blur-sm transition group-hover:scale-110"
            aria-hidden
          >
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
    </button>
  );
}

/** Client grid + lazy YouTube embed modal for homepage Latest YouTube Videos. */
export function LatestYoutubeVideosGrid({ videos }: { videos: YoutubeVideoPublic[] }) {
  const [active, setActive] = useState<ActiveVideo | null>(null);

  function onPlay(video: YoutubeVideoPublic) {
    const videoId = resolveYoutubeVideoId(video.youtube_video_id, video.youtube_url);
    if (!videoId) return;
    setActive({ videoId, title: video.title });
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
        {videos.map((video, index) => (
          <VideoCard key={video.id} video={video} index={index} onPlay={onPlay} />
        ))}
      </div>
      <YoutubeVideoPlayerModal
        open={Boolean(active)}
        videoId={active?.videoId ?? null}
        title={active?.title ?? ""}
        onClose={() => setActive(null)}
      />
    </>
  );
}
