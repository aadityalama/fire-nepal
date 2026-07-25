"use client";

import { Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { MiniSparkline } from "@/components/portfolio/premium/MiniSparkline";
import { formatMoney } from "@/lib/expense-utils";
import { formatSignedPct, type NepseHoldingRow, type NepsePortfolioSummary } from "./nepse-portfolio-metrics";

export type NepseTabId = "overview" | "holdings" | "transactions" | "corporate" | "analytics";

export const NEPSE_TABS: { id: NepseTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "holdings", label: "Holdings" },
  { id: "transactions", label: "Transactions" },
  { id: "corporate", label: "Corporate Actions" },
  { id: "analytics", label: "Analytics" },
];

const LOGO_PALETTE = [
  "from-emerald-500/80 to-teal-700/80",
  "from-cyan-500/80 to-blue-700/80",
  "from-amber-500/80 to-orange-700/80",
  "from-violet-500/80 to-indigo-700/80",
  "from-rose-500/80 to-red-700/80",
  "from-lime-500/80 to-green-700/80",
];

export function NepseSymbolLogo({ symbol }: { symbol: string }) {
  const idx = Math.abs([...symbol].reduce((a, c) => a + c.charCodeAt(0), 0)) % LOGO_PALETTE.length;
  const initials = symbol.slice(0, 3);
  return (
    <div
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${LOGO_PALETTE[idx]} text-[11px] font-black tracking-wide text-white shadow-inner ring-1 ring-white/15`}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function NepseTopTabs({
  active,
  onChange,
}: {
  active: NepseTabId;
  onChange: (id: NepseTabId) => void;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto rounded-2xl border border-emerald-400/15 bg-black/25 p-1 scrollbar-none"
      role="tablist"
      aria-label="NEPSE portfolio sections"
    >
      {NEPSE_TABS.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`shrink-0 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-wide transition sm:px-4 sm:text-xs ${
              on
                ? "bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-950/30"
                : "text-emerald-100/65 hover:bg-white/5 hover:text-emerald-50"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function NepseHeroCard({ summary }: { summary: NepsePortfolioSummary }) {
  const todayPos = (summary.todayGainNpr ?? 0) >= 0;
  const overallPos = summary.overallPnlNpr >= 0;
  const returnPos = (summary.portfolioReturnPct ?? 0) >= 0;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/25 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.28),transparent_55%),linear-gradient(155deg,#022c22_0%,#0a1f1a_48%,#020617_100%)] p-5 shadow-[0_28px_70px_rgba(0,0,0,0.45)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200/55">Portfolio value</p>
          <p className="mt-1.5 truncate text-3xl font-black tracking-tight text-white sm:text-4xl">
            {formatMoney(summary.portfolioValueNpr, "NPR")}
          </p>
        </div>
        <div className="h-14 w-28 shrink-0 sm:h-16 sm:w-36">
          <MiniSparkline
            data={summary.sparkline}
            variant={overallPos ? "emerald" : "amber"}
            className="h-full"
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
        <HeroStat
          label="Today"
          value={formatMoney(summary.todayGainNpr, "NPR")}
          sub={formatSignedPct(summary.todayGainPct)}
          positive={todayPos}
        />
        <HeroStat
          label="Overall P/L"
          value={formatMoney(summary.overallPnlNpr, "NPR")}
          sub={overallPos ? "Unrealized" : "Unrealized"}
          positive={overallPos}
        />
        <HeroStat
          label="Return"
          value={formatSignedPct(summary.portfolioReturnPct, 1)}
          sub="vs cost"
          positive={returnPos}
        />
      </div>
    </section>
  );
}

function HeroStat({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-2.5 py-2.5 sm:px-3 sm:py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-100/45 sm:text-[10px]">{label}</p>
      <p className={`mt-1 truncate text-xs font-black tabular-nums sm:text-sm ${positive ? "text-lime-300" : "text-rose-300"}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-emerald-100/40">{sub}</p>
    </div>
  );
}

export function NepseHoldingsList({
  holdings,
  onOpen,
  emptyLabel = "No holdings yet. Tap + Add Stock to begin.",
}: {
  holdings: NepseHoldingRow[];
  onOpen: (id: string) => void;
  emptyLabel?: string;
}) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-emerald-400/20 bg-black/20 px-4 py-12 text-center text-sm font-bold text-emerald-200/50">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-emerald-400/10 overflow-hidden rounded-2xl border border-emerald-400/15 bg-black/30">
      {holdings.map((h) => {
        const dayPos = (h.dayChangePct ?? 0) >= 0;
        const pnlPos = h.pnlNpr >= 0;
        return (
          <li key={h.row.id}>
            <button
              type="button"
              onClick={() => onOpen(h.row.id)}
              className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-emerald-500/8 active:bg-emerald-500/12 sm:px-4"
            >
              <NepseSymbolLogo symbol={h.symbol} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-black text-white">{h.symbol}</span>
                  <span className="truncate text-[11px] font-semibold text-emerald-100/45">{h.companyName}</span>
                </div>
                <p className="mt-0.5 text-xs font-bold tabular-nums text-emerald-50/90">
                  {formatMoney(h.liveNpr, "NPR")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-xs font-black tabular-nums ${dayPos ? "text-lime-300" : "text-rose-300"}`}>
                  {formatSignedPct(h.dayChangePct)}
                </p>
                <p className={`mt-0.5 text-[11px] font-bold tabular-nums ${pnlPos ? "text-lime-300/90" : "text-rose-300/90"}`}>
                  {formatMoney(h.pnlNpr, "NPR")}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function NepseAddStockFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-5 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(16,185,129,0.45)] transition hover:brightness-105 active:scale-[0.98] sm:bottom-8 sm:right-8"
      aria-label="Add stock"
    >
      <Plus className="h-5 w-5" strokeWidth={2.5} />
      Add Stock
    </button>
  );
}

export function NepseSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal>
      <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-emerald-400/20 bg-slate-950 p-4 shadow-2xl sm:rounded-3xl sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-emerald-100/70 hover:bg-white/5"
            aria-label="Close sheet"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DetailMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "pos" | "neg";
}) {
  const color =
    tone === "pos" ? "text-lime-300" : tone === "neg" ? "text-rose-300" : "text-white";
  return (
    <div className="rounded-2xl border border-emerald-400/12 bg-black/25 px-3 py-2.5">
      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-100/40">{label}</p>
      <p className={`mt-1 text-sm font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
