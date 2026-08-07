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
import { collectSectors, sortNepseTicks } from "@/lib/market/nepse-breadth";
import { getMarketIndexOption } from "@/lib/market/nepse-market-indices";
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
  { key: "changeNpr", label: "Change" },
  { key: "changePct", label: "Change %" },
  { key: "volume", label: "Volume" },
  { key: "turnoverNpr", label: "Turnover" },
  { key: "marketCap", label: "Market Cap" },
];

type IndexCompositionResponse = {
  indexKey: string;
  indexName: string;
  companyCount: number;
  symbols: string[];
  totalMarketCapNpr: number | null;
  lastUpdated: string | null;
  membershipSource: string;
};

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

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY <= 0 && !refreshing) {
        touchStartY.current = event.touches[0]?.clientY ?? 0;
        pulling.current = true;
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!pulling.current || touchStartY.current <= 0) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const diff = currentY - touchStartY.current;
      if (diff > 0 && window.scrollY <= 0) {
        setPullDistance(Math.min(diff * 0.45, 72));
      }
    };
    const onTouchEnd = () => {
      setPullDistance((distance) => {
        if (distance >= 52) onRefresh();
        return 0;
      });
      touchStartY.current = 0;
      pulling.current = false;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, refreshing]);

  return pullDistance;
}

