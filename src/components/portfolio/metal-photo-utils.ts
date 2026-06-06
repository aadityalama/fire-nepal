import { compressImageFileToJpegDataUrl, sanitizePropertyPhotoRef } from "@/components/portfolio/real-estate-photo-utils";

/** Per-image cap (JPEG data URLs + Supabase JSON); keep below real-estate single photo cap when users attach many. */
export const METAL_PHOTO_MAX_CHARS = 280_000;

/** Max images per gold/silver holding (localStorage + UX). */
export const METAL_PHOTO_MAX_COUNT = 12;

/** Max purchase bill / invoice images stored for the Gold & Silver module. */
export const METAL_PURCHASE_BILL_MAX_COUNT = 24;

export function sanitizeMetalPurchaseBillUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const urls: string[] = [];
  for (const p of raw) {
    if (urls.length >= METAL_PURCHASE_BILL_MAX_COUNT) break;
    const s = sanitizePropertyPhotoRef(typeof p === "string" ? p : undefined);
    if (s) urls.push(s);
  }
  return urls;
}

export type SanitizedMetalPhotos = {
  photoUrls?: string[];
  coverPhotoIndex?: number;
};

export function sanitizeMetalPhotoGallery(
  photos: unknown,
  coverIndex: unknown,
): SanitizedMetalPhotos {
  if (!Array.isArray(photos) || photos.length === 0) return {};
  const urls: string[] = [];
  for (const p of photos) {
    if (urls.length >= METAL_PHOTO_MAX_COUNT) break;
    const s = sanitizePropertyPhotoRef(typeof p === "string" ? p : undefined);
    if (s) urls.push(s);
  }
  if (urls.length === 0) return {};
  let cover = 0;
  if (typeof coverIndex === "number" && Number.isFinite(coverIndex)) {
    cover = Math.max(0, Math.min(urls.length - 1, Math.floor(coverIndex)));
  }
  return { photoUrls: urls, coverPhotoIndex: cover };
}

/** Cover image for display: `coverPhotoIndex` when valid, else first photo. */
export function metalCoverPhotoUrl(row: { photoUrls?: string[]; coverPhotoIndex?: number }): string | undefined {
  const urls = row.photoUrls?.filter(Boolean) ?? [];
  if (urls.length === 0) return undefined;
  const raw = row.coverPhotoIndex;
  const idx =
    typeof raw === "number" && Number.isFinite(raw)
      ? Math.max(0, Math.min(urls.length - 1, Math.floor(raw)))
      : 0;
  return urls[idx] ?? urls[0];
}

export function compressMetalImageFile(file: File): Promise<string | null> {
  return compressImageFileToJpegDataUrl(file, {
    maxEdge: 900,
    quality: 0.78,
    maxChars: METAL_PHOTO_MAX_CHARS,
  });
}
