/** Max stored string length for a data URL on a property row (localStorage + Supabase JSON). */
export const REAL_ESTATE_PHOTO_MAX_CHARS = 340_000;

/**
 * Resize and compress an image file to a JPEG data URL for inline portfolio storage.
 * Returns null if the file is not an image, decode fails, or output exceeds maxChars.
 */
export function compressImageFileToJpegDataUrl(
  file: File,
  opts?: { maxEdge?: number; quality?: number; maxChars?: number },
): Promise<string | null> {
  const maxEdge = opts?.maxEdge ?? 720;
  const quality = opts?.quality ?? 0.82;
  const maxChars = opts?.maxChars ?? REAL_ESTATE_PHOTO_MAX_CHARS;

  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          resolve(null);
          return;
        }
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        if (dataUrl.length > maxChars) {
          const q2 = Math.max(0.5, quality - 0.12);
          const dataUrl2 = canvas.toDataURL("image/jpeg", q2);
          resolve(dataUrl2.length <= maxChars ? dataUrl2 : null);
        } else {
          resolve(dataUrl);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Accept https image URLs — conservative allowlist (no javascript:, no HTML). */
export function isSafeHttpsImageUrl(raw: string): boolean {
  const s = raw.trim();
  if (s.length < 12 || s.length > 2048) return false;
  if (!s.startsWith("https://")) return false;
  if (/[\s<>"]/.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizePropertyPhotoRef(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const t = String(raw).trim();
  if (!t) return undefined;
  if (t.startsWith("data:image/jpeg;base64,") && t.length <= REAL_ESTATE_PHOTO_MAX_CHARS) return t;
  if (isSafeHttpsImageUrl(t)) return t;
  return undefined;
}
