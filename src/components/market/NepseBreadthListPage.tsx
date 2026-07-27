"use client";

import {
  ArrowDownAZ,
  ArrowLeft,
  ArrowUpAZ,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collectSectors,
  filterCompaniesByBreadth,
  getBreadthCategoryMeta,
  getDefaultSortForBreadth,
  sortNepseTicks,
  type NepseBreadthCategory,
} from "@/lib/market/nepse-breadth";
import { NEPSE_MARKET_INDEX_OPTIONS } from "@/lib/market/nepse-market-indices";
import { formatCompactNpr } from "@/lib/market/nepse-hub";
import { useRealtimeMarket } from "@/providers/realtime-provider";
import type { NepseSecurityTick } from "@/types/market";
import type { NepseSortDirection, NepseTableSortKey } from "@/types/market/terminal-ui";

const card =
  "rounded-[1.5rem] border border-slate-200/80 bg-white/88 shadow-[0_22px_70px_-44px_rgba(5,46,34,0.32)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-[0_22px_70px_-44px_rgba(0,0,0,0.9)]";
const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white";

const PAGE_SIZE = 40;
const LOAD_MORE = 30;

const SORT_OPTIONS: { key: NepseTableSortKey; label: string }[] = [
  { key: "symbol", label: "Symbol" },
  { key: "companyName", label: "Company Name" },
  { key: "ltpNpr", label: "Last Price" },
  { key: "changePct", label: "Change %" },
  { key: "volume", label: "Volume" },
  { key: "turnoverNpr", label: "Turnover" },
  { key: "marketCap", label: "Market Cap" },
];

