"use client";

import {
  Activity,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NepseHeroIntradayChart, NepseHeroSparkline } from "@/components/market/NepseHeroIntradayChart";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import { useNepseIndexIntraday } from "@/hooks/useNepseIndexIntraday";
import type { NepseBreadthCategory } from "@/lib/market/nepse-breadth";
import {
  countCircuitStocks,
  deriveMarketSentiment,
  formatCompactNpr,
  getKathmanduMarketPanelStatus,
} from "@/lib/market/nepse-hub";
import { formatBsDateHeroLine, formatMarketLastUpdatedParts } from "@/lib/smart-nepal-info";
import type { NepseIndexTick, NepseSecurityTick, NepseTerminalSnapshot } from "@/types/market";

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

function useLiveMarketPanelClock(tickMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), tickMs);
    return () => window.clearInterval(timer);
  }, [tickMs]);
  return now;
}

function resolveIndexPointChange(index: NepseIndexTick | undefined, displayValue: number | null): number | null {
  if (displayValue != null && index?.previousClose != null && Number.isFinite(index.previousClose)) {
    return displayValue - index.previousClose;
  }
  if (index?.changeNpr != null && Number.isFinite(index.changeNpr)) return index.changeNpr;
  if (index?.value != null && index.previousClose != null && Number.isFinite(index.previousClose)) {
    return index.value - index.previousClose;
  }
  return null;
}

function resolveIndexChangePct(
  index: NepseIndexTick | undefined,
  pointChange: number | null,
): number | null {
  if (
    pointChange != null &&
    index?.previousClose != null &&
    Number.isFinite(index.previousClose) &&
    index.previousClose > 0
  ) {
    return (pointChange / index.previousClose) * 100;
  }
  if (index?.changePct != null && Number.isFinite(index.changePct)) return index.changePct;
  return null;
}

