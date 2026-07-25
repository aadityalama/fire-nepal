"use client";

import { Bell, ChevronRight, Plus, Search, X } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { formatMoney } from "@/lib/expense-utils";
import {
  buildNepsePerformanceSeries,
  formatSignedPct,
  NEPSE_CHART_RANGES,
  NEPSE_HOLDING_FILTERS,
  type NepseChartRange,
  type NepseHoldingFilter,
  type NepseHoldingRow,
  type NepsePortfolioSummary,
} from "./nepse-portfolio-metrics";

export type NepseTabId = "overview" | "holdings" | "transactions" | "corporate" | "analytics";

export const NEPSE_TABS: { id: NepseTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "holdings", label: "Holdings" },
  { id: "transactions", label: "Transactions" },
  { id: "corporate", label: "Corporate Actions" },
  { id: "analytics", label: "Analytics" },
];

/** Shared glass surface: 24px radius, soft shadow, emerald-tinted border. */
export const NEPSE_GLASS =
  "rounded-[1.5rem] border border-white/[0.09] bg-white/[0.045] shadow-[0_18px_50px_-24px_rgba(0,0,0,0.75)] backdrop-blur-xl";

const LOGO_PALETTE = [
  "from-emerald-400/90 to-teal-600/90",
  "from-cyan-400/90 to-blue-600/90",
  "from-amber-400/90 to-orange-600/90",
  "from-violet-400/90 to-indigo-600/90",
  "from-rose-400/90 to-red-600/90",
  "from-lime-400/90 to-green-600/90",
];

export function NepseSymbolLogo({ symbol, size = "md" }: { symbol: string; size?: "md" | "lg" }) {
  const idx = Math.abs([...symbol].reduce((a, c) => a + c.charCodeAt(0), 0)) % LOGO_PALETTE.length;
  const box = size === "lg" ? "h-14 w-14 text-sm rounded-2xl" : "h-11 w-11 text-[11px] rounded-[0.9rem]";
  return (
    <div
      className={`grid ${box} shrink-0 place-items-center bg-gradient-to-br ${LOGO_PALETTE[idx]} font-black tracking-wide text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-white/20`}
      aria-hidden
    >
      {symbol.slice(0, 3)}
    </div>
  );
}

