"use client";

import { ChevronDown, Download, Eye, FileText, Search, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  sanitizeMetalPurchaseBillUrls,
  sanitizeMetalTxBillUrls,
} from "@/components/portfolio/metal-photo-utils";
import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";

type MetalFilter = "all" | "gold" | "silver";

export type MetalsBillRecord = {
  id: string;
  itemName: string;
  metal: "gold" | "silver" | null;
  tradeDate: string | null;
  txType: "buy" | "sell" | null;
  fileName: string;
  url: string | null;
  missing: boolean;
  source: "ledger" | "legacy";
};

function isPdfUrl(url: string): boolean {
  return url.startsWith("data:application/pdf;base64,") || /\.pdf(?:$|\?)/i.test(url);
}

function isImageUrl(url: string): boolean {
  return (
    url.startsWith("data:image/") ||
    /\.(jpe?g|png|webp|gif)(?:$|\?)/i.test(url) ||
    (url.startsWith("https://") && !isPdfUrl(url))
  );
}

function extensionForUrl(url: string): string {
  if (isPdfUrl(url)) return "pdf";
  if (url.startsWith("data:image/jpeg") || url.includes(".jpg") || url.includes(".jpeg")) return "jpg";
  if (url.includes(".png") || url.startsWith("data:image/png")) return "png";
  if (url.includes(".webp") || url.startsWith("data:image/webp")) return "webp";
  if (url.includes(".gif") || url.startsWith("data:image/gif")) return "gif";
  return "file";
}

function slugFilePart(name: string): string {
  const s = name
    .trim()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
  return s || "bill";
}

/** Bills are stored as data URLs / https refs without original upload names — derive a stable download name. */
function deriveBillFileName(itemName: string, url: string, index: number): string {
  return `${slugFilePart(itemName)}-bill-${index + 1}.${extensionForUrl(url)}`;
}

function billUrlUsable(url: string | null | undefined): url is string {
  if (!url || typeof url !== "string") return false;
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("data:application/pdf;base64,") && t.length > "data:application/pdf;base64,".length + 8) return true;
  if (t.startsWith("data:image/") && t.includes(";base64,") && t.length > 32) return true;
  if (t.startsWith("https://") && t.length >= 12) return true;
  return false;
}

export function collectMetalsBillRecords(
  ledger: readonly PortfolioLedgerEntry[],
  legacyBillUrls: readonly string[] = [],
): MetalsBillRecord[] {
  const out: MetalsBillRecord[] = [];

  const metalEntries = ledger
    .filter((e) => e.bucket === "metal" && (e.txType === "buy" || e.txType === "sell"))
    .slice()
    .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate) || b.id.localeCompare(a.id));

  for (const e of metalEntries) {
    const meta = e.meta && typeof e.meta === "object" ? (e.meta as Record<string, unknown>) : {};
    const bills = sanitizeMetalTxBillUrls(meta.metalTxBillUrls);
    if (bills.length === 0) continue;
    const itemName = (e.assetLabel || (e.metal === "silver" ? "Silver" : "Gold")).trim();
    const metal = e.metal === "gold" || e.metal === "silver" ? e.metal : null;
    bills.forEach((url, idx) => {
      const usable = billUrlUsable(url);
      out.push({
        id: `${e.id}-bill-${idx}`,
        itemName,
        metal,
        tradeDate: e.tradeDate || null,
        txType: e.txType === "buy" || e.txType === "sell" ? e.txType : null,
        fileName: usable ? deriveBillFileName(itemName, url, idx) : `missing-bill-${idx + 1}`,
        url: usable ? url : null,
        missing: !usable,
        source: "ledger",
      });
    });
  }

  const legacy = sanitizeMetalPurchaseBillUrls(legacyBillUrls);
  legacy.forEach((url, idx) => {
    const usable = billUrlUsable(url);
    out.push({
      id: `legacy-bill-${idx}`,
      itemName: "Legacy module bill",
      metal: null,
      tradeDate: null,
      txType: null,
      fileName: usable ? deriveBillFileName("legacy-module", url, idx) : `missing-legacy-bill-${idx + 1}`,
      url: usable ? url : null,
      missing: !usable,
      source: "legacy",
    });
  });

  return out;
}

