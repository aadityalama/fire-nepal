"use client";

import {
  Activity,
  BellPlus,
  BriefcaseBusiness,
  CalendarDays,
  Grid3X3,
  ListFilter,
  RefreshCw,
  SlidersHorizontal,
  Star,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNepseRecentlyViewed } from "@/hooks/useNepseRecentlyViewed";
import { useNepseSmartAlerts, type NepseSmartAlertKind } from "@/hooks/useNepseAlerts";
import { useNepseTerminalBoard } from "@/hooks/useNepseTerminalBoard";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { formatCompactNpr } from "@/lib/market/nepse-hub";
import { useRealtimeMarket } from "@/providers/realtime-provider";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type {
  MarketCalendarEvent,
  ScreenerRow,
  TerminalHeatCell,
  TerminalRange52W,
} from "@/types/market/nepse-professional-terminal";
import type { NepseSecurityTick } from "@/types/market";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Activity },
  { id: "movers", label: "Movers", icon: TrendingUp },
  { id: "heatmap", label: "Heatmap", icon: Grid3X3 },
  { id: "screener", label: "Screener", icon: SlidersHorizontal },
  { id: "watchlists", label: "Watchlists", icon: Star },
  { id: "alerts", label: "Alerts", icon: BellPlus },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "brokers", label: "Brokers", icon: BriefcaseBusiness },
] as const;

type TabId = (typeof TABS)[number]["id"];
type MoverTab = "gainers" | "losers" | "turnover" | "volume" | "transactions" | "active" | "high52" | "low52";

const card =
  "rounded-[1.5rem] border border-slate-200/80 bg-white/88 shadow-[0_22px_70px_-44px_rgba(5,46,34,0.32)] backdrop-blur-2xl transition duration-300 dark:border-white/[0.08] dark:bg-white/[0.035]";
const eyebrow = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500";
const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-950 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-white";

function fmtPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function fmtNum(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  return value.toLocaleString("en-IN", { maximumFractionDigits: digits });
}

