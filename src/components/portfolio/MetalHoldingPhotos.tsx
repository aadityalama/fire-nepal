"use client";

import { Camera, ImageIcon, Star, Trash2, X } from "lucide-react";
import { useCallback, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  METAL_PHOTO_MAX_COUNT,
  compressMetalImageFile,
  metalCoverPhotoUrl,
} from "@/components/portfolio/metal-photo-utils";
import type { MetalRow } from "@/components/portfolio/types";

function stopDragEvent(e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();
}

export function MetalHoldingPhotos({
  row,
  onPatch,
}: {
  row: MetalRow;
  onPatch: (patch: Partial<MetalRow>) => void;
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  const appendImages = useCallback(
    async (files: File[]) => {
      const urls = row.photoUrls ?? [];
      const cover = row.coverPhotoIndex ?? 0;
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) {
        toast.message("Choose image files (JPG, PNG, WebP, or GIF).");
        return;
      }
      const room = METAL_PHOTO_MAX_COUNT - urls.length;
      if (room <= 0) {
        toast.error(`You can store up to ${METAL_PHOTO_MAX_COUNT} photos per holding.`);
        return;
      }
      const slice = images.slice(0, room);
      const nextUrls = [...urls];
      for (const f of slice) {
        const dataUrl = await compressMetalImageFile(f);
        if (!dataUrl) {
          toast.error(`Could not compress "${f.name}". Try a smaller image.`);
          continue;
        }
        nextUrls.push(dataUrl);
      }
      if (nextUrls.length === urls.length) return;
      onPatch({
        photoUrls: nextUrls,
        coverPhotoIndex: nextUrls.length > 0 ? Math.min(cover, nextUrls.length - 1) : undefined,
      });
      if (slice.length > 0) toast.success(`Added ${nextUrls.length - urls.length} photo(s).`);
    },
    [row.photoUrls, row.coverPhotoIndex, onPatch],
  );

  const urls = row.photoUrls ?? [];
  const cover = row.coverPhotoIndex ?? 0;
  const coverSrc = metalCoverPhotoUrl(row);

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    e.target.value = "";
    if (!list?.length) return;
    await appendImages(Array.from(list));
  };

  const removeAt = (index: number) => {
    const next = urls.filter((_, i) => i !== index);
    if (next.length === 0) {
      onPatch({ photoUrls: undefined, coverPhotoIndex: undefined });
      setLightbox(null);
      return;
    }
    let nextCover = cover;
    if (index === cover) nextCover = Math.min(cover, next.length - 1);
    else if (index < cover) nextCover = Math.max(0, cover - 1);
    nextCover = Math.max(0, Math.min(next.length - 1, nextCover));
    onPatch({ photoUrls: next, coverPhotoIndex: nextCover });
    setLightbox((prev) => {
      if (prev == null) return prev;
      if (prev === index) return Math.min(prev, next.length - 1);
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const setCoverAt = (index: number) => {
    if (index < 0 || index >= urls.length) return;
    onPatch({ coverPhotoIndex: index });
  };

  const lightboxSrc = lightbox != null && urls[lightbox] ? urls[lightbox] : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-950/35 to-black/50 sm:aspect-auto sm:h-[7.5rem] sm:w-[9.5rem]">
          {coverSrc ? (
            <button
              type="button"
              className="relative block h-full w-full min-h-[6.5rem] sm:min-h-0"
              onClick={() => {
                const i = urls.findIndex((u) => u === coverSrc);
                setLightbox(i >= 0 ? i : 0);
              }}
              aria-label="View cover photo full screen"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user data URLs + https */}
              <img src={coverSrc} alt="" className="h-full w-full object-cover" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-wide text-amber-100/95">
                Cover
              </span>
            </button>
          ) : (
            <div className="flex h-full min-h-[6.5rem] flex-col items-center justify-center gap-1.5 p-3 text-center sm:min-h-0">
              <ImageIcon className="text-amber-300/35" size={28} aria-hidden />
              <p className="text-[10px] font-bold text-emerald-200/50">No photos yet</p>
            </div>
          )}
        </div>

        <div
          className={`flex min-w-0 flex-1 flex-col justify-center rounded-xl border border-dashed px-3 py-3 transition sm:min-h-[7.5rem] ${
            dragOver ? "border-emerald-400/60 bg-emerald-500/10" : "border-emerald-400/25 bg-black/20"
          }`}
          onDragEnter={(e) => {
            stopDragEvent(e);
            dragDepth.current += 1;
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            stopDragEvent(e);
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragOver(false);
          }}
          onDragOver={stopDragEvent}
          onDrop={(e) => {
            stopDragEvent(e);
            dragDepth.current = 0;
            setDragOver(false);
            const dt = e.dataTransfer?.files;
            if (dt?.length) void appendImages(Array.from(dt));
          }}
        >
          <p className="text-[11px] font-bold leading-snug text-emerald-200/75">
            Jewelry, bars, coins, or purchase invoices — stored on this holding (syncs with your portfolio backup).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={onFileChange}
            />
            <label
              htmlFor={inputId}
              className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-amber-100 transition hover:bg-amber-500/25 sm:min-h-0 sm:py-1.5"
            >
              <Camera size={14} aria-hidden />
              Upload
            </label>
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-emerald-400/25 px-3 py-2 text-[11px] font-bold text-emerald-200/90 transition hover:bg-emerald-500/10 sm:min-h-0 sm:py-1.5"
              onClick={() => fileRef.current?.click()}
            >
              Choose files
            </button>
            <span className="text-[10px] font-semibold text-emerald-200/45">
              or drag & drop here · max {METAL_PHOTO_MAX_COUNT}
            </span>
          </div>
        </div>
      </div>

      {urls.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {urls.map((src, index) => {
            const isCover = index === (row.coverPhotoIndex ?? 0);
            return (
              <div
                key={`${index}-${src.slice(0, 24)}`}
                className="relative w-[4.5rem] shrink-0 overflow-hidden rounded-lg border border-emerald-400/20 bg-black/40 sm:w-[5.25rem]"
              >
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setLightbox(index)}
                  aria-label={`View photo ${index + 1} full screen`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </button>
                <div className="absolute right-0.5 top-0.5 flex gap-0.5">
                  <button
                    type="button"
                    className={`grid h-8 w-8 place-items-center rounded-md border text-[10px] shadow sm:h-7 sm:w-7 ${
                      isCover
                        ? "border-amber-400/50 bg-amber-500/30 text-amber-100"
                        : "border-white/10 bg-black/55 text-emerald-200/90 hover:bg-emerald-500/20"
                    }`}
                    aria-label={isCover ? "Cover photo" : "Set as cover"}
                    title={isCover ? "Cover" : "Set as cover"}
                    onClick={() => setCoverAt(index)}
                  >
                    <Star size={14} className={isCover ? "fill-current" : undefined} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md border border-rose-400/35 bg-black/55 text-rose-200 shadow hover:bg-rose-500/25 sm:h-7 sm:w-7"
                    aria-label="Delete photo"
                    onClick={() => removeAt(index)}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {typeof document !== "undefined" && lightboxSrc != null && lightbox != null
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex flex-col bg-black/92 p-3 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label="Photo viewer"
              onClick={() => setLightbox(null)}
            >
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                <p className="text-xs font-bold text-emerald-200/80">
                  {lightbox + 1} / {urls.length}
                </p>
                <button
                  type="button"
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white hover:bg-white/10"
                  aria-label="Close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox(null);
                  }}
                >
                  <X size={22} />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={lightboxSrc}
                  alt=""
                  className="max-h-[min(85vh,100%)] max-w-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {urls.length > 1 ? (
                <div className="mt-3 flex shrink-0 justify-center gap-2">
                  <button
                    type="button"
                    className="min-h-[44px] rounded-full border border-emerald-400/30 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-500/15"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox((i) => (i == null ? i : (i - 1 + urls.length) % urls.length));
                    }}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-full border border-emerald-400/30 px-4 py-2 text-sm font-bold text-emerald-100 hover:bg-emerald-500/15"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox((i) => (i == null ? i : (i + 1) % urls.length));
                    }}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