/** Download the original file bytes only (never a screenshot of the preview UI). */
function triggerDownload(url: string, fileName: string) {
  const run = (href: string, revoke?: () => void) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.rel = "noopener";
    // Keep same-tab so mobile Safari honors download= for blob/data URLs.
    a.target = "_self";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) {
      window.setTimeout(revoke, 2000);
    }
  };

  void (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      // Preserve PDF / image MIME from the original payload when possible.
      const typed =
        blob.type && blob.type !== "application/octet-stream"
          ? blob
          : new Blob([blob], {
              type: fileName.toLowerCase().endsWith(".pdf")
                ? "application/pdf"
                : fileName.toLowerCase().match(/\.png$/)
                  ? "image/png"
                  : fileName.toLowerCase().match(/\.webp$/)
                    ? "image/webp"
                    : fileName.toLowerCase().match(/\.gif$/)
                      ? "image/gif"
                      : "image/jpeg",
            });
      const objectUrl = URL.createObjectURL(typed);
      run(objectUrl, () => URL.revokeObjectURL(objectUrl));
    } catch {
      // Cross-origin signed URLs without CORS: open original in a new tab (still the file, not the UI).
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  })();
}

type TouchPoint = { clientX: number; clientY: number };

function touchDistance(a: TouchPoint, b: TouchPoint): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Single-viewport image lightbox with pinch / double-tap zoom. */
function BillImageLightbox({
  url,
  alt,
  onBroken,
}: {
  url: string;
  alt: string;
  onBroken: () => void;
}): ReactElement {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [gesturing, setGesturing] = useState(false);
  const pinchRef = useRef<{ startDist: number; startScale: number } | null>(null);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTapRef = useRef(0);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const onTouchStart = (e: ReactTouchEvent) => {
    if (e.touches.length === 2) {
      panRef.current = null;
      pinchRef.current = {
        startDist: touchDistance(e.touches[0], e.touches[1]),
        startScale: scale,
      };
      setGesturing(true);
      return;
    }
    if (e.touches.length === 1 && scale > 1) {
      panRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        tx,
        ty,
      };
      setGesturing(true);
    }
  };

  const onTouchMove = (e: ReactTouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const dist = touchDistance(e.touches[0], e.touches[1]);
      const next = Math.min(4, Math.max(1, (pinchRef.current.startScale * dist) / pinchRef.current.startDist));
      setScale(next);
      if (next <= 1.02) {
        setTx(0);
        setTy(0);
      }
      return;
    }
    if (e.touches.length === 1 && panRef.current && scale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panRef.current.x;
      const dy = e.touches[0].clientY - panRef.current.y;
      setTx(panRef.current.tx + dx);
      setTy(panRef.current.ty + dy);
    }
  };

  const onTouchEnd = (e: ReactTouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) {
      panRef.current = null;
      setGesturing(false);
      if (scale < 1.05) resetZoom();
    }
  };

  const onDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      if (scale > 1.05) resetZoom();
      else setScale(2.2);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  const onWheel = (e: ReactWheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    setScale((s) => Math.min(4, Math.max(1, s - e.deltaY * 0.01)));
  };

  return (
    <div
      className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden overscroll-none touch-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={onDoubleTap}
      onWheel={onWheel}
      data-testid="metals-bill-preview-viewport"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        draggable={false}
        className="max-h-full max-w-full select-none object-contain"
        style={{
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
          transformOrigin: "center center",
          transition: gesturing ? undefined : "transform 120ms ease-out",
        }}
        data-testid="metals-bill-preview-image"
        onError={onBroken}
      />
    </div>
  );
}

