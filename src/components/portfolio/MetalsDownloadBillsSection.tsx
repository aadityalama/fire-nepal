"use client";

import { ChevronDown, Download, Eye, FileText, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
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

function triggerDownload(url: string, fileName: string) {
  const run = (href: string, revoke?: () => void) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = fileName;
    a.rel = "noopener";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (revoke) {
      // Delay revoke so mobile browsers can start the download.
      window.setTimeout(revoke, 1500);
    }
  };

  // Blob URLs download more reliably on mobile than huge data: URLs.
  if (url.startsWith("data:")) {
    void fetch(url)
      .then((r) => r.blob())
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        run(objectUrl, () => URL.revokeObjectURL(objectUrl));
      })
      .catch(() => run(url));
    return;
  }
  run(url);
}

export function MetalsDownloadBillsSection({ ledger }: { ledger: readonly PortfolioLedgerEntry[] }) {
  const { state } = useWealthPortfolio();
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
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal
          aria-label="Bill preview"
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            onClick={() => setPreview(null)}
            aria-label="Close bill preview"
          >
            <X size={18} />
          </button>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col items-center gap-3 overflow-auto">
            <p className="text-center text-xs font-bold text-white/90">
              {preview.itemName} · {preview.fileName}
            </p>
            {isImageUrl(preview.url) && !isPdfUrl(preview.url) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={`Bill for ${preview.itemName}`}
                className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
                data-testid="metals-bill-preview-image"
                onError={() => {
                  setPreview({ ...preview, missing: true, url: null });
                }}
              />
            ) : isPdfUrl(preview.url) ? (
              <div className="flex w-full flex-col items-center gap-3">
                <iframe
                  title={`PDF bill for ${preview.itemName}`}
                  src={preview.url}
                  className="h-[min(70vh,640px)] w-full rounded-lg border border-white/15 bg-white"
                  data-testid="metals-bill-preview-pdf"
                />
                <div className="flex flex-wrap justify-center gap-2">
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#10B981]/40 bg-[#10B981]/15 px-3 text-xs font-black text-[#6EE7B7]"
                  >
                    <Eye size={14} aria-hidden />
                    Open file
                  </a>
                  <button
                    type="button"
                    onClick={() => triggerDownload(preview.url!, preview.fileName)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#D4AF37]/45 bg-[#D4AF37]/15 px-3 text-xs font-black text-[#F4D06F]"
                  >
                    <Download size={14} aria-hidden />
                    Download Bill
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg space-y-3 rounded-xl border border-white/15 bg-[#062B24] p-4 text-center">
                <FileText size={28} className="mx-auto text-amber-200" aria-hidden />
                <p className="text-sm font-bold text-white">This bill format opens best via download.</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#10B981]/40 bg-[#10B981]/15 px-3 text-xs font-black text-[#6EE7B7]"
                  >
                    <Eye size={14} aria-hidden />
                    Open file
                  </a>
                  <button
                    type="button"
                    onClick={() => triggerDownload(preview.url!, preview.fileName)}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#D4AF37]/45 bg-[#D4AF37]/15 px-3 text-xs font-black text-[#F4D06F]"
                  >
                    <Download size={14} aria-hidden />
                    Download Bill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {preview?.missing ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal
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
        </div>
      ) : null}
    </div>
  );
}
