"use client";

import { Download, FileText, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { PortfolioLedgerEntry } from "@/components/portfolio/types";
import { formatMoney } from "@/lib/expense-utils";
import { bucketLabel, txToneClass } from "@/components/portfolio/ledger-ui/ledger-shared";
import {
  sanitizeMetalTxBillUrls,
  sanitizeMetalTxPhotoUrls,
} from "@/components/portfolio/metal-photo-utils";

function isPdfDataUrl(url: string): boolean {
  return url.startsWith("data:application/pdf;base64,");
}

function attachmentFilename(url: string, kind: "bill" | "photo", index: number): string {
  if (isPdfDataUrl(url)) return `metal-${kind}-${index + 1}.pdf`;
  if (url.startsWith("data:image/jpeg")) return `metal-${kind}-${index + 1}.jpg`;
  const ext = url.includes(".png") ? "png" : "file";
  return `metal-${kind}-${index + 1}.${ext}`;
}

function MetalLedgerAttachments({
  entry,
  onPatchEntry,
}: {
  entry: PortfolioLedgerEntry;
  onPatchEntry?: (id: string, patch: (e: PortfolioLedgerEntry) => PortfolioLedgerEntry) => void;
}) {
  const meta = entry.meta && typeof entry.meta === "object" ? (entry.meta as Record<string, unknown>) : {};
  const bills = sanitizeMetalTxBillUrls(meta.metalTxBillUrls);
  const photos = sanitizeMetalTxPhotoUrls(meta.metalTxPhotoUrls);
  const [preview, setPreview] = useState<string | null>(null);

  if (bills.length === 0 && photos.length === 0) return null;

  const removeAt = (kind: "bill" | "photo", index: number) => {
    if (!onPatchEntry) return;
    onPatchEntry(entry.id, (e) => {
      const m = e.meta && typeof e.meta === "object" ? { ...(e.meta as Record<string, unknown>) } : {};
      const key = kind === "bill" ? "metalTxBillUrls" : "metalTxPhotoUrls";
      const cur = kind === "bill" ? sanitizeMetalTxBillUrls(m.metalTxBillUrls) : sanitizeMetalTxPhotoUrls(m.metalTxPhotoUrls);
      const next = cur.filter((_, i) => i !== index);
      if (next.length === 0) delete m[key];
      else m[key] = next;
      return { ...e, meta: Object.keys(m).length ? m : undefined };
    });
  };

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Attachments</p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {bills.map((url, idx) => (
          <li
            key={`b-${idx}-${url.slice(0, 24)}`}
            className="flex max-w-full items-center gap-1 rounded-lg border border-emerald-400/20 bg-black/35 px-1.5 py-1 text-[10px] font-bold text-emerald-100/90"
          >
            {isPdfDataUrl(url) ? <FileText size={12} className="shrink-0 text-amber-200" /> : null}
            {!isPdfDataUrl(url) ? (
              <button
                type="button"
                className="max-w-[4.5rem] truncate text-start text-emerald-100 underline decoration-emerald-400/40"
                onClick={() => setPreview(url)}
              >
                Bill {idx + 1}
              </button>
            ) : (
              <a
                href={url}
                download={attachmentFilename(url, "bill", idx)}
                className="max-w-[4.5rem] truncate text-emerald-100 underline decoration-emerald-400/40"
              >
                PDF {idx + 1}
              </a>
            )}
            <a
              href={url}
              download={attachmentFilename(url, "bill", idx)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded border border-emerald-400/25 text-emerald-200/80 hover:bg-emerald-500/15"
              title="Download"
            >
              <Download size={12} />
            </a>
            {onPatchEntry ? (
              <button
                type="button"
                className="grid h-6 w-6 shrink-0 place-items-center rounded border border-rose-400/25 text-rose-200/90 hover:bg-rose-500/15"
                title="Remove from transaction"
                onClick={() => removeAt("bill", idx)}
              >
                <Trash2 size={12} />
              </button>
            ) : null}
          </li>
        ))}
        {photos.map((url, idx) => (
          <li
            key={`p-${idx}-${url.slice(0, 24)}`}
            className="flex max-w-full items-center gap-1 rounded-lg border border-amber-400/20 bg-black/35 px-1.5 py-1 text-[10px] font-bold text-amber-100/90"
          >
            <button type="button" className="underline decoration-amber-400/40" onClick={() => setPreview(url)}>
              Photo {idx + 1}
            </button>
            <a
              href={url}
              download={attachmentFilename(url, "photo", idx)}
              className="grid h-6 w-6 shrink-0 place-items-center rounded border border-amber-400/25 text-amber-200/80 hover:bg-amber-500/15"
              title="Download"
            >
              <Download size={12} />
            </a>
            {onPatchEntry ? (
              <button
                type="button"
                className="grid h-6 w-6 shrink-0 place-items-center rounded border border-rose-400/25 text-rose-200/90 hover:bg-rose-500/15"
                title="Remove from transaction"
                onClick={() => removeAt("photo", idx)}
              >
                <Trash2 size={12} />
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {preview ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-label="Attachment preview"
        >
          <button
            type="button"
            className="absolute right-3 top-3 rounded-lg border border-white/20 bg-white/10 p-2 text-white"
            onClick={() => setPreview(null)}
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
          {isPdfDataUrl(preview) ? (
            <p className="max-w-md text-center text-sm font-bold text-white">
              PDF preview is not embedded. Use Download from the ledger row, or open the attachment link in a new tab.
            </p>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={preview} alt="" className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LedgerEntryList({
  entries,
  listClassName,
  onPatchLedgerEntry,
}: {
  entries: readonly PortfolioLedgerEntry[];
  /** When set, overrides default scroll area (used by global master ledger). */
  listClassName?: string;
  /** When provided, metal bucket rows may edit attachment lists in-place. */
  onPatchLedgerEntry?: (entryId: string, patch: (e: PortfolioLedgerEntry) => PortfolioLedgerEntry) => void;
}) {
  return (
    <ul
      className={
        listClassName ?? "max-h-[min(55vh,420px)] space-y-2 overflow-y-auto pr-0.5"
      }
    >
      {entries.map((e) => (
        <li
          key={e.id}
          className={`wealth-row-card rounded-xl border-l-2 p-2.5 sm:p-3 ${txToneClass(e.txType)}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-emerald-50 sm:text-base">{e.assetLabel}</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200/55 sm:text-xs">
                {bucketLabel(e)} · {e.tradeDate}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-100/90">
              {e.ledgerAction ?? e.txType}
            </span>
          </div>
          <div className="mt-2 grid gap-1.5 text-xs font-bold tabular-nums text-emerald-100/90 sm:grid-cols-2 sm:text-sm">
            <div>
              <span className="text-emerald-200/50">
                {e.txType === "cash_dividend"
                  ? "Gross · currency"
                  : e.unitPrice === 1 &&
                      (e.bucket === "liquid_cash" ||
                        e.bucket === "real_estate" ||
                        e.bucket === "vehicle" ||
                        e.bucket === "liability" ||
                        e.bucket === "retirement")
                    ? "Amount"
                    : e.bucket === "metal"
                      ? "Grams · NPR/g"
                      : "Qty · price"}
              </span>
              <p className="font-black">
                {e.txType === "cash_dividend" ? (
                  <>
                    {Number(
                      typeof e.meta?.dividendGrossInCcy === "number" ? e.meta.dividendGrossInCcy : e.quantity,
                    ).toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                    {e.currency}
                  </>
                ) : e.unitPrice === 1 &&
                  (e.bucket === "liquid_cash" ||
                    e.bucket === "real_estate" ||
                    e.bucket === "vehicle" ||
                    e.bucket === "liability" ||
                    e.bucket === "retirement") ? (
                  `${e.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${e.currency}`
                ) : (
                  `${e.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} @ ${e.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${e.currency}`
                )}
              </p>
            </div>
            {e.txType === "cash_dividend" && typeof e.meta?.dividendNetNpr === "number" ? (
              <div>
                <span className="text-emerald-200/50">Net to cashflow (NPR)</span>
                <p className="font-black text-cyan-200">{formatMoney(e.meta.dividendNetNpr as number, "NPR")}</p>
              </div>
            ) : null}
            {e.fees != null && e.fees > 0 && (
              <div>
                <span className="text-emerald-200/50">Fees</span>
                <p className="font-black">
                  {e.fees.toLocaleString()} {e.currency}
                </p>
              </div>
            )}
            {e.txType === "sell" && typeof e.realizedGainNpr === "number" && (
              <div className="sm:col-span-2">
                <span className="text-emerald-200/50">Realized P/L (NPR)</span>
                <p className={`font-black ${e.realizedGainNpr >= 0 ? "text-lime-300" : "text-rose-300"}`}>
                  {formatMoney(e.realizedGainNpr, "NPR")}
                </p>
              </div>
            )}
            {e.txType === "sell" && e.realizedGainNpr == null && (
              <div className="sm:col-span-2 text-[10px] font-semibold text-amber-200/80">
                Realized P/L unavailable (e.g. metal without cost basis).
              </div>
            )}
          </div>
          {e.notes ? (
            <p className="mt-2 border-t border-white/5 pt-2 text-[11px] font-semibold leading-snug text-emerald-200/70 sm:text-xs">
              {e.notes}
            </p>
          ) : null}
          {e.bucket === "metal" ? (
            <MetalLedgerAttachments entry={e} onPatchEntry={onPatchLedgerEntry} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
