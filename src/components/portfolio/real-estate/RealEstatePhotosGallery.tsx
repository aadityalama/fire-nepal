"use client";

import { Download, Trash2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  REAL_ESTATE_GALLERY_MAX,
  compressRealEstateImage,
  realEstateAllPhotos,
  uploadRealEstateFile,
} from "@/components/portfolio/real-estate-documents";
import type { RealEstateRow } from "@/components/portfolio/types";
import { ReGlass, ReSectionTitle } from "@/components/portfolio/real-estate/RealEstateUi";
import { cn } from "@/lib/utils";

function syncPhotosPatch(photos: string[]): Pick<RealEstateRow, "propertyPhoto" | "propertyPhotos"> {
  const [cover, ...rest] = photos;
  return {
    propertyPhoto: cover,
    propertyPhotos: rest.length ? rest : undefined,
  };
}

export function RealEstatePhotosGallery({
  row,
  onChange,
}: {
  row: RealEstateRow;
  onChange: (id: string, patch: Partial<RealEstateRow>) => void;
}) {
  const photos = realEstateAllPhotos(row);
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);

  const closeViewer = () => {
    setViewerIdx(null);
    setZoom(1);
  };

  useEffect(() => {
    if (viewerIdx == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowRight" && viewerIdx < photos.length - 1) setViewerIdx(viewerIdx + 1);
      if (e.key === "ArrowLeft" && viewerIdx > 0) setViewerIdx(viewerIdx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerIdx, photos.length]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (photos.length >= REAL_ESTATE_GALLERY_MAX) {
      toast.error(`Gallery capped at ${REAL_ESTATE_GALLERY_MAX} photos.`);
      return;
    }
    setBusy(true);
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        if (next.length >= REAL_ESTATE_GALLERY_MAX) break;
        if (!file.type.startsWith("image/")) continue;
        const uploaded = await uploadRealEstateFile({
          file,
          propertyId: row.id,
          category: "property_photo",
        });
        const url = uploaded?.url ?? (await compressRealEstateImage(file));
        if (url) next.push(url);
      }
      onChange(row.id, syncPhotosPatch(next));
      toast.success("Photos updated");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (idx: number) => {
    const next = photos.filter((_, i) => i !== idx);
    onChange(row.id, syncPhotosPatch(next));
    if (viewerIdx === idx) closeViewer();
    else if (viewerIdx != null && viewerIdx > idx) setViewerIdx(viewerIdx - 1);
  };

  const download = async (url: string, idx: number) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = `property-photo-${idx + 1}.jpg`;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    } catch {
      toast.error("Could not download photo");
    }
  };

  return (
    <div className="space-y-4">
      <ReSectionTitle
        title="Photos"
        subtitle={`${photos.length} / ${REAL_ESTATE_GALLERY_MAX}`}
        action={
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-3.5 text-xs font-black text-emerald-100 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Add photos"}
          </button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void addFiles(e.target.files)}
      />

      {photos.length === 0 ? (
        <ReGlass className="p-8 text-center text-sm font-semibold text-emerald-200/55">
          No photos yet — add a cover and gallery shots.
        </ReGlass>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {photos.map((url, idx) => (
            <button
              key={`${url.slice(0, 48)}-${idx}`}
              type="button"
              onClick={() => {
                setViewerIdx(idx);
                setZoom(1);
              }}
              className="group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-emerald-400/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
              {idx === 0 ? (
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[9px] font-black uppercase text-lime-200">
                  Cover
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {viewerIdx != null && photos[viewerIdx] ? (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-black/95"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            const start = touchStartX.current;
            const end = e.changedTouches[0]?.clientX;
            if (start == null || end == null) return;
            const dx = end - start;
            if (dx < -48 && viewerIdx < photos.length - 1) {
              setViewerIdx(viewerIdx + 1);
              setZoom(1);
            } else if (dx > 48 && viewerIdx > 0) {
              setViewerIdx(viewerIdx - 1);
              setZoom(1);
            }
          }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <p className="text-sm font-black text-emerald-50">
              {viewerIdx + 1} / {photos.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-xl text-emerald-100"
                onClick={() => setZoom((z) => Math.min(3, z + 0.35))}
                aria-label="Zoom in"
              >
                <ZoomIn size={20} />
              </button>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-xl text-emerald-100"
                onClick={() => setZoom((z) => Math.max(1, z - 0.35))}
                aria-label="Zoom out"
              >
                <ZoomOut size={20} />
              </button>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-xl text-emerald-100"
                onClick={() => void download(photos[viewerIdx], viewerIdx)}
                aria-label="Download"
              >
                <Download size={20} />
              </button>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-xl text-rose-300"
                onClick={() => removeAt(viewerIdx)}
                aria-label="Delete photo"
              >
                <Trash2 size={20} />
              </button>
              <button
                type="button"
                className="grid h-11 w-11 place-items-center rounded-xl text-emerald-100"
                onClick={closeViewer}
                aria-label="Close"
              >
                <X size={22} />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden px-2 pb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[viewerIdx]}
              alt=""
              className={cn("max-h-full max-w-full object-contain transition-transform duration-200")}
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
