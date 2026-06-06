import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import { compressImageFileToJpegDataUrl, sanitizePropertyPhotoRef } from "@/components/portfolio/real-estate-photo-utils";

/** Per-image cap (JPEG data URLs + Supabase JSON); keep below real-estate single photo cap when users attach many. */
export const METAL_PHOTO_MAX_CHARS = 280_000;

/** Max images per gold/silver holding (localStorage + UX). */
export const METAL_PHOTO_MAX_COUNT = 12;

/** Max purchase bill / invoice images stored for the Gold & Silver module. */
export const METAL_PURCHASE_BILL_MAX_COUNT = 24;

/** Max files attached to a single metal ledger transaction. */
export const METAL_LEDGER_MAX_BILLS_PER_TX = 10;
export const METAL_LEDGER_MAX_PHOTOS_PER_TX = 12;

/** Max stored chars for a small PDF data URL on a metal ledger row. */
export const METAL_LEDGER_PDF_MAX_CHARS = 400_000;

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

export function compressMetalImageFile(file: File): Promise<string | null> {
  return compressImageFileToJpegDataUrl(file, {
    maxEdge: 900,
    quality: 0.78,
    maxChars: METAL_PHOTO_MAX_CHARS,
  });
}

export function sanitizeMetalLedgerBillRef(raw: string | undefined): string | undefined {
  const img = sanitizePropertyPhotoRef(raw);
  if (img) return img;
  const t = raw?.trim();
  if (!t) return undefined;
  if (t.startsWith("data:application/pdf;base64,") && t.length <= METAL_LEDGER_PDF_MAX_CHARS) return t;
  return undefined;
}

export function sanitizeMetalLedgerPhotoRef(raw: string | undefined): string | undefined {
  return sanitizePropertyPhotoRef(raw);
}

export function sanitizeMetalTxBillUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const urls: string[] = [];
  for (const p of raw) {
    if (urls.length >= METAL_LEDGER_MAX_BILLS_PER_TX) break;
    const s = sanitizeMetalLedgerBillRef(typeof p === "string" ? p : undefined);
    if (s) urls.push(s);
  }
  return urls;
}

export function sanitizeMetalTxPhotoUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const urls: string[] = [];
  for (const p of raw) {
    if (urls.length >= METAL_LEDGER_MAX_PHOTOS_PER_TX) break;
    const s = sanitizeMetalLedgerPhotoRef(typeof p === "string" ? p : undefined);
    if (s) urls.push(s);
  }
  return urls;
}

/** First photo URL from metal ledger rows for this item (newest trade first). */
export function metalItemCoverFromLedger(rowId: string, ledger: readonly PortfolioLedgerEntry[]): string | undefined {
  const rows = ledger
    .filter((e) => e.bucket === "metal" && e.rowId === rowId)
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate));
  for (const e of rows) {
    const m = e.meta;
    if (!m || typeof m !== "object") continue;
    const photos = sanitizeMetalTxPhotoUrls((m as Record<string, unknown>).metalTxPhotoUrls);
    if (photos[0]) return photos[0];
  }
  return undefined;
}

export function readSmallPdfAsDataUrl(file: File, maxChars = METAL_LEDGER_PDF_MAX_CHARS): Promise<string | null> {
  if (file.type !== "application/pdf") return Promise.resolve(null);
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const s = typeof r.result === "string" ? r.result : null;
      resolve(s && s.length <= maxChars ? s : null);
    };
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

/** Image (compressed JPEG) or small PDF for metal ledger attachments. */
export async function compressMetalLedgerAttachmentFile(file: File): Promise<string | null> {
  if (file.type === "application/pdf") return readSmallPdfAsDataUrl(file);
  if (file.type.startsWith("image/")) return compressMetalImageFile(file);
  return null;
}