function BillPreviewModal({
  bill,
  onClose,
  onMissing,
}: {
  bill: MetalsBillRecord;
  onClose: () => void;
  onMissing: () => void;
}): ReactElement | null {
  const isClient = useIsClient();
  const url = bill.url;

  useEffect(() => {
    if (!url) return;
    const html = document.documentElement;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyTouch = document.body.style.touchAction;
    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.touchAction = prevBodyTouch;
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      window.removeEventListener("keydown", onKey);
    };
  }, [url, onClose]);

  if (!isClient || !url) return null;

  const image = isImageUrl(url) && !isPdfUrl(url);
  const pdf = isPdfUrl(url);

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      role="dialog"
      aria-modal="true"
      aria-label="Bill preview"
      data-testid="metals-bill-preview-modal"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/15 bg-black/95 px-3 py-2.5">
        <p className="min-w-0 flex-1 truncate text-left text-xs font-bold text-white/90">
          {bill.itemName} · {bill.fileName}
        </p>
        <button
          type="button"
          onClick={() => triggerDownload(url, bill.fileName)}
          data-testid="metals-bill-preview-download"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#D4AF37]/50 bg-[#D4AF37]/20 px-3 text-xs font-black text-[#F4D06F]"
        >
          <Download size={15} aria-hidden />
          Download
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close bill preview"
          data-testid="metals-bill-preview-close"
          className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {image ? (
          <BillImageLightbox url={url} alt={`Bill for ${bill.itemName}`} onBroken={onMissing} />
        ) : pdf ? (
          <div className="flex h-full min-h-0 w-full flex-1 flex-col">
            <iframe
              title={`PDF bill for ${bill.itemName}`}
              src={url}
              className="h-full min-h-0 w-full flex-1 border-0 bg-white"
              data-testid="metals-bill-preview-pdf"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <FileText size={28} className="text-amber-200" aria-hidden />
            <p className="text-sm font-bold text-white">This bill format opens best via download.</p>
            <button
              type="button"
              onClick={() => triggerDownload(url, bill.fileName)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#D4AF37]/45 bg-[#D4AF37]/15 px-3 text-xs font-black text-[#F4D06F]"
            >
              <Download size={14} aria-hidden />
              Download Bill
            </button>
          </div>
        )}
      </div>

      {image ? (
        <p className="shrink-0 px-3 py-1.5 text-center text-[10px] font-semibold text-white/45">
          Pinch or double-tap to zoom · Download saves the original file only
        </p>
      ) : null}
    </div>,
    document.body,
  );
}

