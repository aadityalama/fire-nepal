import { newId } from "@/components/portfolio/storage";
import {
  compressImageFileToJpegDataUrl,
  isSafeHttpsImageUrl,
  REAL_ESTATE_PHOTO_MAX_CHARS,
  sanitizePropertyPhotoRef,
} from "@/components/portfolio/real-estate-photo-utils";
import type {
  RealEstateDocument,
  RealEstateDocumentCategory,
  RealEstatePropertyTxn,
  RealEstatePropertyTxnKind,
  RealEstateRow,
} from "@/components/portfolio/types";

export const REAL_ESTATE_GALLERY_MAX = 24;
export const REAL_ESTATE_DOCS_MAX = 80;
export const REAL_ESTATE_TXNS_MAX = 200;
export const REAL_ESTATE_DOC_DATA_URL_MAX_CHARS = 500_000;

export const REAL_ESTATE_DOC_CATEGORIES: { value: RealEstateDocumentCategory; label: string }[] = [
  { value: "property_photo", label: "Property Photos" },
  { value: "lalpurja", label: "Lalpurja" },
  { value: "blueprint", label: "Blueprint" },
  { value: "sale_agreement", label: "Sale Agreement" },
  { value: "insurance", label: "Insurance" },
  { value: "loan_papers", label: "Loan Papers" },
  { value: "tax", label: "Tax Documents" },
  { value: "valuation", label: "Valuation Report" },
  { value: "passport", label: "Passport" },
  { value: "citizenship", label: "Citizenship" },
  { value: "pan", label: "PAN" },
  { value: "other", label: "Other Files" },
];

export const REAL_ESTATE_TXN_KINDS: { value: RealEstatePropertyTxnKind; label: string; tone: "in" | "out" }[] = [
  { value: "purchase", label: "Purchase", tone: "out" },
  { value: "sale", label: "Sale", tone: "in" },
  { value: "rental_income", label: "Rental Income", tone: "in" },
  { value: "maintenance", label: "Maintenance", tone: "out" },
  { value: "renovation", label: "Renovation", tone: "out" },
  { value: "expense", label: "Expense", tone: "out" },
  { value: "income", label: "Income", tone: "in" },
];

const DOC_CATS = new Set(REAL_ESTATE_DOC_CATEGORIES.map((c) => c.value));
const TXN_KINDS = new Set(REAL_ESTATE_TXN_KINDS.map((c) => c.value));