function formatChangeAmount(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const positive = value >= 0;
  return `${positive ? "+" : ""}रु ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChangePct(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function SortHint({ active, direction }: { active: boolean; direction: NepseSortDirection }) {
  if (!active) return null;
  return direction === "asc" ? (
    <ArrowUpAZ className="ml-0.5 inline h-3 w-3 opacity-80" aria-hidden />
  ) : (
    <ArrowDownAZ className="ml-0.5 inline h-3 w-3 opacity-80" aria-hidden />
  );
}

function usePullToRefresh(onRefresh: () => void, refreshing: boolean) {
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback((event: TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) {
      touchStartY.current = event.touches[0]?.clientY ?? 0;
      pulling.current = true;
    }
  }, [refreshing]);

  const onTouchMove = useCallback((event: TouchEvent) => {
    if (!pulling.current || touchStartY.current <= 0) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const diff = currentY - touchStartY.current;
    if (diff > 0 && window.scrollY <= 0) {
      setPullDistance(Math.min(diff * 0.45, 72));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pullDistance >= 52) onRefresh();
    setPullDistance(0);
    touchStartY.current = 0;
    pulling.current = false;
  }, [onRefresh, pullDistance]);

  useEffect(() => {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchEnd, onTouchMove, onTouchStart]);

  return pullDistance;
}

type RankedTick = NepseSecurityTick & { rank: number };

type IndexCompositionResponse = {
  indexKey: string;
  indexName: string;
  companyCount: number;
  symbols: string[];
  totalMarketCapNpr: number | null;
  lastUpdated: string | null;
  membershipSource: string;
  options?: { key: string; displayName: string }[];
};

export function NepseBreadthListPage({ category }: { category: NepseBreadthCategory }) {
  const meta = getBreadthCategoryMeta(category);
  const { snapshot, status, error, reload } = useRealtimeMarket();
  const defaultSort = useMemo(() => getDefaultSortForBreadth(category), [category]);
  const showIndexFilter = category === "all-listed";

  const [query, setQuery] = useState("");
  const [indexFilter, setIndexFilter] = useState("ALL_LISTED");
  const [sectorFilter, setSectorFilter] = useState("");
  const [sortKey, setSortKey] = useState<NepseTableSortKey>(defaultSort.key);
  const [sortDir, setSortDir] = useState<NepseSortDirection>(defaultSort.direction);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [indexMembership, setIndexMembership] = useState<Set<string> | null>(null);
  const [indexMeta, setIndexMeta] = useState<IndexCompositionResponse | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexOptions, setIndexOptions] = useState(
    NEPSE_MARKET_INDEX_OPTIONS.map((row) => ({ key: row.key, displayName: row.displayName })),
  );

  const pullDistance = usePullToRefresh(reload, status === "loading");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSortKey(defaultSort.key);
    setSortDir(defaultSort.direction);
    setQuery("");
    setIndexFilter("ALL_LISTED");
    setSectorFilter("");
    setVisibleCount(PAGE_SIZE);
  }, [category, defaultSort.direction, defaultSort.key]);

  useEffect(() => {
    if (!showIndexFilter) {
      setIndexMembership(null);
      setIndexMeta(null);
      return;
    }
    let cancelled = false;
    setIndexLoading(true);
    void (async () => {
      try {
        const response = await fetch(`/api/market/nepse/index-composition?index=${encodeURIComponent(indexFilter)}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as IndexCompositionResponse;
        if (cancelled) return;
        setIndexMeta(payload);
        setIndexMembership(new Set((payload.symbols ?? []).map((symbol) => symbol.toUpperCase())));
        if (payload.options?.length) setIndexOptions(payload.options);
      } catch {
        if (!cancelled) {
          setIndexMembership(indexFilter === "ALL_LISTED" ? null : new Set());
          setIndexMeta(null);
        }
      } finally {
        if (!cancelled) setIndexLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [indexFilter, showIndexFilter]);

  const ticks = useMemo(() => Object.values(snapshot?.nepseBySymbol ?? {}), [snapshot?.nepseBySymbol]);

  const categoryRows = useMemo(() => filterCompaniesByBreadth(ticks, category), [ticks, category]);

  const indexFilteredRows = useMemo(() => {
    if (!showIndexFilter || !indexFilter || indexFilter === "ALL_LISTED" || !indexMembership) {
      return categoryRows;
    }
    return categoryRows.filter((tick) => indexMembership.has(tick.symbol.toUpperCase()));
  }, [categoryRows, indexFilter, indexMembership, showIndexFilter]);

  const rankedByDefault = useMemo(() => {
    const sorted = sortNepseTicks(indexFilteredRows, defaultSort.key, defaultSort.direction);
    return new Map(sorted.map((tick, index) => [tick.symbol, index + 1]));
  }, [indexFilteredRows, defaultSort.direction, defaultSort.key]);

  const sectors = useMemo(() => collectSectors(indexFilteredRows), [indexFilteredRows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = indexFilteredRows;
    if (sectorFilter) {
      list = list.filter((tick) => (tick.sector ?? "").trim() === sectorFilter);
    }
    if (needle) {
      list = list.filter((tick) => `${tick.symbol} ${tick.companyName ?? ""}`.toLowerCase().includes(needle));
    }
    return sortNepseTicks(list, sortKey, sortDir);
  }, [indexFilteredRows, query, sectorFilter, sortDir, sortKey]);

  const visibleRows: RankedTick[] = useMemo(
    () =>
      filtered.slice(0, visibleCount).map((tick) => ({
        ...tick,
        rank: rankedByDefault.get(tick.symbol) ?? 0,
      })),
    [filtered, rankedByDefault, visibleCount],
  );

  const indexSummary = useMemo(() => {
    const selected = indexOptions.find((row) => row.key === indexFilter);
    const name = indexMeta?.indexName ?? selected?.displayName ?? "All Listed";
    const companyCount = filtered.length;
    let totalMarketCap: number | null = null;
    let anyCap = false;
    let sum = 0;
    for (const tick of filtered) {
      if (tick.marketCap != null && Number.isFinite(tick.marketCap) && tick.marketCap > 0) {
        sum += tick.marketCap;
        anyCap = true;
      }
    }
    totalMarketCap = anyCap ? sum : null;
    const lastUpdated = indexMeta?.lastUpdated ?? snapshot?.fetchedAt ?? null;
    return { name, companyCount, totalMarketCap, lastUpdated };
  }, [filtered, indexFilter, indexMeta, indexOptions, snapshot?.fetchedAt]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, sectorFilter, sortDir, sortKey, indexFilter]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + LOAD_MORE, filtered.length));
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length]);

  const toggleSort = (key: NepseTableSortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "symbol" || key === "companyName" ? "asc" : "desc");
  };

  const fetchedAt = snapshot?.fetchedAt;
  const lastUpdatedLabel = (indexSummary.lastUpdated ?? fetchedAt)
    ? new Date(indexSummary.lastUpdated ?? fetchedAt!).toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-slate-950 dark:bg-[#030a08] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(16,185,129,0.12),transparent_28rem),radial-gradient(circle_at_94%_16%,rgba(20,184,166,0.08),transparent_24rem)]" />

      {pullDistance > 0 ? (
        <div
          className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))]"
          style={{ transform: `translateY(${Math.min(pullDistance, 64)}px)` }}
        >
          <span className="rounded-full border border-emerald-400/30 bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 shadow-lg dark:bg-[#07110f]/95 dark:text-emerald-300">
            {pullDistance >= 52 ? "Release to refresh" : "Pull to refresh"}
          </span>
        </div>
      ) : null}

      <div className="relative mx-auto w-full max-w-[1480px] px-3 pb-28 pt-4 sm:px-5 lg:px-8">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/market"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
              aria-label="Back to NEPSE Hub"
            >
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                FIRE Nepal · NEPSE Hub
              </p>
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">{meta.label}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={reload}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
            aria-label="Refresh market data"
          >
            <RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} />
          </button>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_8%_0%,rgba(52,211,153,0.22),transparent_34%),linear-gradient(145deg,#063126_0%,#071b17_52%,#040b0a_100%)] p-4 text-white shadow-[0_32px_90px_-40px_rgba(4,120,87,0.65)] sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/55">
            {showIndexFilter ? "Market index" : "Market breadth"}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-lg font-black tracking-tight text-emerald-50 sm:text-xl">{indexSummary.name}</p>
              <p className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">
                {indexSummary.companyCount.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-100/70">
                {indexLoading
                  ? "Loading official index membership…"
                  : filtered.length === categoryRows.length
                    ? "companies in this view"
                    : `${filtered.length.toLocaleString("en-IN")} of ${categoryRows.length.toLocaleString("en-IN")} companies shown`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/45">Total market cap</p>
              <p className="mt-1 text-lg font-black tabular-nums text-emerald-50">
                {indexSummary.totalMarketCap != null ? formatCompactNpr(indexSummary.totalMarketCap) : "—"}
              </p>
              <p className="mt-2 text-[10px] font-semibold text-emerald-100/45">Last updated {lastUpdatedLabel}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-xs font-medium leading-relaxed text-emerald-50/60">{meta.description}</p>
        </section>

        {error ? (
          <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-300/15 dark:bg-amber-300/[0.07] dark:text-amber-200">
            Live feed degraded: {error}. Showing the latest available quotes.
          </div>
        ) : null}

        <section className={`${card} mt-4 p-3 sm:p-4`}>
          <div
            className={`grid gap-2 ${
              showIndexFilter ? "sm:grid-cols-2 lg:grid-cols-[1fr_12rem_10rem_10rem]" : "sm:grid-cols-[1fr_10rem_10rem]"
            }`}
          >
            <div className={`relative ${showIndexFilter ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search symbol or company…"
                className={`${inputClass} pl-9`}
                aria-label="Search companies"
              />
            </div>
            {showIndexFilter ? (
              <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Market Index
                </span>
                <select
                  value={indexFilter}
                  onChange={(event) => setIndexFilter(event.target.value)}
                  className={inputClass}
                  aria-label="Filter by market index"
                >
                  {indexOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block">
              {showIndexFilter ? (
                <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Sector
                </span>
              ) : null}
              <select
                value={sectorFilter}
                onChange={(event) => setSectorFilter(event.target.value)}
                className={inputClass}
                aria-label="Filter by sector"
              >
                <option value="">All sectors</option>
                {sectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              {showIndexFilter ? (
                <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Sort
                </span>
              ) : null}
              <select
                value={`${sortKey}:${sortDir}`}
                onChange={(event) => {
                  const [key, dir] = event.target.value.split(":") as [NepseTableSortKey, NepseSortDirection];
                  setSortKey(key);
                  setSortDir(dir);
                }}
                className={inputClass}
                aria-label="Sort companies"
              >
                {SORT_OPTIONS.flatMap((option) => [
                  <option key={`${option.key}:asc`} value={`${option.key}:asc`}>
                    {option.label} ↑
                  </option>,
                  <option key={`${option.key}:desc`} value={`${option.key}:desc`}>
                    {option.label} ↓
                  </option>,
                ])}
              </select>
            </label>
          </div>
        </section>

        <section className={`${card} mt-4 overflow-hidden`}>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[960px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-500">
                <tr>
                  {meta.showRank ? <th className="px-4 py-3 text-right">Rank</th> : null}
                  <th className="px-4 py-3">
                    <button type="button" onClick={() => toggleSort("symbol")} className="inline-flex items-center">
                      Symbol
                      <SortHint active={sortKey === "symbol"} direction={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-3">
                    <button type="button" onClick={() => toggleSort("companyName")} className="inline-flex items-center">
                      Company
                      <SortHint active={sortKey === "companyName"} direction={sortDir} />
                    </button>
                  </th>
                  {meta.showSector ? (
                    <th className="px-3 py-3">
                      <button type="button" onClick={() => toggleSort("sector")} className="inline-flex items-center">
                        Sector
                        <SortHint active={sortKey === "sector"} direction={sortDir} />
                      </button>
                    </th>
                  ) : null}
                  <th className="px-3 py-3 text-right">
                    <button type="button" onClick={() => toggleSort("ltpNpr")} className="inline-flex items-center">
                      Last Price
                      <SortHint active={sortKey === "ltpNpr"} direction={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <button type="button" onClick={() => toggleSort("changePct")} className="inline-flex items-center">
                      Change %
                      <SortHint active={sortKey === "changePct"} direction={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <button type="button" onClick={() => toggleSort("changeNpr")} className="inline-flex items-center">
                      Change
                      <SortHint active={sortKey === "changeNpr"} direction={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <button type="button" onClick={() => toggleSort("volume")} className="inline-flex items-center">
                      Volume
                      <SortHint active={sortKey === "volume"} direction={sortDir} />
                    </button>
                  </th>
                  <th className="px-3 py-3 text-right">
                    <button type="button" onClick={() => toggleSort("turnoverNpr")} className="inline-flex items-center">
                      Turnover
                      <SortHint active={sortKey === "turnoverNpr"} direction={sortDir} />
                    </button>
                  </th>
                  {meta.showMarketCap ? (
                    <th className="px-4 py-3 text-right">
                      <button type="button" onClick={() => toggleSort("marketCap")} className="inline-flex items-center">
                        Market Cap
                        <SortHint active={sortKey === "marketCap"} direction={sortDir} />
                      </button>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {visibleRows.map((tick) => (
                  <tr key={tick.symbol} className="text-xs transition hover:bg-emerald-500/[0.04]">
                    {meta.showRank ? (
                      <td className="px-4 py-3 text-right font-black tabular-nums text-slate-400 dark:text-zinc-500">
                        {tick.rank || "—"}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <Link
                        href={`/market/company/${encodeURIComponent(tick.symbol)}`}
                        className="font-black text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
                      >
                        {tick.symbol}
                      </Link>
                    </td>
                    <td className="max-w-48 truncate px-3 py-3 font-medium text-slate-600 dark:text-zinc-400">
                      {tick.companyName ?? "—"}
                    </td>
                    {meta.showSector ? (
                      <td className="px-3 py-3 font-medium text-slate-600 dark:text-zinc-400">{tick.sector ?? "—"}</td>
                    ) : null}
                    <td className="px-3 py-3 text-right font-bold tabular-nums">
                      रु {tick.ltpNpr.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-black tabular-nums ${(tick.changePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {formatChangePct(tick.changePct)}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-semibold tabular-nums ${(tick.changeNpr ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                    >
                      {formatChangeAmount(tick.changeNpr)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">
                      {tick.volume?.toLocaleString("en-IN") ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">
                      {formatCompactNpr(tick.turnoverNpr)}
                    </td>
                    {meta.showMarketCap ? (
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">
                        {tick.marketCap != null && Number.isFinite(tick.marketCap)
                          ? tick.marketCap.toLocaleString("en-IN", { maximumFractionDigits: 0 })
                          : "—"}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-200/70 dark:divide-white/[0.06] lg:hidden">
            {visibleRows.map((tick) => (
              <Link
                key={tick.symbol}
                href={`/market/company/${encodeURIComponent(tick.symbol)}`}
                className="flex items-center gap-3 px-3 py-3.5 transition active:bg-emerald-500/[0.06]"
              >
                {meta.showRank ? (
                  <span className="w-7 shrink-0 text-center text-[10px] font-black tabular-nums text-slate-400 dark:text-zinc-500">
                    #{tick.rank || "—"}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-950 dark:text-white">{tick.symbol}</p>
                    {meta.showSector && tick.sector ? (
                      <span className="truncate rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-zinc-400">
                        {tick.sector}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[11px] font-medium text-slate-500 dark:text-zinc-500">
                    {tick.companyName ?? "—"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-semibold tabular-nums text-slate-500 dark:text-zinc-500">
                    <span>Vol {tick.volume?.toLocaleString("en-IN") ?? "—"}</span>
                    <span>{formatCompactNpr(tick.turnoverNpr)}</span>
                    {meta.showMarketCap && tick.marketCap != null ? (
                      <span>Mkt {tick.marketCap.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black tabular-nums text-slate-950 dark:text-white">
                    रु {tick.ltpNpr.toLocaleString("en-IN")}
                  </p>
                  <p
                    className={`text-xs font-black tabular-nums ${(tick.changePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                  >
                    {formatChangePct(tick.changePct)}
                  </p>
                  <p
                    className={`text-[10px] font-semibold tabular-nums ${(tick.changeNpr ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                  >
                    {formatChangeAmount(tick.changeNpr)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-zinc-700" aria-hidden />
              </Link>
            ))}
          </div>

          {!filtered.length ? (
            <p className="p-10 text-center text-xs font-semibold text-slate-500">
              {categoryRows.length
                ? "No companies match your market index, sector, or search filters."
                : "Waiting for live quotes from the NEPSE feed."}
            </p>
          ) : null}

          {visibleCount < filtered.length ? (
            <div ref={sentinelRef} className="grid place-items-center py-4 text-[10px] font-bold text-slate-400 dark:text-zinc-600">
              Loading more…
            </div>
          ) : filtered.length > PAGE_SIZE ? (
            <p className="py-4 text-center text-[10px] font-bold text-slate-400 dark:text-zinc-600">
              Showing all {filtered.length.toLocaleString("en-IN")} companies
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
