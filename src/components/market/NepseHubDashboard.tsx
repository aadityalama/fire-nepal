"use client";

import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bell,
  Bot,
  Building2,
  ChevronRight,
  Flame,
  Grid3X3,
  Landmark,
  Layers3,
  ListFilter,
  Newspaper,
  PieChart,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TicketCheck,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { buildNepsePortfolioSummary } from "@/components/portfolio/nepse-portfolio/nepse-portfolio-metrics";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import { useNepseAlerts } from "@/hooks/useNepseAlerts";
import { useNepseNews, type NepseNewsItem } from "@/hooks/useNepseNews";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import type { NepseBreadthCategory } from "@/lib/market/nepse-breadth";
import {
  countCircuitStocks,
  deriveMarketSentiment,
  formatCompactNpr,
  getKathmanduMarketStatus,
  NEPSE_NEWS_SOURCES,
  NEPSE_SERVICE_ITEMS,
} from "@/lib/market/nepse-hub";
import { useRealtimeMarket } from "@/providers/realtime-provider";
import type { NepseSecurityTick } from "@/types/market";
import { NepseMarketChart } from "./NepseMarketChart";

const ICONS: Record<string, ComponentType<{ className?: string; "aria-hidden"?: boolean }>> = {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bot,
  Grid3X3,
  Landmark,
  Layers3,
  ListFilter,
  PieChart,
  SlidersHorizontal,
  TicketCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
};

const card =
  "rounded-[1.5rem] border border-slate-200/80 bg-white/88 shadow-[0_22px_70px_-44px_rgba(5,46,34,0.32)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-[0_22px_70px_-44px_rgba(0,0,0,0.9)]";
const eyebrow = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500";

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h2 className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-lg">{title}</h2>
        </div>
        <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500 sm:text-xs">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

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