export function MetalsDownloadBillsSection({ ledger }: { ledger: readonly PortfolioLedgerEntry[] }) {
  const { state } = useWealthPortfolio();
  const isClient = useIsClient();
  const [open, setOpen] = useState(false);
  const [metalFilter, setMetalFilter] = useState<MetalFilter>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<MetalsBillRecord | null>(null);

  const bills = useMemo(
    () => collectMetalsBillRecords(ledger, state.metalPurchaseBillUrls ?? []),
    [ledger, state.metalPurchaseBillUrls],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills.filter((b) => {
      if (metalFilter === "gold" && b.metal !== "gold") return false;
      if (metalFilter === "silver" && b.metal !== "silver") return false;
      if (!q) return true;
      return (
        b.itemName.toLowerCase().includes(q) ||
        b.fileName.toLowerCase().includes(q) ||
        (b.tradeDate ?? "").includes(q)
      );
    });
  }, [bills, metalFilter, query]);

  const filterBtn = (id: MetalFilter, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setMetalFilter(id)}
      data-testid={`metals-bills-filter-${id}`}
      className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-black transition ${
        metalFilter === id
          ? "border-[#10B981]/55 bg-[#10B981]/20 text-[#6EE7B7]"
          : "border-white/10 bg-black/25 text-[#CBD5E1]/70 hover:border-[#10B981]/30"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-1 space-y-2" data-testid="metals-download-bills-section">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-[#10B981]/25 bg-[#062B24]/40 px-3 py-2.5 text-left transition hover:border-[#10B981]/40"
        aria-expanded={open}
        data-testid="metals-download-bills-toggle"
      >
        <span className="text-xs font-black uppercase tracking-[0.1em] text-[#F8FAFC]">
          Download Bills
          <span className="ml-2 font-bold normal-case tracking-normal text-[#CBD5E1]/55">
            ({bills.length})
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#CBD5E1]/70 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-3 rounded-xl border border-[#10B981]/20 bg-[#03100F]/60 p-3 sm:p-3.5">
          <p className="text-[11px] font-semibold text-[#CBD5E1]/65">
            Preview and download bills and invoices already saved on your Gold &amp; Silver transactions. Only your
            own portfolio documents are listed.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {filterBtn("all", "All Bills")}
            {filterBtn("gold", "Gold")}
            {filterBtn("silver", "Silver")}
          </div>

          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-[#10B981]/20 bg-black/30 px-3 py-2">
            <Search size={14} className="shrink-0 text-[#10B981]" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by item name…"
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-[#F8FAFC] outline-none placeholder:text-[#CBD5E1]/40"
              aria-label="Search bills by item name"
            />
          </label>

          {filtered.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-black/25 px-3 py-4 text-center text-[12px] font-semibold text-[#CBD5E1]/65">
              {bills.length === 0
                ? "No saved bills yet. Upload bills when recording a buy or sell — they will appear here."
                : "No bills match this filter or search."}
            </p>
          ) : (
            <ul className="max-h-[min(60vh,480px)] space-y-2 overflow-y-auto pr-0.5">
              {filtered.map((bill) => (
                <li
                  key={bill.id}
                  data-testid="metals-bill-row"
                  data-metal={bill.metal ?? "unspecified"}
                  className="rounded-xl border border-[#10B981]/15 bg-black/30 px-3 py-2.5 sm:px-3.5"
                >
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#F8FAFC]">{bill.itemName}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#CBD5E1]/70">
                        {bill.metal === "gold" ? "Gold" : bill.metal === "silver" ? "Silver" : "Unspecified"}
                        {" · "}
                        {bill.txType === "buy" ? "Purchase" : bill.txType === "sell" ? "Sale" : "Record"}
                        {" · "}
                        {bill.tradeDate ?? "Date unavailable"}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-[#6EE7B7]/90">
                        {isPdfUrl(bill.url ?? "") || bill.fileName.endsWith(".pdf") ? (
                          <FileText size={12} className="shrink-0 text-amber-200" aria-hidden />
                        ) : null}
                        <span className="truncate">{bill.fileName}</span>
                      </p>
                    </div>
                    <div className="flex w-full shrink-0 flex-wrap gap-1.5 sm:w-auto sm:justify-end">
                      <button
                        type="button"
                        disabled={bill.missing || !bill.url}
                        onClick={() => {
                          if (bill.missing || !bill.url) return;
                          setPreview(bill);
                        }}
                        data-testid="metals-bill-view"
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#10B981]/35 bg-[#10B981]/10 px-2.5 text-[11px] font-black text-[#6EE7B7] transition hover:bg-[#10B981]/18 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Eye size={13} aria-hidden />
                        View Bill
                      </button>
                      <button
                        type="button"
                        disabled={bill.missing || !bill.url}
                        onClick={() => {
                          if (bill.missing || !bill.url) return;
                          triggerDownload(bill.url, bill.fileName);
                        }}
                        data-testid="metals-bill-download"
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 text-[11px] font-black text-[#F4D06F] transition hover:bg-[#D4AF37]/18 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Download size={13} aria-hidden />
                        Download Bill
                      </button>
                    </div>
                  </div>
                  {bill.missing ? (
                    <p className="mt-2 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-rose-200">
                      Original file is missing or unreadable. No replacement bill was generated.
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {preview && preview.url ? (
        <BillPreviewModal
          bill={preview}
          onClose={() => setPreview(null)}
          onMissing={() => setPreview({ ...preview, missing: true, url: null })}
        />
      ) : null}

      {isClient && preview?.missing
        ? createPortal(
            <div
              className="fixed inset-0 z-[400] flex h-[100dvh] items-center justify-center bg-black/90 p-4"
              role="dialog"
              aria-modal="true"
              aria-label="Missing bill"
            >
              <div className="max-w-sm rounded-xl border border-rose-400/30 bg-[#062B24] p-4 text-center">
                <p className="text-sm font-bold text-rose-100">
                  Original file is missing or unreadable. No replacement bill was generated.
                </p>
                <button
                  type="button"
                  className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-xs font-black text-white"
                  onClick={() => setPreview(null)}
                >
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
