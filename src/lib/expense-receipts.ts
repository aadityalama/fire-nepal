"use client";

/**
 * Client-only receipt image pipeline (HEIC → JPEG via heic2any, then canvas resize).
 * Safe for future client-side OCR (JPEG, bounded dimensions, readable contrast).
 */

const MAX_WIDTH = 1440;
const JPEG_QUALITY = 0.82;
const HEIC_TO_JPEG_QUALITY = 0.92;
const MAX_OUTPUT_BYTES_SOFT = 1_500_000;

/** Max size before compression (mobile photos / HEIC). */
export const MAX_RECEIPT_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Stored preview is always this MIME after processing. */
export const RECEIPT_STORAGE_MIME = "image/jpeg" as const;

const ACCEPT_EXT = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

function extension(name: string): string {
  const m = /\.([^.]+)$/.exec(name.trim());
  return m ? m[1].toLowerCase() : "";
}

function isRasterImageMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return /^(image\/(jpeg|pjpeg|png|webp))$/i.test(m);
}

function isHeicMime(mime: string): boolean {
  const m = mime.toLowerCase();
  return m === "image/heic" || m === "image/heif" || m === "image/heif-sequence";
}

/** iPhone HEIC / HEIF (by MIME or extension — iOS often sends empty type + .HEIC name). */
export function isHeicLike(file: File): boolean {
  if (isHeicMime(file.type || "")) return true;
  const ext = extension(file.name);
  return ext === "heic" || ext === "heif";
}

/** JPG, PNG, WEBP, HEIC/HEIF, or generic image/* (mobile pickers). */
export function isReceiptImageFile(file: File): boolean {
  const ext = extension(file.name);
  if (ACCEPT_EXT.has(ext)) return true;
  const mime = (file.type || "").toLowerCase();
  if (isHeicMime(mime) || isRasterImageMime(mime)) return true;
  if (mime.startsWith("image/") && !mime.includes("svg")) return true;
  return false;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type CompressReceiptResult = {
  dataUrl: string;
  originalBytes: number;
  outputBytes: number;
  convertedFromHeic: boolean;
  /** Pixel size after resize — useful for future OCR / layout. */
  width: number;
  height: number;
  /** Output is normalized JPEG suitable for future on-device OCR. */
  ocrReady: true;
};

function approxBytesFromDataUrl(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  if (i < 0) return 0;
  const b64 = dataUrl.slice(i + 1);
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this file from your device."));
    reader.readAsDataURL(blob);
  });
}

function resizeDataUrl(dataUrl: string, quality = JPEG_QUALITY): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / image.width);
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("This browser cannot process images (canvas unsupported)."));
        return;
      }
      context.drawImage(image, 0, 0, width, height);
      resolve({
        dataUrl: canvas.toDataURL(RECEIPT_STORAGE_MIME, quality),
        width,
        height,
      });
    };
    image.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
    image.src = dataUrl;
  });
}

function bufferLooksLikeHeifOrHeic(buf: ArrayBuffer): boolean {
  const u = new Uint8Array(buf);
  if (u.length < 12) return false;
  const ftyp = String.fromCharCode(u[4], u[5], u[6], u[7]);
  if (ftyp !== "ftyp") return false;
  const brand = String.fromCharCode(u[8], u[9], u[10], u[11]);
  return /^(heic|heix|hevc|hevx|mif1|msf1)/i.test(brand);
}

async function peekHeifBrand(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(0, 32).arrayBuffer();
    return bufferLooksLikeHeifOrHeic(buf);
  } catch {
    return false;
  }
}

/** Normalize blob type for heic2any (iOS often omits MIME on .HEIC). */
async function blobForHeic2any(file: File): Promise<Blob> {
  const t = (file.type || "").toLowerCase();
  if (t === "image/heic" || t === "image/heif" || t === "image/heif-sequence") {
    return file;
  }
  const ext = extension(file.name);
  if (!t || t === "application/octet-stream") {
    const mime = ext === "heif" ? "image/heif" : "image/heic";
    return new Blob([await file.arrayBuffer()], { type: mime });
  }
  return file;
}

type Heic2AnyFn = (opts: {
  blob: Blob;
  toType?: string;
  quality?: number;
  multiple?: true;
}) => Promise<Blob | Blob[]>;

