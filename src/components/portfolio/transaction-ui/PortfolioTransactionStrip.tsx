"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { PortfolioIsoDateField } from "@/components/portfolio/PortfolioIsoDateField";

export function portfolioTxnTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

export type PortfolioTxnAccent = "emerald" | "amber" | "teal" | "rose" | "cyan" | "sky";

const accentBtn: Record<PortfolioTxnAccent, string> = {
  emerald: "from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40",
  amber: "from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 shadow-amber-900/30",
  teal: "from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-teal-900/40",
  rose: "from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-rose-900/35",
  cyan: "from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 shadow-cyan-900/35",
  sky: "from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-900/35",
};

export type TxnSegmentTone = "in" | "out" | "mid" | "div";

export type TxnSegmentDef = { id: string; label: string; tone: TxnSegmentTone };

function segmentClass(active: boolean, tone: TxnSegmentTone) {
  const base =
    "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition sm:text-xs ";
  if (!active) return `${base} bg-black/30 text-emerald-200/70`;
  if (tone === "in") return `${base} bg-lime-500/25 text-lime-200 ring-1 ring-lime-400/40`;
  if (tone === "out") return `${base} bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/35`;
  if (tone === "div") return `${base} bg-cyan-500/22 text-cyan-100 ring-1 ring-cyan-400/40`;
  return `${base} bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40`;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  headerLabel: string;
  summaryRight?: ReactNode;
  segments: TxnSegmentDef[];
  segmentId: string;
  onSegmentId: (id: string) => void;
  /** Optional wrapper for horizontal scroll on many segments (e.g. investments). */
  segmentsWrapClassName?: string;
  /** Override inner expanded panel surface (glass / gradient). */
  innerPanelClassName?: string;
  /** Hide fees row (e.g. bonus shares — no cash leg). */
  showFees?: boolean;
  /** When true, the transaction date field is omitted (caller still supplies `tradeDate` for submit logic). */
  hideTradeDate?: boolean;
  /** Override label on the default transaction date field. */
  tradeDateLabel?: string;
  children?: ReactNode;
  tradeDate: string;
  onTradeDate: (iso: string) => void;
  feesLabel: string;
  feesStr: string;
  onFeesStrChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  error: string | null;
  submitLabel: string;
  onSubmit: () => void;
  accent?: PortfolioTxnAccent;
};

export function PortfolioTransactionStrip({
  open,
  onOpenChange,
  headerLabel,
  summaryRight,
  segments,
  segmentId,
  onSegmentId,
  segmentsWrapClassName,
  innerPanelClassName,
  showFees = true,
  hideTradeDate = false,
  tradeDateLabel = "Transaction date",
  children,
  tradeDate,
  onTradeDate,
  feesLabel,
  feesStr,
  onFeesStrChange,
  notes,
  onNotesChange,
  error,
  submitLabel,
  onSubmit,
  accent = "emerald",
}: Props) {
  const today = portfolioTxnTodayIso;
  return (
    <div className="border-t border-emerald-400/10 pt-2">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-black/20 px-2 py-1.5 text-left text-[11px] font-black text-emerald-100/90 transition hover:bg-black/30 sm:text-xs"
      >
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center text-emerald-300/80">
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          <span className="truncate">{headerLabel}</span>
        </span>
        {summaryRight ? (
          <span className="max-w-[55%] shrink-0 truncate text-end text-[10px] font-bold text-emerald-200/55">
            {summaryRight}
          </span>
        ) : null}
      </button>
      {open && (
        <div
          className={
            innerPanelClassName ??
            "mt-2 space-y-2 rounded-xl border border-emerald-400/15 bg-black/25 p-2.5 sm:p-3"
          }
        >
          <div
            className={
              segmentsWrapClassName ??
              "flex flex-wrap gap-1.5"
            }
          >
            {segments.map((s) => (
              <button
                key={s.id}
                type="button"
                className={segmentClass(segmentId === s.id, s.tone)}
                onClick={() => onSegmentId(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {children}
          {showFees || !hideTradeDate ? (
            <div
              className={`grid gap-2 ${
                showFees && !hideTradeDate ? "sm:grid-cols-2" : ""
              }`}
            >
              {showFees ? (
                <label className="block">
                  <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">{feesLabel}</span>
                  <input
                    value={feesStr}
                    onChange={(e) => onFeesStrChange(e.target.value)}
                    inputMode="decimal"
                    className="wealth-input-text w-full px-2 py-1.5 text-xs font-bold"
                    placeholder="Optional"
                  />
                </label>
              ) : null}
              {!hideTradeDate ? (
                <PortfolioIsoDateField
                  label={tradeDateLabel}
                  value={tradeDate}
                  onChange={(next) => onTradeDate(next ?? today())}
                />
              ) : null}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-0.5 block text-[10px] font-bold uppercase text-emerald-200/55">Notes</span>
            <input
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="wealth-input-text w-full px-2 py-1.5 text-xs font-semibold"
              placeholder="Optional"
            />
          </label>
          {error ? <p className="text-[11px] font-bold text-rose-300">{error}</p> : null}
          <button
            type="button"
            onClick={onSubmit}
            className={`w-full rounded-xl bg-gradient-to-r py-2 text-xs font-black text-white shadow-lg transition sm:w-auto sm:px-6 ${accentBtn[accent]}`}
          >
            {submitLabel}
          </button>
        </div>
      )}
    </div>
  );
}