/** Count-up integer that re-animates whenever the live feed pushes a new value. */
function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const display = useCountUpNumber(value, { durationMs: 800, skipAnimation: reduced });
  return <span className={className}>{Math.round(display).toLocaleString("en-IN")}</span>;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Recently";
  const diffMs = Date.now() - Date.parse(iso);
  const minutes = Math.max(1, Math.round(diffMs / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function SentimentBadge({ sentiment }: { sentiment: NepseNewsItem["sentiment"] }) {
  const styles =
    sentiment === "positive"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
      : sentiment === "negative"
        ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300"
        : "bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-400";
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-black capitalize ${styles}`}>{sentiment}</span>;
}

function Delta({ value }: { value?: number | null }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-slate-400 dark:text-zinc-600">—</span>;
  }
  const positive = value >= 0;
  return (
    <span className={`font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function MiniSparkline({ positive = true }: { positive?: boolean }) {
  return (
    <svg viewBox="0 0 120 35" className="h-8 w-24" aria-hidden>
      <path
        d="M2 27 C13 25, 16 12, 28 17 S44 29, 54 19 S71 6, 82 13 S102 10, 118 3"
        fill="none"
        stroke={positive ? "#34d399" : "#fb7185"}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Header({
  searchOpen,
  setSearchOpen,
  query,
  setQuery,
  searchResults,
}: {
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  searchResults: NepseSecurityTick[];
}) {
  const { user } = useProductAuth();
  const initial = (user?.email?.[0] ?? "F").toUpperCase();
  return (
    <header className="relative z-40 flex items-center justify-between gap-3 py-3 sm:py-4">
      <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="FIRE Nepal home">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.9rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-[0_10px_25px_-12px_rgba(16,185,129,0.8)]">
          <Flame size={20} fill="currentColor" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-black tracking-tight text-slate-950 dark:text-white sm:text-base">
            FIRE Nepal
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
            NEPSE Hub
          </span>
        </span>
      </Link>
      <div className="flex items-center gap-1.5">
        <Link
          href="/market/terminal"
          className="hidden h-10 items-center rounded-xl border border-emerald-300/40 bg-emerald-50 px-3 text-[10px] font-black text-emerald-800 transition hover:brightness-105 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200 sm:inline-flex"
        >
          Terminal
        </Link>
        <FireThemeToggle />
        <button
          type="button"
          onClick={() => setSearchOpen(!searchOpen)}
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
          aria-label="Search listed companies"
          aria-expanded={searchOpen}
        >
          {searchOpen ? <X size={17} /> : <Search size={17} />}
        </button>
        <a
          href="#market-alerts"
          className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
          aria-label="Market notifications"
        >
          <Bell size={17} />
          <span className="absolute right-2.5 top-2 h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-white dark:ring-[#06110e]" />
        </a>
        <Link
          href="/dashboard/profile"
          className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-xs font-black text-white shadow-sm"
          aria-label="Open profile"
        >
          {user?.email ? initial : <UserRound size={17} />}
        </Link>
      </div>

      {searchOpen ? (
        <div className="absolute inset-x-0 top-[4.1rem] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#07110f]/95">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search NABIL, HDL, SHIVM…"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
            />
          </div>
          {query.trim() ? (
            <div className="mt-2 grid max-h-72 gap-1 overflow-y-auto">
              {searchResults.length ? (
                searchResults.map((tick) => (
                  <Link
                    key={tick.symbol}
                    href={`/market/company/${encodeURIComponent(tick.symbol)}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2 text-xs transition hover:bg-emerald-500/10"
                    onClick={() => setSearchOpen(false)}
                  >
                    <span>
                      <strong className="text-slate-950 dark:text-white">{tick.symbol}</strong>
                      <span className="ml-2 text-slate-500 dark:text-zinc-500">{tick.companyName}</span>
                    </span>
                    <span className="font-bold tabular-nums text-slate-700 dark:text-zinc-300">
                      रु {tick.ltpNpr.toLocaleString("en-IN")}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="px-3 py-4 text-center text-xs font-medium text-slate-500">No live symbol match.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function heroChangeTone(changePts: number | undefined, changePct: number | undefined): "up" | "down" | "flat" | "unknown" {
  const signal = changePts ?? changePct;
  if (signal == null || !Number.isFinite(signal)) return "unknown";
  if (signal > 0) return "up";
  if (signal < 0) return "down";
  return "flat";
}

function formatSignedPts(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function formatSignedPct(value: number): string {
  const abs = Math.abs(value).toFixed(2);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function Hero({
  index,
  turnover,
  volume,
  trades,
  fetchedAt,
  onRefresh,
  refreshing,
}: {
  index: { value: number; changePts?: number; changePct?: number; name?: string } | undefined;
  turnover: number;
  volume: number;
  trades: number;
  fetchedAt?: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const status = getKathmanduMarketStatus();
  const changePts = index?.changePts;
  const changePct = index?.changePct;
  const tone = heroChangeTone(changePts, changePct);
  const positive = tone !== "down";
  const changeColor =
    tone === "up" ? "text-emerald-300" : tone === "down" ? "text-rose-300" : tone === "flat" ? "text-slate-300" : "text-emerald-100/55";
  const arrow = tone === "up" ? "▲" : tone === "down" ? "▼" : null;
  const reduced = usePrefersReducedMotion();
  const animatedIndex = useCountUpNumber(index?.value ?? 0, { durationMs: 900, skipAnimation: reduced });
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_8%_0%,rgba(52,211,153,0.22),transparent_34%),linear-gradient(145deg,#063126_0%,#071b17_52%,#040b0a_100%)] p-4 text-white shadow-[0_32px_90px_-40px_rgba(4,120,87,0.65)] sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full border border-white/[0.04]" />
      <div className="pointer-events-none absolute -right-9 -top-14 h-40 w-40 rounded-full border border-white/[0.05]" />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-end">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/55">
                  {index?.name ?? "NEPSE Index"}
                </p>
                <Link
                  href="/market/breadth/all-listed"
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition hover:brightness-110 ${
                    status.live
                      ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-300"
                      : "border-amber-300/20 bg-amber-300/10 text-amber-200"
                  }`}
                  aria-label={`NEPSE market ${status.label.toLowerCase()} — view all listed companies`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${status.live ? "animate-pulse bg-emerald-300" : "bg-amber-300"}`} />
                  {status.label}
                </Link>
              </div>
              <p className="mt-2 text-[2.25rem] font-black leading-none tracking-[-0.045em] tabular-nums sm:text-[3.4rem]">
                {animatedIndex.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div className={`mt-2 flex min-w-0 flex-col gap-0.5 font-extrabold leading-snug ${changeColor}`} aria-live="polite">
                {changePts == null && changePct == null ? (
                  <span className="text-sm text-emerald-100/55">Change unavailable</span>
                ) : (
                  <>
                    {changePts != null ? (
                      <p className="flex min-w-0 items-baseline gap-1.5 text-[0.95rem] sm:text-[1.05rem]">
                        {arrow ? <span className="shrink-0 text-[0.85em]" aria-hidden>{arrow}</span> : null}
                        <span className="truncate tabular-nums">
                          {formatSignedPts(changePts)} pts
                        </span>
                      </p>
                    ) : null}
                    {changePct != null ? (
                      <p className="flex min-w-0 items-baseline gap-1.5 text-[0.8rem] opacity-95 sm:text-[0.88rem]">
                        {arrow ? <span className="shrink-0 text-[0.85em]" aria-hidden>{arrow}</span> : null}
                        <span className="truncate tabular-nums">
                          {formatSignedPct(changePct)}% today
                        </span>
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-emerald-100/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Refresh market data"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/[0.07] pt-4">
            {[
              ["Turnover", formatCompactNpr(turnover)],
              ["Volume", volume ? volume.toLocaleString("en-IN") : "—"],
              ["Transactions", trades ? trades.toLocaleString("en-IN") : "—"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/45">{label}</p>
                <p className="mt-1 truncate text-[11px] font-extrabold tabular-nums text-white sm:text-sm">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <MiniSparkline positive={positive} />
          <svg viewBox="0 0 500 140" className="h-28 w-full sm:h-36" aria-label="Indicative NEPSE intraday chart">
            <defs>
              <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity=".28" />
                <stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 112 C42 102 58 74 96 84 S150 112 188 80 S244 26 287 47 S357 69 397 38 S460 30 500 8 L500 140 L0 140 Z" fill="url(#hero-fill)" />
            <path d="M0 112 C42 102 58 74 96 84 S150 112 188 80 S244 26 287 47 S357 69 397 38 S460 30 500 8" fill="none" stroke={positive ? "#34d399" : "#fb7185"} strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="mt-1 text-right text-[9px] font-semibold text-emerald-100/40">
            Last updated {fetchedAt ? new Date(fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

export function NepseHubDashboard() {
  const { snapshot, status, error, reload, overlay } = useRealtimeMarket();
  const { state, krwPerNpr, usdPerNpr } = useWealthPortfolio();
  const { symbols: watchSymbols, toggle: toggleWatch } = useNepseWatchlist();
  const { triggered, removeAlert } = useNepseAlerts(snapshot?.nepseBySymbol);
  const news = useNepseNews();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const term = snapshot?.nepseTerminal;
  const ticks = useMemo(() => Object.values(snapshot?.nepseBySymbol ?? {}), [snapshot?.nepseBySymbol]);
  const circuits = useMemo(() => countCircuitStocks(snapshot?.nepseBySymbol ?? {}), [snapshot?.nepseBySymbol]);
  const sentiment = useMemo(() => deriveMarketSentiment(term), [term]);
  const portfolio = useMemo(
    () =>
      buildNepsePortfolioSummary(
        state.investments,
        state.ledger,
        krwPerNpr,
        usdPerNpr,
        snapshot,
        overlay?.totalsLive.netWorthNpr ?? null,
      ),
    [state.investments, state.ledger, krwPerNpr, usdPerNpr, snapshot, overlay?.totalsLive.netWorthNpr],
  );
  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return ticks
      .filter((tick) => `${tick.symbol} ${tick.companyName ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query, ticks]);
  const watched = useMemo(
    () =>
      watchSymbols
        .map((symbol) => snapshot?.nepseBySymbol[symbol])
        .filter((tick): tick is NepseSecurityTick => Boolean(tick))
        .slice(0, 8),
    [watchSymbols, snapshot?.nepseBySymbol],
  );
  const allocation = useMemo(() => {
    const total = portfolio.portfolioValueNpr;
    if (total <= 0 || portfolio.holdings.length === 0) return [];
    const palette = ["bg-emerald-500", "bg-teal-400", "bg-cyan-400", "bg-amber-400"];
    const top = portfolio.holdings.slice(0, 4).map((holding, index) => ({
      label: holding.symbol,
      pct: (holding.liveNpr / total) * 100,
      color: palette[index],
    }));
    const rest = 100 - top.reduce((sum, slice) => sum + slice.pct, 0);
    if (rest > 0.5) top.push({ label: "Others", pct: rest, color: "bg-slate-400 dark:bg-zinc-600" });
    return top;
  }, [portfolio.holdings, portfolio.portfolioValueNpr]);
  const volume = ticks.reduce((total, tick) => total + (tick.volume ?? 0), 0);
  const trades = ticks.reduce((total, tick) => total + (tick.trades ?? 0), 0);
  const marketCap = ticks.reduce((total, tick) => total + (tick.marketCap ?? 0), 0);
  const breadth = [
    ["Advanced", term?.breadth.advancing ?? 0, "text-emerald-600 dark:text-emerald-400", TrendingUp, "advanced"],
    ["Declined", term?.breadth.declining ?? 0, "text-rose-600 dark:text-rose-400", TrendingDown, "declined"],
    ["Unchanged", term?.breadth.unchanged ?? 0, "text-slate-600 dark:text-zinc-300", Activity, "unchanged"],
    ["Upper Circuit", circuits.upper, "text-violet-600 dark:text-violet-300", Zap, "upper-circuit"],
    ["Lower Circuit", circuits.lower, "text-amber-600 dark:text-amber-300", ShieldCheck, "lower-circuit"],
  ] as const satisfies ReadonlyArray<
    readonly [string, number, string, (typeof TrendingUp), NepseBreadthCategory]
  >;

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-slate-950 dark:bg-[#030a08] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.12),transparent_28rem),radial-gradient(circle_at_94%_16%,rgba(20,184,166,0.08),transparent_24rem)]" />
      <div className="relative mx-auto w-full max-w-[1480px] px-3 pb-28 sm:px-5 lg:px-8">
        <Header
          searchOpen={searchOpen}
          setSearchOpen={setSearchOpen}
          query={query}
          setQuery={setQuery}
          searchResults={searchResults}
        />

        {error ? (
          <div className="mb-3 rounded-xl border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-300/15 dark:bg-amber-300/[0.07] dark:text-amber-200">
            Live feed degraded: {error}. Cached and portfolio data remain available.
          </div>
        ) : null}

        {triggered.length ? (
          <div className="mb-3 space-y-1.5" aria-live="polite">
            {triggered.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/40 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08] dark:text-emerald-200"
              >
                <span>
                  <Link href={`/market/company/${encodeURIComponent(alert.symbol)}`} className="underline decoration-emerald-400/50 underline-offset-2">
                    {alert.symbol}
                  </Link>{" "}
                  is {alert.direction} your रु {alert.targetNpr.toLocaleString("en-IN")} alert — now रु{" "}
                  {alert.ltpNpr.toLocaleString("en-IN")}
                </span>
                <button
                  type="button"
                  onClick={() => removeAlert(alert.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide transition hover:bg-emerald-500/15"
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <Hero
          index={snapshot?.nepseIndex}
          turnover={term?.totalTurnoverNpr ?? 0}
          volume={volume}
          trades={trades}
          fetchedAt={snapshot?.fetchedAt}
          onRefresh={reload}
          refreshing={status === "loading"}
        />

        <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Market breadth">
          {breadth.map(([label, value, tone, Icon, slug]) => (
            <Link
              key={label}
              href={`/market/breadth/${slug}`}
              className={`${card} group min-w-0 p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/30 active:scale-[0.98]`}
              aria-label={`${label} — ${value.toLocaleString("en-IN")} companies`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={eyebrow}>{label}</p>
                <Icon className={`h-3.5 w-3.5 ${tone}`} aria-hidden />
              </div>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className={`text-xl font-black tabular-nums ${tone}`}>
                  <AnimatedCount value={value} />
                </p>
                <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-zinc-700" aria-hidden />
              </div>
            </Link>
          ))}
        </section>

        <div className="mt-4">
          <NepseMarketChart value={snapshot?.nepseIndex?.value ?? 2_650} changePct={snapshot?.nepseIndex?.changePct} />
        </div>

        <section className="mt-7">
          <SectionHeading icon={Grid3X3} title="Quick Market Services" subtitle="Every NEPSE workflow, one tap away" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {NEPSE_SERVICE_ITEMS.map((item) => {
              const Icon = ICONS[item.icon] ?? Activity;
              return (
                <Link
                  key={item.slug}
                  href={`/market/${item.slug}`}
                  className={`${card} group flex min-h-28 flex-col justify-between p-3.5 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40`}
                >
                  <div className="flex items-start justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-500 dark:text-zinc-700" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-950 dark:text-white">{item.label}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-zinc-500">{item.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <div className="mt-7 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <section className={`${card} p-4 sm:p-5`}>
            <SectionHeading
              icon={Sparkles}
              title="AI Market Summary"
              subtitle="Automated breadth and sector signal"
              action={
                <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Live model
                </span>
              }
            />
            <div className="grid gap-5 sm:grid-cols-[11rem_1fr] sm:items-center">
              <div className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-full border-[13px] border-emerald-500/15 bg-[radial-gradient(circle,rgba(16,185,129,0.15),transparent_68%)] shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)]">
                <p className="text-4xl font-black tabular-nums text-slate-950 dark:text-white">{sentiment.score}</p>
                <p className={`mt-1 text-xs font-black uppercase tracking-wider ${sentiment.label === "Bullish" ? "text-emerald-600 dark:text-emerald-400" : sentiment.label === "Bearish" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-300"}`}>
                  {sentiment.label}
                </p>
              </div>
              <div>
                <div className="mb-3 flex gap-1.5">
                  {["Bearish", "Neutral", "Bullish"].map((label) => (
                    <span
                      key={label}
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        sentiment.label === label
                          ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                          : "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-zinc-500"
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-zinc-300">{sentiment.summary}</p>
                {news.items.length ? (
                  <p className="mt-2 text-xs font-bold text-slate-600 dark:text-zinc-400">
                    News mood: {news.items.filter((item) => item.sentiment === "positive").length} positive ·{" "}
                    {news.items.filter((item) => item.sentiment === "negative").length} negative ·{" "}
                    {news.items.filter((item) => item.sentiment === "neutral").length} neutral
                  </p>
                ) : null}
                <p className="mt-3 text-[10px] font-medium text-slate-400 dark:text-zinc-600">
                  Rules-based summary from live breadth and sectors. Not investment advice.
                </p>
              </div>
            </div>
          </section>

          <section id="market-alerts" className={`${card} p-4 sm:p-5`}>
            <SectionHeading icon={Bell} title="Smart Alerts" subtitle="Corporate actions and market notices" />
            <div className="space-y-2">
              {news.corporateActions.length ? (
                news.corporateActions.slice(0, 5).map((item) => (
                  <a
                    key={item.id}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 transition hover:border-emerald-400/35 dark:border-white/[0.06] dark:bg-white/[0.025]"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-slate-900 dark:text-white">{item.headline}</p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
                        {item.sourceName} · {relativeTime(item.publishedAt)}
                      </p>
                    </div>
                  </a>
                ))
              ) : (
                [
                  ["Dividend & Bonus", "Corporate action monitor is ready for the official notice feed.", "emerald"],
                  ["Rights & Book Closure", "Date-aware alerts will appear after source ingestion is enabled.", "violet"],
                  ["IPO & Market Notices", "Official SEBON and NEPSE connectors are prepared.", "amber"],
                ].map(([title, text, tone]) => (
                  <div key={title} className="flex gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tone === "emerald" ? "bg-emerald-400" : tone === "violet" ? "bg-violet-400" : "bg-amber-400"}`} />
                    <div>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white">{title}</p>
                      <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-7">
          <SectionHeading
            icon={Newspaper}
            title="AI Market News"
            subtitle={news.items.length ? "Aggregated, deduplicated and sentiment-scored automatically" : "Licensed-source metadata, deduplication and summaries"}
            action={
              news.items.length ? (
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">Auto-updating</span>
              ) : (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300">Connector setup required</span>
              )
            }
          />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {news.items.length
              ? news.items.slice(0, 6).map((item) => (
                  <a
                    key={item.id}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${card} group p-4 transition hover:border-emerald-400/35`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300">
                        {item.sourceName}
                      </span>
                      <SentimentBadge sentiment={item.sentiment} />
                    </div>
                    <h3 className="mt-4 text-sm font-extrabold leading-snug text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                      {item.headline}
                    </h3>
                    {item.summary ? (
                      <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{item.summary}</p>
                    ) : null}
                    <p className="mt-3 text-[10px] font-bold text-slate-400 dark:text-zinc-600">
                      {item.category} · {relativeTime(item.publishedAt)}
                    </p>
                  </a>
                ))
              : NEPSE_NEWS_SOURCES.slice(0, 6).map((source, index) => (
                  <a
                    key={source.name}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`${card} group p-4 transition hover:border-emerald-400/35`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-zinc-300">
                        {source.name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-zinc-600">Source {index + 1}</span>
                    </div>
                    <h3 className="mt-4 text-sm font-extrabold leading-snug text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                      Live headline feed awaiting a configured aggregation provider
                    </h3>
                    <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
                      Headline, source link, publish time, category, deduplication fingerprint and AI sentiment are supported by the Hub contract.
                    </p>
                  </a>
                ))}
          </div>
        </section>

        <div className="mt-7 grid gap-4 xl:grid-cols-2">
          <section className={`${card} p-4 sm:p-5`}>
            <SectionHeading
              icon={WalletCards}
              title="Portfolio Summary"
              subtitle="Your existing FIRE Nepal calculations"
              action={
                <Link href="/portfolio/investments" className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                  Open portfolio
                </Link>
              }
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["Portfolio Value", formatCompactNpr(portfolio.portfolioValueNpr)],
                ["Today’s P/L", formatCompactNpr(portfolio.todayGainNpr)],
                ["Investment", formatCompactNpr(portfolio.costNpr)],
                ["Total Gain/Loss", formatCompactNpr(portfolio.overallPnlNpr)],
                ["Dividend Earned", formatCompactNpr(portfolio.dividendNpr)],
                ["Holdings", portfolio.holdings.length.toString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
                  <p className={eyebrow}>{label}</p>
                  <p className="mt-2 truncate text-sm font-black tabular-nums text-slate-950 dark:text-white">{value}</p>
                </div>
              ))}
            </div>
            {allocation.length ? (
              <div className="mt-4">
                <p className={`${eyebrow} mb-2`}>Asset Allocation</p>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.05]" role="img" aria-label="Portfolio allocation by holding">
                  {allocation.map((slice) => (
                    <div key={slice.label} className={`${slice.color} h-full`} style={{ width: `${slice.pct}%` }} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {allocation.map((slice) =>
                    slice.label === "Others" ? (
                      <span key={slice.label} className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                        <span className={`h-2 w-2 rounded-full ${slice.color}`} />
                        {slice.label} · {slice.pct.toFixed(1)}%
                      </span>
                    ) : (
                      <Link
                        key={slice.label}
                        href={`/market/company/${encodeURIComponent(slice.label)}`}
                        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-slate-600 transition hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-300"
                      >
                        <span className={`h-2 w-2 rounded-full ${slice.color}`} />
                        {slice.label} · {slice.pct.toFixed(1)}%
                      </Link>
                    ),
                  )}
                </div>
              </div>
            ) : null}
          </section>

          <section className={`${card} p-4 sm:p-5`}>
            <SectionHeading
              icon={Star}
              title="Watchlist"
              subtitle={watchSymbols.length ? "Synced with your FIRE Nepal watchlist" : "Add symbols from market leaderboards"}
              action={
                <Link href="/market/watchlist" className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                  Manage ({watchSymbols.length}/64)
                </Link>
              }
            />
            {watched.length ? (
              <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                {watched.slice(0, 5).map((tick) => (
                  <div key={tick.symbol} className="flex items-center gap-3 py-2.5">
                    <Link href={`/market/company/${encodeURIComponent(tick.symbol)}`} className="min-w-0 flex-1">
                      <p className="text-xs font-black text-slate-950 dark:text-white">{tick.symbol}</p>
                      <p className="truncate text-[10px] font-medium text-slate-500 dark:text-zinc-500">{tick.companyName}</p>
                    </Link>
                    <MiniSparkline positive={(tick.changePct ?? 0) >= 0} />
                    <div className="shrink-0 text-right text-xs">
                      <p className="font-black tabular-nums text-slate-950 dark:text-white">रु {tick.ltpNpr.toLocaleString("en-IN")}</p>
                      <Delta value={tick.changePct} />
                    </div>
                    <button type="button" onClick={() => toggleWatch(tick.symbol)} className="text-amber-400" aria-label={`Remove ${tick.symbol} from watchlist`}>
                      <Star size={14} fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
                <div>
                  <Star className="mx-auto h-6 w-6 text-amber-400" />
                  <p className="mt-2 text-xs font-bold text-slate-700 dark:text-zinc-300">Your live watchlist is empty</p>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-zinc-500">Open a market service and star a company.</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="mt-7">
          <SectionHeading icon={Building2} title="Market Statistics" subtitle="Latest normalized board snapshot" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Listed Companies", term?.totalsListed.toLocaleString("en-IN") ?? "—"],
              ["Market Capitalization", marketCap ? marketCap.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "—"],
              ["Paid-up Capital", "Feed required"],
              ["Shares Traded", volume ? volume.toLocaleString("en-IN") : "—"],
              ["Turnover", formatCompactNpr(term?.totalTurnoverNpr)],
            ].map(([label, value]) => (
              <div key={label} className={`${card} p-4`}>
                <p className={eyebrow}>{label}</p>
                <p className="mt-2 text-base font-black tabular-nums text-slate-950 dark:text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Link
        href="/fire-ai/chat?context=nepse"
        className="fixed bottom-[calc(4.85rem+env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 inline-flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-xs font-black text-white shadow-[0_18px_50px_-18px_rgba(16,185,129,0.9)] ring-1 ring-white/20 transition hover:-translate-y-0.5 lg:bottom-[max(1rem,env(safe-area-inset-bottom))]"
        aria-label="Ask FIRE AI about NEPSE"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
          <Bot size={17} />
        </span>
        <span className="hidden sm:inline">Ask FIRE AI</span>
      </Link>
    </main>
  );
}