async function loadHeic2Any(): Promise<Heic2AnyFn> {
  if (typeof window === "undefined") {
    throw new Error("HEIC conversion runs in the browser only.");
  }
  const mod = await import(/* webpackChunkName: "heic2any" */ "heic2any");
  const fn = (mod as { default?: Heic2AnyFn }).default ?? (mod as unknown as Heic2AnyFn);
  if (typeof fn !== "function") {
    throw new Error("heic2any failed to load.");
  }
  return fn;
}

async function convertHeicToJpegBlob(source: File | Blob): Promise<Blob> {
  const heic2any = await loadHeic2Any();

  const run = async (multiple?: true) => {
    const out = await heic2any({
      blob: source,
      toType: "image/jpeg",
      quality: HEIC_TO_JPEG_QUALITY,
      ...(multiple ? { multiple: true } : {}),
    });
    const first = Array.isArray(out) ? out[0] : out;
    if (!(first instanceof Blob) || first.size === 0) {
      throw new Error("HEIC conversion returned empty output.");
    }
    return first;
  };

  try {
    return await run();
  } catch {
    return await run(true);
  }
}

async function resizeAndMaybeShrinkQuality(
  dataUrl: string,
  startQuality = JPEG_QUALITY,
): Promise<{ dataUrl: string; width: number; height: number }> {
  let { dataUrl: out, width, height } = await resizeDataUrl(dataUrl, startQuality);
  let bytes = approxBytesFromDataUrl(out);
  let q = startQuality;
  while (bytes > MAX_OUTPUT_BYTES_SOFT && q > 0.52) {
    q -= 0.07;
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("IMAGE_DECODE_FAILED"));
      image.src = out;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) break;
    context.drawImage(image, 0, 0, width, height);
    out = canvas.toDataURL(RECEIPT_STORAGE_MIME, q);
    bytes = approxBytesFromDataUrl(out);
  }
  return { dataUrl: out, width, height };
}

async function jpegBlobToCompressedDataUrl(
  jpegBlob: Blob,
  originalBytes: number,
  convertedFromHeic: boolean,
): Promise<CompressReceiptResult> {
  const raw = await readBlobAsDataUrl(jpegBlob);
  const { dataUrl, width, height } = await resizeAndMaybeShrinkQuality(raw);
  return {
    dataUrl,
    originalBytes,
    outputBytes: approxBytesFromDataUrl(dataUrl),
    convertedFromHeic,
    width,
    height,
    ocrReady: true,
  };
}

const GENERIC_PROCESS_ERROR = "We couldn't process this image. Please try a different photo.";

/**
 * HEIC/HEIF → heic2any (JPEG) → resize/compress to data URL.
 * Raster → canvas; on decode failure, sniff HEIF and retry with heic2any.
 */
export async function compressReceiptImage(file: File): Promise<CompressReceiptResult> {
  if (file.size > MAX_RECEIPT_UPLOAD_BYTES) {
    throw new Error(
      `File too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_RECEIPT_UPLOAD_BYTES)} before compression.`,
    );
  }
  if (!isReceiptImageFile(file)) {
    throw new Error("Use a JPG, JPEG, PNG, WEBP, or iPhone photo (HEIC).");
  }

  const originalBytes = file.size;

  if (isHeicLike(file)) {
    try {
      const heicBlob = await blobForHeic2any(file);
      const jpegBlob = await convertHeicToJpegBlob(heicBlob);
      return jpegBlobToCompressedDataUrl(jpegBlob, originalBytes, true);
    } catch {
      throw new Error(GENERIC_PROCESS_ERROR);
    }
  }

  try {
    const dataUrl = await readBlobAsDataUrl(file);
    const { dataUrl: out, width, height } = await resizeAndMaybeShrinkQuality(dataUrl);
    return {
      dataUrl: out,
      originalBytes,
      outputBytes: approxBytesFromDataUrl(out),
      convertedFromHeic: false,
      width,
      height,
      ocrReady: true,
    };
  } catch {
    const looksHeif = await peekHeifBrand(file);
    if (!looksHeif) {
      throw new Error(GENERIC_PROCESS_ERROR);
    }
    try {
      const heicBlob = await blobForHeic2any(file);
      const jpegBlob = await convertHeicToJpegBlob(heicBlob);
      return jpegBlobToCompressedDataUrl(jpegBlob, originalBytes, true);
    } catch {
      throw new Error(GENERIC_PROCESS_ERROR);
    }
  }
}
