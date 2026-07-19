/** Supabase Storage bucket for Real Estate document vault + gallery uploads. */
export const REAL_ESTATE_STORAGE_BUCKET = "portfolio_real_estate" as const;

export const REAL_ESTATE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export const REAL_ESTATE_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export function realEstateStorageObjectPath(userId: string, propertyId: string, fileId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  return `${userId}/${propertyId}/${fileId}.${safeExt}`;
}

export function extFromMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m === "image/jpeg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/gif") return "gif";
  if (m === "application/pdf") return "pdf";
  return "bin";
}