function Delta({ value }: { value?: number | null }) {
  if (value == null || !Number.isFinite(value)) {
    return <span className="text-slate-400 dark:text-zinc-600">{DATA_UNAVAILABLE}</span>;
  }
  const positive = value >= 0;
  return (
    <span className={`font-bold tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function heatBackground(changePct: number | null): string {
  if (changePct == null || !Number.isFinite(changePct)) return "bg-slate-200/70 dark:bg-white/[0.06]";
  const intensity = Math.min(Math.abs(changePct) / 5, 1);
  if (changePct >= 0) return `rgba(16, 185, 129, ${0.18 + intensity * 0.55})`;
  return `rgba(244, 63, 94, ${0.18 + intensity * 0.55})`;
}

function SkeletonBoard() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="terminal-skeleton">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`${card} h-24 animate-pulse bg-slate-100/80 p-4 dark:bg-white/[0.04]`}>
          <div className="h-2 w-16 rounded bg-slate-200 dark:bg-white/10" />
          <div className="mt-4 h-6 w-24 rounded bg-slate-200 dark:bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function MoverTable({ rows, empty }: { rows: NepseSecurityTick[]; empty: string }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-xs font-bold text-slate-400 dark:text-zinc-600">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">
          <tr>
            <th className="px-2 py-2">Symbol</th>
            <th className="px-2 py-2">LTP</th>
            <th className="px-2 py-2">Change</th>
            <th className="px-2 py-2">Volume</th>
            <th className="px-2 py-2">Turnover</th>
            <th className="px-2 py-2">Trades</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 25).map((row) => (
            <tr key={row.symbol} className="border-t border-slate-200/70 dark:border-white/[0.06]">
              <td className="px-2 py-2">
                <Link href={`/market/company/${encodeURIComponent(row.symbol)}`} className="font-black text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">
                  {row.symbol}
                </Link>
              </td>
              <td className="px-2 py-2 tabular-nums">{fmtNum(row.ltpNpr)}</td>
              <td className="px-2 py-2">
                <Delta value={row.changePct} />
              </td>
              <td className="px-2 py-2 tabular-nums">{fmtNum(row.volume, 0)}</td>
              <td className="px-2 py-2 tabular-nums">{row.turnoverNpr != null ? formatCompactNpr(row.turnoverNpr) : DATA_UNAVAILABLE}</td>
              <td className="px-2 py-2 tabular-nums">{fmtNum(row.trades, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Range52Table({ rows, mode }: { rows: TerminalRange52W[]; mode: "high" | "low" }) {
  if (!rows.length) {
    return <p className="py-8 text-center text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-2 py-2">Symbol</th>
            <th className="px-2 py-2">LTP</th>
            <th className="px-2 py-2">{mode === "high" ? "52W High" : "52W Low"}</th>
            <th className="px-2 py-2">Distance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.symbol} className="border-t border-slate-200/70 dark:border-white/[0.06]">
              <td className="px-2 py-2">
                <Link href={`/market/company/${encodeURIComponent(row.symbol)}`} className="font-black hover:text-emerald-700 dark:hover:text-emerald-300">
                  {row.symbol}
                </Link>
              </td>
              <td className="px-2 py-2 tabular-nums">{fmtNum(row.ltpNpr)}</td>
              <td className="px-2 py-2 tabular-nums">{fmtNum(mode === "high" ? row.high52wNpr : row.low52wNpr)}</td>
              <td className="px-2 py-2">
                <Delta value={row.distancePct} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HeatGrid({ cells, zoom }: { cells: TerminalHeatCell[]; zoom: number }) {
  const panRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  return (
    <div
      ref={panRef}
      className="max-h-[70vh] cursor-grab overflow-auto active:cursor-grabbing touch-pan-x touch-pan-y"
      onPointerDown={(event) => {
        const el = panRef.current;
        if (!el) return;
        drag.current = { x: event.clientX, y: event.clientY, left: el.scrollLeft, top: el.scrollTop };
        el.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const el = panRef.current;
        const state = drag.current;
        if (!el || !state) return;
        el.scrollLeft = state.left - (event.clientX - state.x);
        el.scrollTop = state.top - (event.clientY - state.y);
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <div
        className="grid min-w-[640px] gap-1.5 p-1"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.round(64 * zoom)}px, 1fr))` }}
      >
        {cells.map((cell) => {
          const bg = heatBackground(cell.changePct);
          return (
            <Link
              key={cell.symbol}
              href={`/market/company/${encodeURIComponent(cell.symbol)}`}
              className="rounded-xl p-2 text-center transition hover:scale-[1.03] hover:ring-2 hover:ring-emerald-400/40"
              style={bg.startsWith("rgba") ? { background: bg } : undefined}
              title={`${cell.symbol} ${fmtPct(cell.changePct)}`}
            >
              <p className="truncate text-[10px] font-black text-slate-950 dark:text-white">{cell.symbol}</p>
              <p className="mt-0.5 text-[10px] font-bold tabular-nums text-slate-700 dark:text-zinc-200">{fmtPct(cell.changePct)}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function NepseProfessionalTerminal({ initialTab = "dashboard" }: { initialTab?: TabId }) {
  const { snapshot } = useRealtimeMarket();
  const { data, loaded, error } = useNepseTerminalBoard();
  const { isWatched, symbols: personalWatchlist } = useNepseWatchlist();
  const { symbols: recent, track } = useNepseRecentlyViewed();
  const smartAlerts = useNepseSmartAlerts(snapshot?.nepseBySymbol);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [moverTab, setMoverTab] = useState<MoverTab>("gainers");
  const [heatMode, setHeatMode] = useState<"company" | "sector">("company");
  const [zoom, setZoom] = useState(1);
  const [screenerRows, setScreenerRows] = useState<ScreenerRow[]>([]);
  const [screenerTotal, setScreenerTotal] = useState(0);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerVisible, setScreenerVisible] = useState(40);
  const [smartBuckets, setSmartBuckets] = useState<{ id: string; label: string; description: string; symbols: string[] }[]>([]);
  const [calendar, setCalendar] = useState<MarketCalendarEvent[]>([]);
  const [calendarFilter, setCalendarFilter] = useState<string>("all");
  const screenerSentinel = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    sector: "all",
    minPrice: "",
    maxPrice: "",
    minPe: "",
    maxPe: "",
    minPb: "",
    maxPb: "",
    minEps: "",
    maxEps: "",
    minRoe: "",
    maxRoe: "",
    minRoa: "",
    maxRoa: "",
    minDivYield: "",
    maxDivYield: "",
    minMarketCap: "",
    maxMarketCap: "",
    minChangePct: "",
    maxChangePct: "",
    minVolume: "",
    maxVolume: "",
    minTurnover: "",
    minRsi: "",
    maxRsi: "",
    minAiScore: "",
    maxAiScore: "",
    macdSignal: "any",
    maTrend: "any",
    smaTrend: "any",
    emaTrend: "any",
    bollingerPosition: "any",
    technicalRating: "any",
    near52wHigh: false,
    near52wLow: false,
    technicals: false,
  });

  const [alertForm, setAlertForm] = useState({
    symbol: "",
    kind: "price" as NepseSmartAlertKind,
    direction: "above" as "above" | "below" | "either",
    target: "",
  });

  const sectors = useMemo(() => {
    const set = new Set<string>();
    for (const tick of Object.values(snapshot?.nepseBySymbol ?? {})) {
      if (tick.sector) set.add(tick.sector);
    }
    return [...set].sort();
  }, [snapshot?.nepseBySymbol]);

  useEffect(() => {
    if (tab !== "screener") return;
    let cancelled = false;
    const run = async () => {
      setScreenerLoading(true);
      setScreenerVisible(40);
      const params = new URLSearchParams();
      if (filters.sector !== "all") params.set("sector", filters.sector);
      const skip = new Set([
        "sector",
        "technicals",
        "macdSignal",
        "maTrend",
        "smaTrend",
        "emaTrend",
        "bollingerPosition",
        "technicalRating",
        "near52wHigh",
        "near52wLow",
      ]);
      for (const [key, value] of Object.entries(filters)) {
        if (skip.has(key)) continue;
        if (typeof value === "string" && value.trim()) params.set(key, value.trim());
      }
      if (filters.macdSignal !== "any") params.set("macdSignal", filters.macdSignal);
      if (filters.maTrend !== "any") params.set("maTrend", filters.maTrend);
      if (filters.smaTrend !== "any") params.set("smaTrend", filters.smaTrend);
      if (filters.emaTrend !== "any") params.set("emaTrend", filters.emaTrend);
      if (filters.bollingerPosition !== "any") params.set("bollingerPosition", filters.bollingerPosition);
      if (filters.technicalRating !== "any") params.set("technicalRating", filters.technicalRating);
      if (filters.near52wHigh) params.set("near52wHigh", "1");
      if (filters.near52wLow) params.set("near52wLow", "1");
      const needsTech =
        filters.technicals ||
        filters.macdSignal !== "any" ||
        filters.maTrend !== "any" ||
        filters.smaTrend !== "any" ||
        filters.emaTrend !== "any" ||
        filters.bollingerPosition !== "any" ||
        filters.technicalRating !== "any" ||
        filters.near52wHigh ||
        filters.near52wLow ||
        Boolean(filters.minRsi || filters.maxRsi || filters.minAiScore || filters.maxAiScore);
      if (needsTech) params.set("technicals", "1");
      params.set("limit", "200");
      try {
        const response = await fetch(`/api/market/nepse/screener?${params.toString()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as { rows: ScreenerRow[]; totalMatched: number };
        if (!cancelled) {
          setScreenerRows(payload.rows);
          setScreenerTotal(payload.totalMatched);
        }
      } catch {
        if (!cancelled) {
          setScreenerRows([]);
          setScreenerTotal(0);
        }
      } finally {
        if (!cancelled) setScreenerLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [tab, filters]);

  useEffect(() => {
    if (tab !== "screener") return;
    const node = screenerSentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setScreenerVisible((n) => Math.min(n + 30, screenerRows.length));
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [tab, screenerRows.length]);

  useEffect(() => {
    if (tab !== "watchlists") return;
    let cancelled = false;
    void fetch("/api/market/nepse/smart-watchlists")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.buckets) setSmartBuckets(payload.buckets);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tab]);

  useEffect(() => {
    if (tab !== "calendar") return;
    let cancelled = false;
    void fetch("/api/market/nepse/calendar?limit=150")
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload?.events) setCalendar(payload.events);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const filteredCalendar = useMemo(() => {
    if (calendarFilter === "all") return calendar;
    return calendar.filter((event) => event.type === calendarFilter);
  }, [calendar, calendarFilter]);

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-slate-950 dark:bg-[#030a08] dark:text-white" data-testid="nepse-professional-terminal">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.12),transparent_28rem)]" />
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">FIRE Nepal · Professional Terminal</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">NEPSE Market Terminal</h1>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
              Institutional board · movers · heatmap · screener · brokers — real data only
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider transition ${
                data?.status.live
                  ? "border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400"
              }`}
            >
              Market {data?.status.label ?? "…"}
            </span>
            <Link href="/market" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black dark:border-white/10 dark:bg-white/[0.05]">
              Hub
            </Link>
          </div>
        </header>

        <nav className="no-scrollbar -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white/90 p-1 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#07110f]/92" aria-label="Terminal sections">
          {TABS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black transition ${
                tab === item.id ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 dark:text-zinc-500 dark:hover:bg-white/[0.05]"
              }`}
            >
              <item.icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </button>
          ))}
        </nav>

        {error ? (
          <p className="mb-3 rounded-xl border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
            {error}
          </p>
        ) : null}

        {!loaded ? <SkeletonBoard /> : null}

        {loaded && tab === "dashboard" && data ? (
          <div className="space-y-4">
            <section className={`${card} p-4 sm:p-5`}>
              <p className={eyebrow}>Live market dashboard</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {[
                  ["Turnover", data.summary.totalTurnoverNpr != null ? formatCompactNpr(data.summary.totalTurnoverNpr) : DATA_UNAVAILABLE],
                  ["Volume", fmtNum(data.summary.totalVolume, 0)],
                  ["Transactions", fmtNum(data.summary.totalTrades, 0)],
                  ["Scrips", fmtNum(data.summary.scripsTraded, 0)],
                  [
                    "Market Cap",
                    data.summary.totalMarketCapNpr != null
                      ? `${formatCompactNpr(data.summary.totalMarketCapNpr)}${data.summary.marketCapCoverage ? ` · ${data.summary.marketCapCoverage}` : ""}`
                      : DATA_UNAVAILABLE,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50/80 p-3 transition hover:bg-emerald-50/60 dark:bg-white/[0.03] dark:hover:bg-emerald-400/[0.06]">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-1 text-sm font-black tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              {data.breadth ? (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">Adv {data.breadth.advancing}</span>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300">Dec {data.breadth.declining}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-400">Unch {data.breadth.unchanged}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-white/[0.06] dark:text-zinc-400">A/D {data.breadth.advanceDeclineRatio.toFixed(2)}</span>
                </div>
              ) : (
                <p className="mt-3 text-xs font-bold text-slate-400">Breadth · {DATA_UNAVAILABLE}</p>
              )}
            </section>

            <section className={`${card} p-4 sm:p-5`}>
              <p className={eyebrow}>Indices · Sensitive · Float · sectors</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {data.indices.map((index) => (
                  <div key={index.id} className="rounded-2xl border border-slate-200/70 p-3 transition hover:-translate-y-0.5 dark:border-white/[0.06]">
                    <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">{index.name}</p>
                    <p className="mt-1 text-lg font-black tabular-nums">{fmtNum(index.value)}</p>
                    <div className="mt-1 text-xs">
                      {index.source === "index_feed" ? (
                        <Delta value={index.changePct} />
                      ) : index.source === "sector_pulse" ? (
                        <span className="font-bold">
                          Sector pulse <Delta value={index.sectorChangePct} />
                        </span>
                      ) : (
                        <span className="text-slate-400">{DATA_UNAVAILABLE}</span>
                      )}
                    </div>
                    {index.source === "sector_pulse" ? (
                      <p className="mt-1 text-[9px] font-semibold text-slate-400">Official index level not published — showing live sector average</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {loaded && tab === "movers" && data ? (
          <section className={`${card} p-4 sm:p-5`}>
            <div className="no-scrollbar mb-3 flex gap-1 overflow-x-auto">
              {(
                [
                  ["gainers", "Top Gainers"],
                  ["losers", "Top Losers"],
                  ["turnover", "Top Turnover"],
                  ["volume", "Top Volume"],
                  ["transactions", "Top Transactions"],
                  ["active", "Most Active"],
                  ["high52", "52W High"],
                  ["low52", "52W Low"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMoverTab(id)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-[10px] font-black ${moverTab === id ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-zinc-500"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {moverTab === "high52" ? (
              <Range52Table rows={data.movers.near52wHigh ?? []} mode="high" />
            ) : moverTab === "low52" ? (
              <Range52Table rows={data.movers.near52wLow ?? []} mode="low" />
            ) : (
              <MoverTable
                rows={
                  moverTab === "gainers"
                    ? data.movers.topGainers
                    : moverTab === "losers"
                      ? data.movers.topLosers
                      : moverTab === "turnover"
                        ? data.movers.topTurnover
                        : moverTab === "volume"
                          ? data.movers.topVolume
                          : moverTab === "transactions"
                            ? data.movers.topTransactions
                            : data.movers.mostActive
                }
                empty={`${DATA_UNAVAILABLE} — mover list empty for this session feed.`}
              />
            )}
          </section>
        ) : null}

        {loaded && tab === "heatmap" && data ? (
          <section className={`${card} p-4 sm:p-5`}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-white/[0.05]">
                {(["company", "sector"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setHeatMode(mode)}
                    className={`rounded-[0.65rem] px-3 py-1.5 text-[10px] font-black capitalize ${heatMode === mode ? "bg-emerald-500 text-white" : "text-slate-500"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <label className="ml-auto flex items-center gap-2 text-[10px] font-bold text-slate-500">
                Zoom
                <input type="range" min={0.75} max={1.5} step={0.05} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
              </label>
            </div>
            {heatMode === "company" ? (
              data.heatmap.companies.length ? (
                <HeatGrid cells={data.heatmap.companies} zoom={zoom} />
              ) : (
                <p className="py-8 text-center text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p>
              )
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.heatmap.sectors.map((sector) => (
                  <div key={sector.sector} className="rounded-2xl p-3 transition hover:scale-[1.01]" style={{ background: heatBackground(sector.avgChangePct) }}>
                    <p className="text-sm font-black">{sector.sector}</p>
                    <p className="mt-1 text-xs font-bold">
                      <Delta value={sector.avgChangePct} /> · {sector.constituents} names
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-slate-600 dark:text-zinc-300">{formatCompactNpr(sector.turnoverNpr)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {tab === "screener" ? (
          <section className={`${card} p-4 sm:p-5`}>
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-emerald-600" aria-hidden />
              <h2 className="text-sm font-black">Professional Screener</h2>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
                {screenerLoading ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" /> Screening…
                  </>
                ) : (
                  `${screenerTotal} matches`
                )}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500">
                Sector
                <select className={`${inputClass} mt-1`} value={filters.sector} onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}>
                  <option value="all">All</option>
                  {sectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </label>
              {(
                [
                  ["minPrice", "Min Price"],
                  ["maxPrice", "Max Price"],
                  ["minMarketCap", "Min MCap"],
                  ["maxMarketCap", "Max MCap"],
                  ["minPe", "Min PE"],
                  ["maxPe", "Max PE"],
                  ["minPb", "Min PB"],
                  ["maxPb", "Max PB"],
                  ["minEps", "Min EPS"],
                  ["maxEps", "Max EPS"],
                  ["minRoe", "Min ROE"],
                  ["maxRoe", "Max ROE"],
                  ["minRoa", "Min ROA"],
                  ["maxRoa", "Max ROA"],
                  ["minDivYield", "Min Div Yield"],
                  ["maxDivYield", "Max Div Yield"],
                  ["minChangePct", "Min % Chg"],
                  ["maxChangePct", "Max % Chg"],
                  ["minVolume", "Min Volume"],
                  ["maxVolume", "Max Volume"],
                  ["minTurnover", "Min Turnover"],
                  ["minRsi", "Min RSI"],
                  ["maxRsi", "Max RSI"],
                  ["minAiScore", "Min AI Score"],
                  ["maxAiScore", "Max AI Score"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {label}
                  <input
                    className={`${inputClass} mt-1 fn-mobile-numeric-input`}
                    inputMode="decimal"
                    value={filters[key]}
                    onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              {(
                [
                  ["macdSignal", "MACD", ["any", "bullish", "bearish"]],
                  ["smaTrend", "SMA Trend", ["any", "bullish", "bearish", "neutral"]],
                  ["emaTrend", "EMA Trend", ["any", "bullish", "bearish", "neutral"]],
                  ["bollingerPosition", "Bollinger", ["any", "above_upper", "upper_half", "lower_half", "below_lower"]],
                  ["technicalRating", "Tech Rating", ["any", "bullish", "bearish", "neutral"]],
                ] as const
              ).map(([key, label, options]) => (
                <label key={key} className="block text-[9px] font-black uppercase tracking-wider text-slate-500">
                  {label}
                  <select
                    className={`${inputClass} mt-1`}
                    value={filters[key]}
                    onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value, technicals: true }))}
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="flex items-end gap-2 pb-2 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <input type="checkbox" checked={filters.near52wHigh} onChange={(e) => setFilters((f) => ({ ...f, near52wHigh: e.target.checked, technicals: true }))} />
                Near 52W High
              </label>
              <label className="flex items-end gap-2 pb-2 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <input type="checkbox" checked={filters.near52wLow} onChange={(e) => setFilters((f) => ({ ...f, near52wLow: e.target.checked, technicals: true }))} />
                Near 52W Low
              </label>
              <label className="flex items-end gap-2 pb-2 text-[11px] font-bold text-slate-600 dark:text-zinc-400">
                <input type="checkbox" checked={filters.technicals} onChange={(e) => setFilters((f) => ({ ...f, technicals: e.target.checked }))} />
                Enrich technicals
              </label>
            </div>
            {screenerLoading ? (
              <div className="mt-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-white/[0.04]" />
                ))}
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <tr>
                      {["Symbol", "LTP", "%", "PE", "PB", "EPS", "ROE", "ROA", "Div", "RSI", "SMA", "EMA", "BB", "Tech", "AI", "Vol"].map((h) => (
                        <th key={h} className="px-2 py-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {screenerRows.slice(0, screenerVisible).map((row) => (
                      <tr key={row.symbol} className="border-t border-slate-200/70 dark:border-white/[0.06]">
                        <td className="px-2 py-2">
                          <Link
                            href={`/market/company/${encodeURIComponent(row.symbol)}`}
                            onClick={() => track(row.symbol)}
                            className="font-black hover:text-emerald-700 dark:hover:text-emerald-300"
                          >
                            {row.symbol}
                          </Link>
                        </td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(row.ltpNpr)}</td>
                        <td className="px-2 py-2">
                          <Delta value={row.changePct} />
                        </td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(row.pe)}</td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(row.pb)}</td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(row.eps)}</td>
                        <td className="px-2 py-2 tabular-nums">{row.roePct != null ? fmtPct(row.roePct) : DATA_UNAVAILABLE}</td>
                        <td className="px-2 py-2 tabular-nums">{row.roaPct != null ? fmtPct(row.roaPct) : DATA_UNAVAILABLE}</td>
                        <td className="px-2 py-2 tabular-nums">{row.dividendYieldPct != null ? fmtPct(row.dividendYieldPct) : DATA_UNAVAILABLE}</td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(row.rsi)}</td>
                        <td className="px-2 py-2">{row.smaTrend}</td>
                        <td className="px-2 py-2">{row.emaTrend}</td>
                        <td className="px-2 py-2">{row.bollingerPos}</td>
                        <td className="px-2 py-2">{row.technicalRating}</td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(row.aiScore, 0)}</td>
                        <td className="px-2 py-2 tabular-nums">{fmtNum(row.volume, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div ref={screenerSentinel} className="h-8" />
                {screenerVisible < screenerRows.length ? (
                  <p className="py-2 text-center text-[10px] font-bold text-slate-400">Scroll for more…</p>
                ) : null}
                {!screenerRows.length ? (
                  <p className="py-8 text-center text-xs font-bold text-slate-400">{DATA_UNAVAILABLE} — no symbols match these filters.</p>
                ) : null}
              </div>
            )}
          </section>
        ) : null}

        {tab === "watchlists" ? (
          <div className="space-y-4">
            <section className={`${card} p-4 sm:p-5`}>
              <p className={eyebrow}>Personal watchlist</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {personalWatchlist.length ? (
                  personalWatchlist.map((symbol) => (
                    <Link key={symbol} href={`/market/company/${encodeURIComponent(symbol)}`} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black dark:border-white/10">
                      {symbol}
                    </Link>
                  ))
                ) : (
                  <p className="text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p>
                )}
              </div>
            </section>
            <section className={`${card} p-4 sm:p-5`}>
              <p className={eyebrow}>Recently viewed</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {recent.length ? (
                  recent.map((symbol) => (
                    <Link key={symbol} href={`/market/company/${encodeURIComponent(symbol)}`} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black dark:border-white/10">
                      {symbol}
                    </Link>
                  ))
                ) : (
                  <p className="text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p>
                )}
              </div>
            </section>
            {smartBuckets.map((bucket) => (
              <section key={bucket.id} className={`${card} p-4 sm:p-5`}>
                <p className={eyebrow}>{bucket.label}</p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">{bucket.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {bucket.symbols.length ? (
                    bucket.symbols.map((symbol) => (
                      <Link
                        key={symbol}
                        href={`/market/company/${encodeURIComponent(symbol)}`}
                        onClick={() => track(symbol)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-black transition hover:scale-105 ${
                          isWatched(symbol)
                            ? "border-amber-300/50 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10"
                            : "border-slate-200 dark:border-white/10"
                        }`}
                      >
                        {symbol}
                      </Link>
                    ))
                  ) : (
                    <p className="text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p>
                  )}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {tab === "alerts" ? (
          <section className={`${card} p-4 sm:p-5`}>
            <p className={eyebrow}>Smart alerts</p>
            <form
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5"
              onSubmit={(event) => {
                event.preventDefault();
                const target = alertForm.target.trim() === "" ? null : Number(alertForm.target);
                smartAlerts.addAlert({
                  symbol: alertForm.symbol,
                  kind: alertForm.kind,
                  direction: alertForm.direction,
                  target,
                });
                setAlertForm((form) => ({ ...form, symbol: "", target: "" }));
              }}
            >
              <input className={inputClass} placeholder="Symbol" value={alertForm.symbol} onChange={(e) => setAlertForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} required />
              <select className={inputClass} value={alertForm.kind} onChange={(e) => setAlertForm((f) => ({ ...f, kind: e.target.value as NepseSmartAlertKind }))}>
                <option value="price">Price Target</option>
                <option value="change_pct">% Change</option>
                <option value="volume">Volume</option>
                <option value="volume_spike">Volume Spike</option>
                <option value="rsi">RSI</option>
                <option value="macd_cross">MACD Cross</option>
                <option value="ma_cross">MA Cross</option>
                <option value="dividend">Dividend</option>
                <option value="bonus">Bonus</option>
                <option value="rights">Rights</option>
                <option value="corporate_action">Corporate Action</option>
                <option value="financial_report">Financial Report</option>
                <option value="ai_rating_change">AI Rating Change</option>
              </select>
              <select className={inputClass} value={alertForm.direction} onChange={(e) => setAlertForm((f) => ({ ...f, direction: e.target.value as "above" | "below" | "either" }))}>
                <option value="above">Above</option>
                <option value="below">Below</option>
                <option value="either">Either / Event</option>
              </select>
              <input className={`${inputClass} fn-mobile-numeric-input`} inputMode="decimal" placeholder="Target" value={alertForm.target} onChange={(e) => setAlertForm((f) => ({ ...f, target: e.target.value }))} />
              <button type="submit" className="h-10 rounded-xl bg-emerald-500 text-xs font-black text-white">
                Add alert
              </button>
            </form>
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              Price / % / volume alerts trigger from the live board. Cross / AI / announcement alerts stay armed until a matching real feed is available — never invent triggers.
            </p>
            {smartAlerts.triggered.length ? (
              <div className="mt-3 space-y-1.5">
                {smartAlerts.triggered.map((alert) => (
                  <p key={alert.id} className="rounded-xl border border-emerald-300/40 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                    {alert.message}
                  </p>
                ))}
              </div>
            ) : null}
            <ul className="mt-3 space-y-1.5">
              {smartAlerts.alerts.map((alert) => (
                <li key={alert.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-xs dark:bg-white/[0.03]">
                  <span className="font-bold">
                    {alert.symbol} · {alert.kind} · {alert.direction}
                    {alert.target != null ? ` · ${alert.target}` : ""}
                  </span>
                  <button type="button" onClick={() => smartAlerts.removeAlert(alert.id)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:text-rose-600" aria-label="Remove alert">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
              {!smartAlerts.alerts.length ? <p className="text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p> : null}
            </ul>
          </section>
        ) : null}

        {tab === "calendar" ? (
          <section className={`${card} p-4 sm:p-5`}>
            <div className="mb-3 flex flex-wrap gap-1">
              {["all", "dividend", "bonus", "book_closure", "rights", "agm", "ipo", "fpo", "financial_report", "auction", "trading_holiday"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCalendarFilter(type)}
                  className={`rounded-full px-3 py-1 text-[10px] font-black capitalize ${calendarFilter === type ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/[0.05]"}`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
            <ul className="space-y-2">
              {filteredCalendar.map((event) => (
                <li key={event.id} className="rounded-2xl border border-slate-200/70 px-3 py-2.5 dark:border-white/[0.06]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">
                      {event.type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">{event.date ?? DATA_UNAVAILABLE}</span>
                    {event.symbol ? (
                      <Link href={`/market/company/${encodeURIComponent(event.symbol)}`} className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">
                        {event.symbol}
                      </Link>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-black">{event.title}</p>
                  {event.detail ? <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500">{event.detail}</p> : null}
                  <p className="mt-1 text-[9px] font-semibold text-slate-400">{event.source}</p>
                </li>
              ))}
              {!filteredCalendar.length ? (
                <p className="py-8 text-center text-xs font-bold text-slate-400">
                  {calendarFilter === "auction" || calendarFilter === "trading_holiday"
                    ? `${calendarFilter.replace("_", " ")} · ${DATA_UNAVAILABLE} (no configured feed)`
                    : DATA_UNAVAILABLE}
                </p>
              ) : null}
            </ul>
          </section>
        ) : null}

        {loaded && tab === "brokers" && data ? (
          <div className="space-y-4">
            <section className={`${card} p-4 sm:p-5`}>
              <p className={eyebrow}>Top brokers by turnover</p>
              {data.brokers.topByTurnover.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Code</th>
                        <th className="px-2 py-2">Broker</th>
                        <th className="px-2 py-2">Latest TO</th>
                        <th className="px-2 py-2">30D TO</th>
                        <th className="px-2 py-2">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.brokers.topByTurnover.map((row) => (
                        <tr key={row.memberCode} className="border-t border-slate-200/70 dark:border-white/[0.06]">
                          <td className="px-2 py-2 font-black">{row.memberCode}</td>
                          <td className="px-2 py-2">{row.memberName}</td>
                          <td className="px-2 py-2 tabular-nums">{row.latestTurnoverNpr != null ? formatCompactNpr(row.latestTurnoverNpr) : DATA_UNAVAILABLE}</td>
                          <td className="px-2 py-2 tabular-nums">{row.thirtyDayTurnoverNpr != null ? formatCompactNpr(row.thirtyDayTurnoverNpr) : DATA_UNAVAILABLE}</td>
                          <td className="px-2 py-2 tabular-nums">{fmtNum(row.rating)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p>
              )}
              {data.brokers.asOf ? <p className="mt-2 text-[10px] font-semibold text-slate-400">As of {data.brokers.asOf}</p> : null}
            </section>

            <section className={`${card} p-4 sm:p-5`}>
              <p className={eyebrow}>Broker buy / sell summary</p>
              {data.brokers.buySellLeaders.length ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Broker</th>
                        <th className="px-2 py-2">Buy</th>
                        <th className="px-2 py-2">Sell</th>
                        <th className="px-2 py-2">Buy qty %</th>
                        <th className="px-2 py-2">Sell qty %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.brokers.buySellLeaders.map((row) => (
                        <tr key={`bs-${row.memberCode}`} className="border-t border-slate-200/70 dark:border-white/[0.06]">
                          <td className="px-2 py-2 font-black">
                            {row.memberCode} · {row.memberName}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-emerald-700 dark:text-emerald-400">
                            {row.buyAmountNpr != null ? formatCompactNpr(row.buyAmountNpr) : DATA_UNAVAILABLE}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-rose-700 dark:text-rose-400">
                            {row.sellAmountNpr != null ? formatCompactNpr(row.sellAmountNpr) : DATA_UNAVAILABLE}
                          </td>
                          <td className="px-2 py-2 tabular-nums">{fmtNum(row.buyQtyPct)}</td>
                          <td className="px-2 py-2 tabular-nums">{fmtNum(row.sellQtyPct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p>
              )}
            </section>

            <section className={`${card} p-4 sm:p-5`}>
              <p className={eyebrow}>Sector performance & market distribution</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(data.marketDistribution.length ? data.marketDistribution : []).map((row) => (
                  <div key={row.sector} className="rounded-2xl border border-slate-200/70 p-3 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-black">{row.sector}</p>
                      <p className="text-xs font-bold tabular-nums">{fmtPct(row.turnoverSharePct)}</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.06]">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, row.turnoverSharePct))}%` }} />
                    </div>
                    <p className="mt-2 text-[10px] font-semibold text-slate-500">
                      {formatCompactNpr(row.turnoverNpr)} · {row.constituents} names
                    </p>
                  </div>
                ))}
                {!data.marketDistribution.length ? <p className="text-xs font-bold text-slate-400">{DATA_UNAVAILABLE}</p> : null}
              </div>
            </section>
          </div>
        ) : null}

        {data?.sources.length ? (
          <p className="mt-4 text-[10px] font-semibold text-slate-400 dark:text-zinc-600">Sources: {data.sources.join(" · ")}</p>
        ) : null}
      </div>
    </main>
  );
}