export function NepseIndexDetailPage({ indexKey }: { indexKey: string }) {
  const option = getMarketIndexOption(indexKey);
  const { snapshot, status, error, reload } = useRealtimeMarket();

  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [sortKey, setSortKey] = useState<NepseTableSortKey>("turnoverNpr");
  const [sortDir, setSortDir] = useState<NepseSortDirection>("desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [membership, setMembership] = useState<Set<string> | null>(null);
  const [meta, setMeta] = useState<IndexCompositionResponse | null>(null);
  const [indexLoading, setIndexLoading] = useState(true);
  const [indexError, setIndexError] = useState<string | null>(null);

  const pullDistance = usePullToRefresh(reload, status === "loading");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadComposition = useCallback(async () => {
    setIndexLoading(true);
    setIndexError(null);
    try {
      const response = await fetch(`/api/market/nepse/index-composition?index=${encodeURIComponent(indexKey)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as IndexCompositionResponse;
      setMeta(payload);
      setMembership(new Set((payload.symbols ?? []).map((symbol) => symbol.toUpperCase())));
    } catch (err) {
      setMembership(new Set());
      setMeta(null);
      setIndexError(err instanceof Error ? err.message : "Failed to load index membership");
    } finally {
      setIndexLoading(false);
    }
  }, [indexKey]);

  useEffect(() => {
    void loadComposition();
  }, [loadComposition]);

  const refreshAll = useCallback(() => {
    reload();
    void loadComposition();
  }, [loadComposition, reload]);

  const ticks = useMemo(() => Object.values(snapshot?.nepseBySymbol ?? {}), [snapshot?.nepseBySymbol]);

  const indexRows = useMemo(() => {
    if (!membership) return [];
    // Prefer live quotes for members; include master-only shells when quote is missing.
    const bySymbol = new Map(ticks.map((tick) => [tick.symbol.toUpperCase(), tick]));
    const rows: NepseSecurityTick[] = [];
    for (const symbol of membership) {
      const live = bySymbol.get(symbol);
      if (live) {
        rows.push(live);
        continue;
      }
      rows.push({
        symbol,
        companyName: symbol,
        ltpNpr: 0,
      });
    }
    return rows;
  }, [membership, ticks]);

  const sectors = useMemo(() => collectSectors(indexRows), [indexRows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = indexRows;
    if (sectorFilter) {
      list = list.filter((tick) => (tick.sector ?? "").trim() === sectorFilter);
    }
    if (needle) {
      list = list.filter((tick) => `${tick.symbol} ${tick.companyName ?? ""}`.toLowerCase().includes(needle));
    }
    return sortNepseTicks(list, sortKey, sortDir);
  }, [indexRows, query, sectorFilter, sortDir, sortKey]);

  const visibleRows = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, sectorFilter, sortDir, sortKey, indexKey]);

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

  const displayName = meta?.indexName ?? option?.displayName ?? indexKey;
  const companyCount = meta?.companyCount ?? membership?.size ?? 0;
  const lastUpdated = meta?.lastUpdated ?? snapshot?.fetchedAt ?? null;
  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  let totalMarketCap: number | null = null;
  {
    let sum = 0;
    let any = false;
    for (const tick of filtered) {
      if (tick.marketCap != null && Number.isFinite(tick.marketCap) && tick.marketCap > 0) {
        sum += tick.marketCap;
        any = true;
      }
    }
    totalMarketCap = any ? sum : meta?.totalMarketCapNpr ?? null;
  }

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
              href="/market/market-indices"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
              aria-label="Back to Index Explorer"
            >
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
                FIRE Nepal · Index Explorer
              </p>
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">{displayName}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
            aria-label="Refresh index companies"
          >
            <RefreshCw size={15} className={status === "loading" || indexLoading ? "animate-spin" : ""} />
          </button>
        </header>

        <section className="relative overflow-hidden rounded-[1.75rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_8%_0%,rgba(52,211,153,0.22),transparent_34%),linear-gradient(145deg,#063126_0%,#071b17_52%,#040b0a_100%)] p-4 text-white shadow-[0_32px_90px_-40px_rgba(4,120,87,0.65)] sm:p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/55">Official index composition</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-lg font-black tracking-tight text-emerald-50 sm:text-xl">{displayName}</p>
              <p className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">{companyCount.toLocaleString("en-IN")}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-100/70">
                {indexLoading
                  ? "Loading official membership…"
                  : filtered.length === indexRows.length
                    ? "companies in this index"
                    : `${filtered.length.toLocaleString("en-IN")} of ${indexRows.length.toLocaleString("en-IN")} companies shown`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100/45">Total market cap</p>
              <p className="mt-1 text-lg font-black tabular-nums text-emerald-50">
                {totalMarketCap != null ? formatCompactNpr(totalMarketCap) : "—"}
              </p>
              <p className="mt-2 text-[10px] font-semibold text-emerald-100/45">Last updated {lastUpdatedLabel}</p>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-xs font-medium leading-relaxed text-emerald-50/60">
            Companies belonging to this official NEPSE index. Membership is driven by the Company Master sync — never a hardcoded list.
          </p>
        </section>

        {(error || indexError) && (
          <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-300/10 dark:text-amber-200">
            {error ?? indexError}
          </p>
        )}

        <section className={`${card} mt-4 p-3 sm:p-4`}>
          <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search symbol or company"
                className={`${inputClass} pl-9`}
                aria-label="Search companies"
              />
            </label>
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
              {SORT_OPTIONS.flatMap((optionRow) => [
                <option key={`${optionRow.key}:desc`} value={`${optionRow.key}:desc`}>
                  {optionRow.label} · High → Low
                </option>,
                <option key={`${optionRow.key}:asc`} value={`${optionRow.key}:asc`}>
                  {optionRow.label} · Low → High
                </option>,
              ])}
            </select>
          </div>
          <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            {filtered.length.toLocaleString("en-IN")} companies · source {meta?.membershipSource ?? "—"}
          </p>
        </section>

        <section className={`${card} mt-4 hidden overflow-hidden sm:block`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-500">
                <tr>
                  {(
                    [
                      ["symbol", "Symbol"],
                      ["companyName", "Company"],
                      ["ltpNpr", "Last Price"],
                      ["changeNpr", "Change"],
                      ["changePct", "Change %"],
                      ["volume", "Volume"],
                      ["turnoverNpr", "Turnover"],
                      ["marketCap", "Market Cap"],
                    ] as const
                  ).map(([key, label]) => (
                    <th key={key} className={`px-3 py-3 ${key === "symbol" || key === "companyName" ? "text-left" : "text-right"}`}>
                      <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center font-black">
                        {label}
                        <SortHint active={sortKey === key} direction={sortDir} />
                      </button>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {visibleRows.map((tick) => {
                  const positive = (tick.changePct ?? 0) >= 0;
                  return (
                    <tr key={tick.symbol} className="text-xs transition hover:bg-emerald-500/[0.04]">
                      <td className="px-3 py-3">
                        <Link
                          href={`/market/company/${encodeURIComponent(tick.symbol)}`}
                          className="font-black text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300"
                        >
                          {tick.symbol}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/market/company/${encodeURIComponent(tick.symbol)}`}
                          className="block max-w-56 truncate font-medium text-slate-600 hover:text-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-300"
                        >
                          {tick.companyName ?? tick.symbol}
                        </Link>
                        {tick.sector ? (
                          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400 dark:text-zinc-600">{tick.sector}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {tick.ltpNpr > 0 ? `रु ${tick.ltpNpr.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-black tabular-nums ${
                          positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatChangeAmount(tick.changeNpr)}
                      </td>
                      <td
                        className={`px-3 py-3 text-right font-black tabular-nums ${
                          positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {formatChangePct(tick.changePct)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">
                        {tick.volume?.toLocaleString("en-IN") ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">
                        {formatCompactNpr(tick.turnoverNpr)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">
                        {tick.marketCap != null ? formatCompactNpr(tick.marketCap) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/market/company/${encodeURIComponent(tick.symbol)}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
                          aria-label={`Open ${tick.symbol} details`}
                        >
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!indexLoading && !visibleRows.length ? (
            <p className="p-10 text-center text-xs font-semibold text-slate-500">
              No companies match this filter for {displayName}.
            </p>
          ) : null}

          <div ref={sentinelRef} className="h-8" aria-hidden />
          {visibleCount < filtered.length ? (
            <p className="border-t border-slate-100 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:border-white/[0.06]">
              Showing {visibleRows.length} of {filtered.length} · scroll for more
            </p>
          ) : null}
        </section>

        {/* Mobile card list */}
        <section className="mt-4 space-y-2 sm:hidden">
          {visibleRows.map((tick) => {
            const positive = (tick.changePct ?? 0) >= 0;
            return (
              <Link
                key={`m-${tick.symbol}`}
                href={`/market/company/${encodeURIComponent(tick.symbol)}`}
                className={`${card} block p-3.5 transition active:scale-[0.99]`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black tracking-tight">{tick.symbol}</p>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 dark:text-zinc-500">
                      {tick.companyName ?? tick.symbol}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black tabular-nums">
                      {tick.ltpNpr > 0 ? `रु ${tick.ltpNpr.toLocaleString("en-IN")}` : "—"}
                    </p>
                    <p
                      className={`mt-0.5 text-[11px] font-black tabular-nums ${
                        positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatChangePct(tick.changePct)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-500 dark:text-zinc-500">
                  <div>
                    <p className="uppercase tracking-wider text-slate-400">Change</p>
                    <p className="mt-0.5 tabular-nums text-slate-700 dark:text-zinc-300">{formatChangeAmount(tick.changeNpr)}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider text-slate-400">Volume</p>
                    <p className="mt-0.5 tabular-nums text-slate-700 dark:text-zinc-300">
                      {tick.volume?.toLocaleString("en-IN") ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wider text-slate-400">Turnover</p>
                    <p className="mt-0.5 tabular-nums text-slate-700 dark:text-zinc-300">{formatCompactNpr(tick.turnoverNpr)}</p>
                  </div>
                </div>
                {tick.marketCap != null ? (
                  <p className="mt-2 text-[10px] font-semibold text-slate-400">
                    Mkt cap {formatCompactNpr(tick.marketCap)}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
