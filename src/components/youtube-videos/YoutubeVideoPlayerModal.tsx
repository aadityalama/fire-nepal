"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { youtubeEmbedUrl } from "@/lib/youtube-videos/parse-youtube-url";

export type YoutubeVideoPlayerModalProps = {
  open: boolean;
  videoId: string | null;
  title: string;
  onClose: () => void;
};

/**
 * Premium in-page YouTube player — mobile bottom-sheet / desktop centered modal.
 * Iframe mounts only while open so playback (and audio) cannot continue after close.
 */
export function YoutubeVideoPlayerModal({ open, videoId, title, onClose }: YoutubeVideoPlayerModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  const embedSrc = videoId ? youtubeEmbedUrl(videoId, { autoplay: true }) : null;

  useFocusTrap(open && mounted && Boolean(embedSrc), panelRef);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-emerald-950/75 p-0 backdrop-blur-md sm:items-center sm:p-6"
      role="presentation"
      data-testid="youtube-video-player-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#04140f]/95 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
          <h2 id={titleId} className="min-w-0 flex-1 text-sm font-black leading-snug text-white sm:text-base">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            data-autofocus
            onClick={onClose}
            aria-label="Close video player"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-emerald-100/90 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          {embedSrc ? (
            <iframe
              key={videoId ?? "closed"}
              src={embedSrc}
              title={title}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center px-6 text-center">
              <p className="text-sm font-semibold text-emerald-100/80">
                This video cannot be played here. The link may be missing or invalid.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
