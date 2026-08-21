"use client";

import { Bell, ChevronRight, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import { formatMoney } from "@/lib/expense-utils";
import {
  buildNepsePerformanceSeriesFromCurve,
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

/** Premium glass — 20px radius, soft border, restrained shadow. */
export const NEPSE_GLASS =
  "rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] shadow-[0_12px_40px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl";

const TONE_POS = "text-emerald-400";
const TONE_NEG = "text-rose-400/90";
const TONE_LABEL = "text-zinc-400";
const TONE_VALUE = "text-white";

const LOGO_PALETTE = [
  "from-emerald-500/85 to-teal-700/85",
  "from-cyan-500/80 to-slate-700/85",
  "from-amber-500/80 to-stone-700/85",
  "from-violet-500/75 to-slate-700/85",
  "from-rose-500/75 to-stone-700/85",
  "from-lime-500/75 to-emerald-800/85",
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function NepseSymbolLogo({ symbol, size = "md" }: { symbol: string; size?: "md" | "lg" }) {
  const idx = Math.abs([...symbol].reduce((a, c) => a + c.charCodeAt(0), 0)) % LOGO_PALETTE.length;
  const box = size === "lg" ? "h-12 w-12 text-xs rounded-[1rem]" : "h-10 w-10 text-[10px] rounded-[0.85rem]";
  return (
    <div
      className={`grid ${box} shrink-0 place-items-center bg-gradient-to-br ${LOGO_PALETTE[idx]} font-bold tracking-wide text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-white/10`}
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
    <header className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[1.45rem] font-semibold leading-tight tracking-tight text-white sm:text-[1.75rem]">
          NEPSE Portfolio
        </h1>
        <p className={`mt-1 truncate text-xs font-medium sm:text-[13px] ${TONE_LABEL}`}>
          Track your holdings ·{" "}
          <Link href="/market" className="font-semibold text-emerald-400 underline-offset-2 hover:underline">
            Open Premium NEPSE Hub
          </Link>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-center">
        <Link
          href="/market"
          className="hidden h-10 items-center rounded-[1rem] border border-emerald-400/25 bg-emerald-400/10 px-3 text-[11px] font-black uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-400/15 sm:inline-flex"
        >
          NEPSE Hub
        </Link>
        <button
          type="button"
          onClick={onSearch}
          className="grid h-10 w-10 place-items-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] text-zinc-300 backdrop-blur-xl transition duration-300 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-[0.96]"
          aria-label="Search holdings"
        >
          <Search size={17} strokeWidth={2} />
        </button>
        <button
          type="button"
          className="relative grid h-10 w-10 place-items-center rounded-[1rem] border border-white/[0.08] bg-white/[0.04] text-zinc-300 backdrop-blur-xl transition duration-300 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-[0.96]"
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount})` : ""}`}
        >
          <Bell size={17} strokeWidth={2} />
          {notificationCount > 0 ? (
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
    <div className="sticky top-0 z-20 -mx-1 px-1 py-1.5">
      <div
        className="no-scrollbar flex gap-1 overflow-x-auto rounded-[1.15rem] border border-white/[0.08] bg-slate-950/75 p-1 shadow-[0_10px_32px_-22px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
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
              className={`shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold tracking-tight transition-all duration-300 ease-out sm:px-4 sm:text-xs ${
                on
                  ? "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 shadow-[0_6px_18px_-8px_rgba(16,185,129,0.55)]"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
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
  equityCurve,
}: {
  summary: NepsePortfolioSummary;
  range: NepseChartRange;
  onRangeChange: (r: NepseChartRange) => void;
  /** Real reconstructed equity curve — never synthetic. */
  equityCurve?: { date: string; portfolioValueNpr: number }[];
}) {
  const reduced = usePrefersReducedMotion();
  const overallPos = summary.overallPnlNpr >= 0;
  const series = buildNepsePerformanceSeriesFromCurve(equityCurve ?? [], range);
  const animatedValue = useCountUpNumber(summary.portfolioValueNpr, {
    durationMs: 900,
    skipAnimation: reduced,
  });

  return (
    <section className="animate-fade-up relative overflow-hidden rounded-[1.25rem] border border-white/[0.09] bg-[radial-gradient(ellipse_at_12%_0%,rgba(16,185,129,0.16),transparent_52%),linear-gradient(160deg,#041c17_0%,#071412_52%,#020617_100%)] p-4 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/35 to-transparent" />

      <div className="relative space-y-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${TONE_LABEL}`}>
            Portfolio value
          </p>
          <p
            className={`mt-1 truncate text-[1.7rem] font-semibold leading-none tracking-tight sm:text-[1.95rem] ${TONE_VALUE}`}
          >
            {formatMoney(animatedValue, "NPR")}
          </p>
        </div>

        {/* Compact horizontal metrics — one row, no stacked blocks */}
        <dl className="grid grid-cols-3 gap-2 border-y border-white/[0.06] py-2.5">
          <HeroMetric
            label="Today"
            value={formatMoney(summary.todayGainNpr, "NPR")}
            hint={formatSignedPct(summary.todayGainPct)}
            positive={summary.todayGainNpr >= 0}
          />
          <HeroMetric
            label="Overall P/L"
            value={formatMoney(summary.overallPnlNpr, "NPR")}
            positive={overallPos}
          />
          <HeroMetric
            label="Return"
            value={formatSignedPct(summary.portfolioReturnPct, 1)}
            positive={(summary.portfolioReturnPct ?? 0) >= 0}
          />
        </dl>

        <div className="min-w-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className={`text-[10px] font-medium ${TONE_LABEL}`}>Performance</p>
            <div
              className="flex shrink-0 gap-0.5 rounded-full border border-white/[0.07] bg-black/30 p-0.5"
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
                    className={`rounded-full px-2 py-1 text-[9px] font-semibold tracking-wide transition-all duration-300 sm:text-[10px] ${
                      on
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950 shadow-[0_3px_10px_-4px_rgba(16,185,129,0.55)]"
                        : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          {series.length >= 2 ? (
            <div className="h-[7.5rem] w-full transition-opacity duration-500 sm:h-[8.75rem]">
              <NepsePerformanceChart data={series} positive={overallPos} compact />
            </div>
          ) : (
            <div className="flex h-[7.5rem] items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-black/20 sm:h-[8.75rem]">
              <p className="px-4 text-center text-[11px] font-semibold text-zinc-500">
                Data unavailable — equity curve needs EOD history for your holdings
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function HeroMetric({
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
    <div className="min-w-0 text-left">
      <dt className={`truncate text-[9px] font-medium uppercase tracking-[0.08em] sm:text-[10px] ${TONE_LABEL}`}>
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0">
        <p
          className={`truncate text-[11px] font-semibold tabular-nums leading-tight sm:text-[13px] ${
            positive ? TONE_POS : TONE_NEG
          }`}
        >
          {value}
        </p>
        {hint ? (
          <p className={`mt-0.5 truncate text-[9px] font-medium tabular-nums ${TONE_LABEL}`}>{hint}</p>
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
  const stroke = positive ? "#34d399" : "#f87171";
  const glowId = `nepse-glow-${uid}`;

  return (
    <div className="relative h-full w-full animate-fade-in">
      <div
        className="pointer-events-none absolute inset-x-[8%] bottom-0 top-[18%] rounded-full opacity-40 blur-2xl"
        style={{ background: positive ? "rgba(52,211,153,0.22)" : "rgba(248,113,113,0.18)" }}
        aria-hidden
      />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
          <defs>
            <linearGradient id={`nepse-perf-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.32} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke}
            strokeWidth={compact ? 1.75 : 2.25}
            fill={`url(#nepse-perf-${uid})`}
            filter={`url(#${glowId})`}
            isAnimationActive={!compact}
            animationDuration={650}
            animationEasing="ease-out"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
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
    <div className="grid grid-cols-2 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`${NEPSE_GLASS} flex min-h-[4.75rem] flex-col justify-between p-4 transition duration-300 hover:border-white/[0.12] hover:bg-white/[0.055]`}
        >
          <p className={`text-[10px] font-medium uppercase tracking-[0.12em] ${TONE_LABEL}`}>{s.label}</p>
          <p
            className={`mt-2 truncate text-[15px] font-semibold tabular-nums sm:text-base ${
              s.tone === "pos" ? TONE_POS : s.tone === "neg" ? TONE_NEG : TONE_VALUE
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
          size={15}
          strokeWidth={2}
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${TONE_LABEL}`}
          aria-hidden
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by symbol"
          aria-label="Search holdings by symbol"
          className="min-h-11 w-full rounded-[1.15rem] border border-white/[0.08] bg-white/[0.04] pl-10 pr-10 text-sm font-medium text-white placeholder:text-zinc-500 backdrop-blur-xl transition focus:border-emerald-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/15"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
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
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-tight transition-all duration-300 ${
                on
                  ? "border-emerald-400/40 bg-gradient-to-b from-emerald-400/20 to-emerald-500/10 text-emerald-200"
                  : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:border-white/[0.14] hover:text-zinc-200"
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
  emptyActionLabel,
  onEmptyAction,
}: {
  holdings: NepseHoldingRow[];
  onOpen: (id: string) => void;
  emptyLabel?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
}) {
  if (holdings.length === 0) {
    return (
      <NepseEmptyState text={emptyLabel} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
    );
  }

  return (
    <ul className={`${NEPSE_GLASS} divide-y divide-white/[0.05] overflow-hidden`}>
      {holdings.map((h) => {
        const dayPos = (h.dayChangePct ?? 0) >= 0;
        const pnlPos = h.pnlNpr >= 0;
        return (
          <li key={h.row.id}>
            <button
              type="button"
              onClick={() => onOpen(h.row.id)}
              className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition duration-300 hover:bg-white/[0.035] active:bg-white/[0.05]"
            >
              <NepseSymbolLogo symbol={h.symbol} />

              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-semibold tracking-tight ${TONE_VALUE}`}>{h.symbol}</p>
                <p className={`mt-0.5 truncate text-[11px] font-medium ${TONE_LABEL}`}>{h.companyName}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold tabular-nums ${TONE_VALUE}`}>
                  {formatMoney(h.liveNpr, "NPR")}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-2">
                  <span className={`text-[11px] font-semibold tabular-nums ${dayPos ? TONE_POS : TONE_NEG}`}>
                    {formatSignedPct(h.dayChangePct)}
                  </span>
                  <span className={`text-[11px] font-medium tabular-nums ${pnlPos ? TONE_POS : TONE_NEG}`}>
                    {formatMoney(h.pnlNpr, "NPR")}
                  </span>
                </div>
              </div>

              <ChevronRight
                size={16}
                strokeWidth={2}
                className="shrink-0 text-zinc-600 transition duration-300 group-hover:translate-x-0.5 group-hover:text-zinc-400"
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
      className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] right-[max(1rem,env(safe-area-inset-right,0px))] z-[55] inline-flex min-h-[3.25rem] items-center gap-2 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-500 px-5 text-sm font-semibold tracking-tight text-slate-950 shadow-[0_14px_36px_-14px_rgba(16,185,129,0.65)] ring-1 ring-white/15 transition duration-300 hover:brightness-[1.04] active:scale-[0.97] lg:bottom-8 lg:right-8"
      aria-label="Add stock"
    >
      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
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
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="animate-fade-up relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] border border-white/[0.1] bg-slate-950/96 p-4 shadow-[0_-16px_48px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:rounded-[1.5rem] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-[0.9rem] border border-white/[0.08] bg-white/[0.04] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Close sheet"
          >
            <X size={16} />
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
  const color = tone === "pos" ? TONE_POS : tone === "neg" ? TONE_NEG : TONE_VALUE;
  return (
    <div className="rounded-[1rem] border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl transition duration-300 hover:border-white/[0.11]">
      <p className={`text-[10px] font-medium uppercase tracking-[0.1em] ${TONE_LABEL}`}>{label}</p>
      <p className={`mt-1.5 truncate text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export function NepseSectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={`mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] ${TONE_LABEL}`}>{children}</h2>;
}

export function NepseEmptyState({
  text,
  actionLabel,
  onAction,
}: {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-white/[0.1] bg-white/[0.02] px-5 py-12 text-center">
      <p className="text-sm font-medium text-zinc-500">{text}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 text-sm font-black text-slate-950 shadow-[0_14px_32px_-14px_rgba(16,185,129,0.55)] transition active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