export function NepseWorkspaceHeader({
  onSearch,
  notificationCount,
}: {
  onSearch: () => void;
  notificationCount: number;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[1.6rem] font-black leading-tight tracking-tight text-white sm:text-[2rem]">
          NEPSE Portfolio
        </h1>
        <p className="mt-1 text-xs font-semibold text-emerald-100/50 sm:text-sm">
          Track your investments in NEPSE
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onSearch}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.05] text-emerald-100/80 backdrop-blur-xl transition hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-white active:scale-95"
          aria-label="Search holdings"
        >
          <Search size={18} strokeWidth={2.25} />
        </button>
        <button
          type="button"
          className="relative grid h-11 w-11 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.05] text-emerald-100/80 backdrop-blur-xl transition hover:border-emerald-300/30 hover:bg-emerald-400/10 hover:text-white active:scale-95"
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
        >
          <Bell size={18} strokeWidth={2.25} />
          {notificationCount > 0 ? (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
          ) : null}
        </button>
      </div>
    </header>
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
    <div className="sticky top-0 z-20 -mx-1 px-1 py-2">
      <div
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-[1.25rem] border border-white/[0.09] bg-slate-950/80 p-1.5 shadow-[0_14px_40px_-22px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
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
              className={`shrink-0 rounded-2xl px-3.5 py-2.5 text-xs font-bold tracking-tight transition-all duration-300 sm:px-5 sm:text-[13px] ${
                on
                  ? "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.7)]"
                  : "text-emerald-100/55 hover:bg-white/[0.06] hover:text-emerald-50"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NepseHeroCard({
  summary,
  range,
  onRangeChange,
}: {
  summary: NepsePortfolioSummary;
  range: NepseChartRange;
  onRangeChange: (r: NepseChartRange) => void;
}) {
  const overallPos = summary.overallPnlNpr >= 0;
  const series = buildNepsePerformanceSeries(summary.portfolioValueNpr, range);

  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-emerald-300/20 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.26),transparent_58%),radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.14),transparent_55%),linear-gradient(155deg,#03251d_0%,#071b17_46%,#020617_100%)] p-5 shadow-[0_28px_70px_-28px_rgba(0,0,0,0.9)] sm:p-7">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/50 to-transparent" />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-8">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/50">
            Portfolio value
          </p>
          <p className="mt-2 truncate text-[2.1rem] font-black leading-none tracking-tight text-white sm:text-[2.75rem]">
            {formatMoney(summary.portfolioValueNpr, "NPR")}
          </p>

          <dl className="mt-6 space-y-3.5">
            <HeroLine
              label="Overall profit/loss"
              value={formatMoney(summary.overallPnlNpr, "NPR")}
              positive={overallPos}
            />
            <HeroLine
              label="Today's gain/loss"
              value={formatMoney(summary.todayGainNpr, "NPR")}
              hint={formatSignedPct(summary.todayGainPct)}
              positive={summary.todayGainNpr >= 0}
            />
            <HeroLine
              label="Portfolio return"
              value={formatSignedPct(summary.portfolioReturnPct, 1)}
              positive={(summary.portfolioReturnPct ?? 0) >= 0}
            />
          </dl>
        </div>

        <div className="min-w-0">
          <div className="h-36 w-full sm:h-44">
            <NepsePerformanceChart data={series} positive={overallPos} />
          </div>
          <div
            className="mt-3 flex gap-1 rounded-2xl border border-white/[0.08] bg-black/30 p-1"
            role="group"
            aria-label="Chart range"
          >
            {NEPSE_CHART_RANGES.map((r) => {
              const on = r === range;
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onRangeChange(r)}
                  className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-black tracking-wide transition-all duration-300 ${
                    on
                      ? "bg-emerald-400/95 text-slate-950 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.8)]"
                      : "text-emerald-100/50 hover:bg-white/[0.06] hover:text-emerald-50"
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroLine({
  label,
  value,
  hint,
  positive,
}: {
  label: string;
  value: string;
  hint?: string;
  positive: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0">
      <dt className="text-[11px] font-bold text-emerald-100/45 sm:text-xs">{label}</dt>
      <dd className="flex items-baseline gap-2 text-right">
        <span
          className={`text-sm font-black tabular-nums sm:text-base ${positive ? "text-emerald-300" : "text-rose-300"}`}
        >
          {value}
        </span>
        {hint ? (
          <span className="text-[11px] font-bold tabular-nums text-emerald-100/40">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

export function NepsePerformanceChart({
  data,
  positive,
  compact,
}: {
  data: { i: number; v: number }[];
  positive: boolean;
  compact?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const stroke = positive ? "#34d399" : "#fb7185";

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`nepse-perf-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.42} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={["dataMin", "dataMax"]} hide />
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={compact ? 2 : 2.75}
          fill={`url(#nepse-perf-${uid})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function NepseQuickStats({ summary }: { summary: NepsePortfolioSummary }) {
  const stats = [
    { label: "Investment", value: formatMoney(summary.costNpr, "NPR"), tone: "neutral" as const },
    {
      label: "Current Value",
      value: formatMoney(summary.portfolioValueNpr, "NPR"),
      tone: "neutral" as const,
    },
    {
      label: "Today's P/L",
      value: formatMoney(summary.todayGainNpr, "NPR"),
      tone: summary.todayGainNpr >= 0 ? ("pos" as const) : ("neg" as const),
    },
    { label: "Dividend", value: formatMoney(summary.dividendNpr, "NPR"), tone: "neutral" as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className={`${NEPSE_GLASS} px-4 py-3.5`}>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/40">
            {s.label}
          </p>
          <p
            className={`mt-1.5 truncate text-[15px] font-black tabular-nums sm:text-lg ${
              s.tone === "pos" ? "text-emerald-300" : s.tone === "neg" ? "text-rose-300" : "text-white"
            }`}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function NepseHoldingsFilterBar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  inputRef,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  filter: NepseHoldingFilter;
  onFilterChange: (f: NepseHoldingFilter) => void;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          size={16}
          strokeWidth={2.25}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-emerald-200/40"
          aria-hidden
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by symbol"
          aria-label="Search holdings by symbol"
          className="min-h-12 w-full rounded-2xl border border-white/[0.09] bg-white/[0.045] pl-11 pr-10 text-sm font-bold text-white placeholder:text-emerald-100/30 backdrop-blur-xl transition focus:border-emerald-300/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-emerald-100/50 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5" role="group" aria-label="Holding filters">
        {NEPSE_HOLDING_FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => onFilterChange(f.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black tracking-tight transition-all duration-300 sm:text-xs ${
                on
                  ? "border-emerald-300/50 bg-emerald-400/20 text-emerald-50 shadow-[0_6px_20px_-10px_rgba(16,185,129,0.8)]"
                  : "border-white/[0.09] bg-white/[0.035] text-emerald-100/50 hover:border-emerald-300/25 hover:text-emerald-50"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
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
    return <NepseEmptyState text={emptyLabel} />;
  }

  return (
    <ul className={`${NEPSE_GLASS} divide-y divide-white/[0.06] overflow-hidden`}>
      {holdings.map((h) => {
        const dayPos = (h.dayChangePct ?? 0) >= 0;
        const pnlPos = h.pnlNpr >= 0;
        return (
          <li key={h.row.id}>
            <button
              type="button"
              onClick={() => onOpen(h.row.id)}
              className="group flex w-full items-center gap-3.5 px-4 py-4 text-left transition-colors duration-300 hover:bg-emerald-400/[0.07] active:bg-emerald-400/[0.11] sm:px-5"
            >
              <NepseSymbolLogo symbol={h.symbol} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black tracking-tight text-white sm:text-[15px]">
                  {h.symbol}
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-100/40 sm:text-xs">
                  {h.companyName}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-black tabular-nums text-white">
                  {formatMoney(h.liveNpr, "NPR")}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-2">
                  <span
                    className={`text-[11px] font-black tabular-nums ${dayPos ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {formatSignedPct(h.dayChangePct)}
                  </span>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${pnlPos ? "text-emerald-300/75" : "text-rose-300/75"}`}
                  >
                    {formatMoney(h.pnlNpr, "NPR")}
                  </span>
                </div>
              </div>

              <ChevronRight
                size={18}
                strokeWidth={2.25}
                className="shrink-0 text-emerald-100/25 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-emerald-200/60"
                aria-hidden
              />
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
      className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-40 inline-flex min-h-14 items-center gap-2 rounded-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-500 px-5 text-sm font-black tracking-tight text-slate-950 shadow-[0_18px_44px_-12px_rgba(16,185,129,0.75),0_0_0_1px_rgba(255,255,255,0.18)_inset] ring-1 ring-emerald-200/40 transition-all duration-300 hover:brightness-[1.06] active:scale-[0.97] sm:bottom-8 sm:right-8"
      aria-label="Add stock"
    >
      <Plus className="h-5 w-5" strokeWidth={2.75} aria-hidden />
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] border border-emerald-300/20 bg-slate-950/95 p-4 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:rounded-[1.75rem] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/[0.09] bg-white/[0.05] text-emerald-100/70 transition hover:bg-white/[0.1] hover:text-white"
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
  const color = tone === "pos" ? "text-emerald-300" : tone === "neg" ? "text-rose-300" : "text-white";
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/40">{label}</p>
      <p className={`mt-1.5 truncate text-sm font-black tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export function NepseSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100/40">
      {children}
    </h2>
  );
}

export function NepseEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-14 text-center text-sm font-bold text-emerald-100/40">
      {text}
    </div>
  );
}
