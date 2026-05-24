"use client";

import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  MAX_RECEIPT_UPLOAD_BYTES,
  compressReceiptImage,
  formatBytes,
  isHeicLike,
  isReceiptImageFile,
  type CompressReceiptResult,
} from "@/lib/expense-receipts";
import { runImageOcrWithRetries } from "@/lib/image-ocr";

type ExpenseReceiptUploadProps = {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  /** Tighter layout for dense modals (e.g. Add Expense sheet) */
  compact?: boolean;
  /** Run Tesseract after HEIC→JPEG / resize (default true). */
  autoOcr?: boolean;
  /** Raw OCR text from the processed receipt image. */
  onOcrText?: (text: string) => void;
};

/** Gallery / files — explicit types help Android & desktop file filters. */
const GALLERY_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/*";

/** Camera — broad accept + environment capture for mobile. */
const CAMERA_ACCEPT = "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp";

export function ExpenseReceiptUpload({
  value,
  onChange,
  compact = false,
  autoOcr = true,
  onOcrText,
}: ExpenseReceiptUploadProps) {
  const id = useId();
  const galleryInputId = `receipt-gallery-${id}`;
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [successMeta, setSuccessMeta] = useState<CompressReceiptResult | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) setSuccessMeta(null);
  }, [value]);

  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setError(null);
      setSuccessMeta(null);
      setStatusLine(null);
      setOcrNote(null);

      if (file.size > MAX_RECEIPT_UPLOAD_BYTES) {
        setError(
          `File too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_RECEIPT_UPLOAD_BYTES)} before compression.`,
        );
        return;
      }
      if (!isReceiptImageFile(file)) {
        setError("Please use JPG, JPEG, PNG, WEBP, or iPhone HEIC/HEIF.");
        return;
      }

      setLoading(true);
      const heic = isHeicLike(file);
      setStatusLine(heic ? "Converting HEIC to JPEG…" : "Optimizing image…");
      try {
        const result = await compressReceiptImage(file);
        if (autoOcr) {
          setStatusLine("Reading receipt text (OCR)…");
          try {
            const { text } = await runImageOcrWithRetries(result.dataUrl);
            onOcrText?.(text);
            if (!text.trim()) {
              setOcrNote("No text detected—image is still saved for your records.");
            }
          } catch {
            setOcrNote("OCR unavailable this time—receipt image is still saved.");
          }
        }
        onChange(result.dataUrl);
        setSuccessMeta(result);
        setStatusLine(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
        setStatusLine(null);
      } finally {
        setLoading(false);
      }
    },
    [onChange, onOcrText, autoOcr],
  );

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    await processFile(file);
    event.target.value = "";
  }

  function onDragOver(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }

  function onDragLeave(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }

  async function onDrop(event: React.DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    await processFile(file);
  }

  function clearReceipt() {
    setSuccessMeta(null);
    setError(null);
    setStatusLine(null);
    setOcrNote(null);
    onOcrText?.("");
    onChange(undefined);
  }

  const successText: string | null = successMeta
    ? [
        "Preview ready",
        successMeta.convertedFromHeic ? "HEIC → JPEG" : null,
        `${successMeta.width}×${successMeta.height}`,
        `${formatBytes(successMeta.originalBytes)} → ${formatBytes(successMeta.outputBytes)}`,
        autoOcr ? "OCR scanned" : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="sm:col-span-2">
      <div className={`flex flex-wrap items-end justify-between gap-2 ${compact ? "mb-1" : "mb-2"}`}>
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">
          <Camera size={compact ? 12 : 13} /> Receipt / bill upload
        </span>
        <span className="text-[10px] font-bold text-slate-400">Max {formatBytes(MAX_RECEIPT_UPLOAD_BYTES)}</span>
      </div>

      <input
        ref={galleryInputRef}
        id={galleryInputId}
        type="file"
        accept={GALLERY_ACCEPT}
        className="sr-only"
        onChange={onFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={CAMERA_ACCEPT}
        capture="environment"
        className="sr-only"
        onChange={onFileChange}
      />

      {value ? (
        <div
          className={`relative overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 ${compact ? "p-2" : "p-3"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Receipt preview (JPEG, OCR-ready)"
            decoding="async"
            className={`w-full rounded-lg object-contain ${compact ? "max-h-36" : "max-h-52"}`}
          />
          <button
            type="button"
            onClick={clearReceipt}
            className={`absolute rounded-full bg-white/95 text-red-600 shadow-lg transition hover:scale-105 ${compact ? "right-2 top-2 p-1.5" : "right-5 top-5 p-2"}`}
            aria-label="Remove receipt"
          >
            <X size={compact ? 14 : 16} />
          </button>
          {successText ? (
            <p
              className={`mt-1.5 rounded-lg bg-emerald-700/10 px-2 py-1.5 text-center text-[10px] font-black text-emerald-900 sm:text-xs ${compact ? "" : ""}`}
            >
              {successText}
            </p>
          ) : (
            <p className={`text-center text-[10px] font-bold text-emerald-700 sm:text-xs ${compact ? "mt-1" : "mt-2"}`}>
              JPEG preview attached · iPhone HEIC supported
            </p>
          )}
          {ocrNote ? (
            <p className="mt-1 text-center text-[10px] font-bold text-amber-800 sm:text-xs">{ocrNote}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                galleryInputRef.current?.click();
              }
            }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 text-center outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              compact ? "py-4" : "py-8"
            } ${
              dragging
                ? "border-emerald-500 bg-emerald-50 scale-[1.01]"
                : "border-emerald-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50"
            }`}
            onClick={() => galleryInputRef.current?.click()}
          >
            <div
              className={`grid place-items-center rounded-xl bg-emerald-100 text-emerald-700 ${compact ? "mb-2 h-10 w-10" : "mb-3 h-14 w-14 rounded-2xl"}`}
            >
              {loading ? (
                <Upload className="animate-bounce" size={compact ? 20 : 24} />
              ) : (
                <ImagePlus size={compact ? 20 : 24} />
              )}
            </div>
            <p className={`font-black text-emerald-900 ${compact ? "text-xs" : ""}`}>
              {loading ? "Processing…" : "Tap, drag & drop, or camera"}
            </p>
            <p
              className={`text-xs font-bold text-slate-500 ${compact ? "mt-0.5 line-clamp-2 max-w-[18rem] text-[10px]" : "mt-1"}`}
            >
              JPG · PNG · WEBP · iPhone HEIC / HEIF (auto → JPEG + OCR)
            </p>
            {statusLine ? (
              <p className="mt-2 text-[10px] font-black text-emerald-800 sm:text-xs">{statusLine}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 py-2 text-[11px] font-black text-emerald-900 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
          >
            <Camera size={15} strokeWidth={2.5} />
            Use camera
          </button>
        </div>
      )}

      {error ? <p className={`text-xs font-bold text-red-600 ${compact ? "mt-1" : "mt-2"}`}>{error}</p> : null}
    </div>
  );
}