function formatIndexNumber(value: number): string {
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function HeroMarketStatusCard() {
  const now = useLiveMarketPanelClock(60_000);
  const panel = getKathmanduMarketPanelStatus(now);

  return (
    <div
      className={`w-full rounded-2xl border px-3 py-2.5 shadow-[0_12px_36px_-20px_rgba(0,0,0,0.65)] backdrop-blur-md transition duration-500 sm:px-3.5 ${
        panel.open
          ? "border-emerald-400/40 bg-emerald-400/[0.12] shadow-[0_0_28px_-12px_rgba(52,211,153,0.55)]"
          : "border-rose-400/30 bg-rose-400/[0.1]"
      }`}
      aria-live="polite"
    >
      <p
        className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
          panel.open ? "text-emerald-200" : "text-rose-200"
        }`}
      >
        <span className="text-[11px] leading-none" aria-hidden>
          {panel.open ? "🟢" : "🔴"}
        </span>
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            panel.open ? "animate-pulse bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" : "bg-rose-300"
          }`}
          aria-hidden
        />
        <span className="min-w-0 truncate">{panel.headline}</span>
      </p>
      <div className="mt-2 grid gap-1 border-t border-white/10 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${panel.open ? "text-emerald-100/55" : "text-rose-100/55"}`}>
            {panel.sessionLabel}
          </span>
          <span className="text-[12px] font-extrabold tabular-nums text-white">{panel.sessionTime}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-[9px] font-bold uppercase tracking-wider ${panel.open ? "text-emerald-100/55" : "text-rose-100/55"}`}>
            {panel.countdownLabel}
          </span>
          <span
            className={`text-[13px] font-black tabular-nums tracking-tight ${
              panel.open ? "text-emerald-200" : "text-rose-100"
            }`}
          >
            {panel.countdown}
          </span>
        </div>
      </div>
    </div>
  );
}

function DualDelta({
  pointChange,
  changePct,
}: {
  pointChange: number | null;
  changePct: number | null;
}) {
  if (pointChange == null && changePct == null) {
    return <p className="text-sm font-semibold text-emerald-100/45">Change unavailable</p>;
  }
  const positive = (pointChange ?? changePct ?? 0) >= 0;
  const tone = positive ? "text-emerald-300" : "text-rose-300";
  const arrow = positive ? "▲" : "▼";
  return (
    <div className={`mt-2 flex flex-col gap-0.5 text-sm font-extrabold tabular-nums sm:text-[15px] ${tone}`}>
      {pointChange != null ? (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span aria-hidden>{arrow}</span>
          <span className="truncate">
            {positive && pointChange > 0 ? "+" : ""}
            {pointChange.toFixed(2)} pts
          </span>
        </span>
      ) : null}
      {changePct != null ? (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span aria-hidden>{arrow}</span>
          <span className="truncate">
            {positive && changePct > 0 ? "+" : ""}
            {changePct.toFixed(2)}%
          </span>
        </span>
      ) : null}
    </div>
  );
}

const BREADTH_META = [
  {
    label: "Advanced",
    slug: "advanced" as NepseBreadthCategory,
    tone: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    dot: "🟢",
    Icon: TrendingUp,
  },
  {
    label: "Declined",
    slug: "declined" as NepseBreadthCategory,
    tone: "border-rose-400/25 bg-rose-400/10 text-rose-200",
    dot: "🔴",
    Icon: TrendingDown,
  },
  {
    label: "Unchanged",
    slug: "unchanged" as NepseBreadthCategory,
    tone: "border-white/15 bg-white/[0.06] text-zinc-200",
    dot: "⚪",
    Icon: Activity,
  },
  {
    label: "Upper Circuit",
    slug: "upper-circuit" as NepseBreadthCategory,
    tone: "border-violet-400/25 bg-violet-400/10 text-violet-200",
    dot: "🟣",
    Icon: Zap,
  },
  {
    label: "Lower Circuit",
    slug: "lower-circuit" as NepseBreadthCategory,
    tone: "border-amber-400/25 bg-amber-400/10 text-amber-200",
    dot: "🟡",
    Icon: ShieldCheck,
  },
] as const;

export function NepseInstitutionalHero({
  index,
  term,
  bySymbol,
  turnover,
  volume,
  trades,
  fetchedAt,
  onRefresh,
  refreshing,
}: {
  index: NepseIndexTick | undefined;
  term?: NepseTerminalSnapshot;
  bySymbol: Record<string, NepseSecurityTick>;
  turnover: number;
  volume: number;
  trades: number;
  fetchedAt?: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const intraday = useNepseIndexIntraday();
  const circuits = useMemo(() => countCircuitStocks(bySymbol), [bySymbol]);
  const sentiment = useMemo(() => deriveMarketSentiment(term), [term]);

  const displayValue = intraday.data?.last ?? index?.value ?? null;
  const pointChange = resolveIndexPointChange(
    index,
    displayValue != null && Number.isFinite(displayValue) ? displayValue : null,
  );
  const changePct = resolveIndexChangePct(index, pointChange);
  const positive = (pointChange ?? changePct ?? 0) >= 0;

  const animatedIndex = useCountUpNumber(displayValue ?? 0, {
    durationMs: 900,
    skipAnimation: reduced || displayValue == null,
  });

  const open =
    intraday.data?.open ??
    index?.open ??
    null;
  const high = index?.high ?? intraday.data?.high ?? null;
  const low = index?.low ?? intraday.data?.low ?? null;
  const previousClose = index?.previousClose ?? null;

  const nepaliDate = formatBsDateHeroLine(fetchedAt ? new Date(fetchedAt) : undefined);
  const lastUpdated = formatMarketLastUpdatedParts(fetchedAt ?? intraday.data?.fetchedAt);

  const history = intraday.data?.summaryHistory ?? [];
  const turnoverSeries = history.map((row) => row.totalTurnoverNpr);
  const volumeSeries = history.map((row) => row.totalVolume);
  const tradesSeries = history.map((row) => row.totalTransactions);
  const latestSummary = history.length ? history[history.length - 1]! : null;
  const displayTurnover = latestSummary?.totalTurnoverNpr || turnover;
  const displayVolume = latestSummary?.totalVolume || volume;
  const displayTrades = latestSummary?.totalTransactions || trades;

  const breadthCounts: Record<NepseBreadthCategory, number> = {
    "all-listed": term?.totalsListed ?? 0,
    advanced: term?.breadth.advancing ?? 0,
    declined: term?.breadth.declining ?? 0,
    unchanged: term?.breadth.unchanged ?? 0,
    "upper-circuit": circuits.upper,
    "lower-circuit": circuits.lower,
  };

  const sentimentEmoji = sentiment.label === "Bullish" ? "🐂" : sentiment.label === "Bearish" ? "🐻" : "⚖️";
  const sentimentTone =
    sentiment.label === "Bullish"
      ? "text-emerald-300"
      : sentiment.label === "Bearish"
        ? "text-rose-300"
        : "text-amber-200";

  const sessionStats = [
    ["Open", open != null ? formatIndexNumber(open) : "—"],
    ["High", high != null ? formatIndexNumber(high) : "—"],
    ["Low", low != null ? formatIndexNumber(low) : "—"],
    ["Previous Close", previousClose != null ? formatIndexNumber(previousClose) : "—"],
  ] as const;

  const rightStats = [
    {
      label: "Today's High",
      value: high != null ? formatIndexNumber(high) : "—",
      spark: null as number[] | null,
      positive: true,
    },
    {
      label: "Today's Low",
      value: low != null ? formatIndexNumber(low) : "—",
      spark: null,
      positive: false,
    },
    {
      label: "Previous Close",
      value: previousClose != null ? formatIndexNumber(previousClose) : "—",
      spark: null,
      positive: true,
    },
    {
      label: "Turnover",
      value: displayTurnover ? formatCompactNpr(displayTurnover) : "—",
      spark: turnoverSeries,
      positive: turnoverSeries.length >= 2 ? turnoverSeries[turnoverSeries.length - 1]! >= turnoverSeries[0]! : true,
    },
    {
      label: "Volume",
      value: displayVolume ? displayVolume.toLocaleString("en-IN") : "—",
      spark: volumeSeries,
      positive: volumeSeries.length >= 2 ? volumeSeries[volumeSeries.length - 1]! >= volumeSeries[0]! : true,
    },
    {
      label: "Transactions",
      value: displayTrades ? displayTrades.toLocaleString("en-IN") : "—",
      spark: tradesSeries,
      positive: tradesSeries.length >= 2 ? tradesSeries[tradesSeries.length - 1]! >= tradesSeries[0]! : true,
    },
  ] as const;

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_8%_0%,rgba(52,211,153,0.22),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(145deg,#063126_0%,#071b17_52%,#040b0a_100%)] p-3.5 text-white shadow-[0_32px_90px_-40px_rgba(4,120,87,0.65)] sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full border border-white/[0.04]" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-emerald-400/[0.05] blur-3xl" />

      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)_minmax(15rem,0.85fr)] lg:items-stretch lg:gap-5">
        {/* Left: index + deltas + session OHLC + date/status */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/55">
                {index?.name ?? "NEPSE Index"}
              </p>
              <p className="mt-2 text-[2.15rem] font-black leading-none tracking-[-0.045em] tabular-nums sm:text-[3.1rem]">
                {displayValue == null
                  ? "—"
                  : animatedIndex.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </p>
              <DualDelta pointChange={pointChange} changePct={changePct} />
            </div>
            <button
              type="button"
              onClick={() => {
                onRefresh();
                intraday.reload();
              }}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-100/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Refresh market data"
            >
              <RefreshCw size={14} className={refreshing || intraday.loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {sessionStats.map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2 transition hover:border-emerald-400/20"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/45">{label}</p>
                <p className="mt-1 truncate text-[11px] font-extrabold tabular-nums text-white sm:text-xs">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end lg:grid-cols-1 xl:grid-cols-[1fr_auto] xl:items-end">
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold leading-snug tracking-tight text-emerald-50 sm:text-[15px]" title={nepaliDate}>
                {nepaliDate}
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-100/40">Last Updated</p>
              <p className="text-[11px] font-semibold tabular-nums text-emerald-100/65 sm:text-xs">
                {lastUpdated.bsDate}
              </p>
              <p className="text-[11px] font-semibold tabular-nums text-emerald-100/65 sm:text-xs">
                {lastUpdated.time12}
              </p>
            </div>
            <div className="w-full sm:max-w-[13.5rem] lg:max-w-none xl:max-w-[13.5rem]">
              <HeroMarketStatusCard />
            </div>
          </div>
        </div>

        {/* Center: real intraday chart */}
        <div className="relative flex min-w-0 flex-col justify-between rounded-2xl border border-white/[0.07] bg-black/20 p-2.5 sm:p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-100/45">Intraday · Official NEPSE</p>
            {intraday.data?.points.length ? (
              <span className="text-[9px] font-semibold tabular-nums text-emerald-100/35">
                {intraday.data.points.length.toLocaleString("en-IN")} prints
              </span>
            ) : null}
          </div>
          <NepseHeroIntradayChart
            points={intraday.data?.points ?? []}
            positive={positive}
            previousClose={previousClose}
            className="flex-1"
          />
          {intraday.error && !(intraday.data?.points.length) ? (
            <p className="mt-1 text-[10px] font-medium text-amber-200/80">Live chart unavailable: {intraday.error}</p>
          ) : null}
        </div>

        {/* Right: dense stats + sparklines */}
        <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-1">
          {rightStats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-2 transition hover:border-emerald-400/25 hover:bg-white/[0.05]"
            >
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/45">{stat.label}</p>
                <p className="mt-0.5 truncate text-[12px] font-extrabold tabular-nums text-white sm:text-[13px]">
                  {stat.value}
                </p>
              </div>
              {stat.spark ? <NepseHeroSparkline values={stat.spark} positive={stat.positive} /> : null}
            </div>
          ))}
        </div>
      </div>

      {/* Breadth + sentiment */}
      <div className="relative mt-3 flex flex-col gap-2 border-t border-white/[0.07] pt-3 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 flex-wrap gap-1.5" aria-label="Market breadth summary">
          {BREADTH_META.map((item) => {
            const count = breadthCounts[item.slug];
            return (
              <Link
                key={item.slug}
                href={`/market/breadth/${item.slug}`}
                className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98] ${item.tone}`}
                aria-label={`${item.label} — ${count.toLocaleString("en-IN")} companies`}
              >
                <span aria-hidden>{item.dot}</span>
                <span className="truncate">{item.label}</span>
                <span className="tabular-nums opacity-90">{count.toLocaleString("en-IN")}</span>
              </Link>
            );
          })}
        </div>

        <div
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 sm:self-auto"
          title={sentiment.summary}
        >
          <span className="text-base leading-none" aria-hidden>
            {sentimentEmoji}
          </span>
          <span className={`text-[11px] font-black uppercase tracking-wide ${sentimentTone}`}>
            {sentiment.label}
          </span>
          <span className="text-[13px] font-black tabular-nums text-white">{sentiment.score}%</span>
        </div>
      </div>
    </section>
  );
}