function sanitizeDocUrl(raw: string | undefined): string | undefined {
  if (raw == null) return undefined;
  const t = String(raw).trim();
  if (!t) return undefined;
  const img = sanitizePropertyPhotoRef(t);
  if (img) return img;
  if (t.startsWith("data:application/pdf;base64,") && t.length <= REAL_ESTATE_DOC_DATA_URL_MAX_CHARS) return t;
  if (isSafeHttpsImageUrl(t)) return t;
  if (t.startsWith("https://") && t.length <= 4096 && !/[\s<>"]/.test(t)) {
    try {
      const u = new URL(t);
      if (u.protocol === "https:") return t;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function sanitizeRealEstateDocuments(raw: unknown): RealEstateDocument[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: RealEstateDocument[] = [];
  for (const item of raw) {
    if (out.length >= REAL_ESTATE_DOCS_MAX) break;
    if (!item || typeof item !== "object") continue;
    const d = item as Partial<RealEstateDocument>;
    const url = sanitizeDocUrl(typeof d.url === "string" ? d.url : undefined);
    if (!url) continue;
    const category = DOC_CATS.has(d.category as RealEstateDocumentCategory)
      ? (d.category as RealEstateDocumentCategory)
      : "other";
    const name = typeof d.name === "string" && d.name.trim() ? d.name.trim().slice(0, 180) : "Document";
    const mimeType =
      typeof d.mimeType === "string" && d.mimeType.trim() ? d.mimeType.trim().slice(0, 120) : "application/octet-stream";
    const createdAt =
      typeof d.createdAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(d.createdAt)
        ? d.createdAt.slice(0, 30)
        : new Date().toISOString();
    const storagePath =
      typeof d.storagePath === "string" && d.storagePath.trim() && !d.storagePath.includes("..")
        ? d.storagePath.trim().slice(0, 512)
        : undefined;
    out.push({
      id: typeof d.id === "string" && d.id ? d.id : newId(),
      name,
      category,
      mimeType,
      url,
      storagePath,
      createdAt,
      updatedAt: typeof d.updatedAt === "string" ? d.updatedAt.slice(0, 30) : undefined,
    });
  }
  return out.length ? out : undefined;
}

export function sanitizeRealEstateGallery(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const urls: string[] = [];
  for (const p of raw) {
    if (urls.length >= REAL_ESTATE_GALLERY_MAX) break;
    const s = sanitizePropertyPhotoRef(typeof p === "string" ? p : undefined);
    if (s) urls.push(s);
  }
  return urls.length ? urls : undefined;
}

export function sanitizeRealEstatePropertyTxns(raw: unknown): RealEstatePropertyTxn[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: RealEstatePropertyTxn[] = [];
  for (const item of raw) {
    if (out.length >= REAL_ESTATE_TXNS_MAX) break;
    if (!item || typeof item !== "object") continue;
    const t = item as Partial<RealEstatePropertyTxn>;
    if (!TXN_KINDS.has(t.kind as RealEstatePropertyTxnKind)) continue;
    const amount = typeof t.amount === "number" && Number.isFinite(t.amount) && t.amount > 0 ? t.amount : null;
    if (amount == null) continue;
    const date = typeof t.date === "string" && /^\d{4}-\d{2}-\d{2}/.test(t.date) ? t.date.slice(0, 10) : null;
    if (!date) continue;
    const currency = t.currency === "KRW" || t.currency === "USD" || t.currency === "NPR" ? t.currency : "NPR";
    out.push({
      id: typeof t.id === "string" && t.id ? t.id : newId(),
      kind: t.kind as RealEstatePropertyTxnKind,
      amount,
      currency,
      date,
      notes: typeof t.notes === "string" && t.notes.trim() ? t.notes.trim().slice(0, 500) : undefined,
      fees:
        typeof t.fees === "number" && Number.isFinite(t.fees) && t.fees >= 0 ? t.fees : undefined,
    });
  }
  return out.length ? out : undefined;
}

export function sanitizeAnnualRentalIncome(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) return undefined;
  return raw;
}

/** Cover + gallery, deduped, cover first. */
export function realEstateAllPhotos(row: RealEstateRow): string[] {
  const cover = sanitizePropertyPhotoRef(row.propertyPhoto);
  const gallery = sanitizeRealEstateGallery(row.propertyPhotos) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  if (cover) {
    seen.add(cover);
    out.push(cover);
  }
  for (const g of gallery) {
    if (seen.has(g)) continue;
    seen.add(g);
    out.push(g);
    if (out.length >= REAL_ESTATE_GALLERY_MAX) break;
  }
  return out;
}

export async function compressRealEstateImage(file: File): Promise<string | null> {
  return compressImageFileToJpegDataUrl(file, {
    maxEdge: 1100,
    quality: 0.8,
    maxChars: REAL_ESTATE_PHOTO_MAX_CHARS,
  });
}

export function readPdfAsDataUrl(file: File, maxChars = REAL_ESTATE_DOC_DATA_URL_MAX_CHARS): Promise<string | null> {
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

export type RealEstateUploadResult = {
  url: string;
  storagePath?: string;
  mimeType: string;
  name: string;
};

/**
 * Prefer Supabase Storage via API; fall back to compressed inline data URL so guests / offline still work.
 */
export async function uploadRealEstateFile(args: {
  file: File;
  propertyId: string;
  category?: RealEstateDocumentCategory;
}): Promise<RealEstateUploadResult | null> {
  const { file, propertyId } = args;
  const form = new FormData();
  form.set("file", file);
  form.set("propertyId", propertyId);
  if (args.category) form.set("category", args.category);

  try {
    const res = await fetch("/api/portfolio/real-estate/upload", { method: "POST", body: form });
    if (res.ok) {
      const json = (await res.json()) as {
        url?: string;
        storagePath?: string;
        mimeType?: string;
        name?: string;
      };
      if (json.url) {
        return {
          url: json.url,
          storagePath: json.storagePath,
          mimeType: json.mimeType || file.type || "application/octet-stream",
          name: json.name || file.name || "File",
        };
      }
    }
  } catch {
    /* fall through to inline */
  }

  if (file.type.startsWith("image/")) {
    const dataUrl = await compressRealEstateImage(file);
    if (!dataUrl) return null;
    return { url: dataUrl, mimeType: "image/jpeg", name: file.name || "Photo.jpg" };
  }
  if (file.type === "application/pdf") {
    const dataUrl = await readPdfAsDataUrl(file);
    if (!dataUrl) return null;
    return { url: dataUrl, mimeType: "application/pdf", name: file.name || "Document.pdf" };
  }
  return null;
}

export function makeRealEstateDocument(args: {
  name: string;
  category: RealEstateDocumentCategory;
  mimeType: string;
  url: string;
  storagePath?: string;
}): RealEstateDocument {
  return {
    id: newId(),
    name: args.name.slice(0, 180),
    category: args.category,
    mimeType: args.mimeType,
    url: args.url,
    storagePath: args.storagePath,
    createdAt: new Date().toISOString(),
  };
}
