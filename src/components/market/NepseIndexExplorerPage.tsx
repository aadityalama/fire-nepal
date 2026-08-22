"use client";

import {
  Activity,
  ArrowLeft,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Minus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNepseIndexExplorer } from "@/hooks/useNepseIndexExplorer";
import type { IndexExplorerCard, IndexExplorerTrend } from "@/types/market/nepse-index-explorer";

const card =
  "rounded-[1.5rem] border border-slate-200/80 bg-white/88 shadow-[0_22px_70px_-44px_rgba(5,46,34,0.32)] backdrop-blur-2xl dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-[0_22px_70px_-44px_rgba(0,0,0,0.9)]";

function formatIndexValue(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatChange(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChangePct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatUpdated(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    // Date-only EOD rows
    return iso.slice(0, 10);
  }
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TrendIcon({ trend }: { trend: IndexExplorerTrend }) {
  if (trend === "up") return <ArrowUpRight className="h-4 w-4" aria-hidden />;
  if (trend === "down") return <ArrowDownRight className="h-4 w-4" aria-hidden />;
  if (trend === "flat") return <Minus className="h-4 w-4" aria-hidden />;
  return <Activity className="h-4 w-4 opacity-50" aria-hidden />;
}

function trendTone(trend: IndexExplorerTrend): string {
  if (trend === "up") return "text-emerald-600 dark:text-emerald-400";
  if (trend === "down") return "text-rose-600 dark:text-rose-400";
  return "text-slate-500 dark:text-zinc-400";
}

function usePullToRefresh(onRefresh: () => void, refreshing: boolean) {
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const pulling = useRef(false);

  const onTouchStart = useCallback(
    (event: TouchEvent) => {
      if (window.scrollY <= 0 && !refreshing) {
        touchStartY.current = event.touches[0]?.clientY ?? 0;
        pulling.current = true;
      }
    },
    [refreshing],
  );

  const onTouchMove = useCallback(() => {
    /* distance handled below via shared state in move listener with clientY */
  }, []);

  useEffect(() => {
    const handleStart = (event: TouchEvent) => onTouchStart(event);
    const handleMove = (event: TouchEvent) => {
      if (!pulling.current || touchStartY.current <= 0) return;
      const currentY = event.touches[0]?.clientY ?? 0;
      const diff = currentY - touchStartY.current;
      if (diff > 0 && window.scrollY <= 0) {
        setPullDistance(Math.min(diff * 0.45, 72));
      }
    };
    const handleEnd = () => {
      setPullDistance((distance) => {
        if (distance >= 52) onRefresh();
        return 0;
      });
      touchStartY.current = 0;
      pulling.current = false;
    };
    window.addEventListener("touchstart", handleStart, { passive: true });
    window.addEventListener("touchmove", handleMove, { passive: true });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("touchstart", handleStart);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [onRefresh, onTouchMove, onTouchStart]);

  return pullDistance;
}

function IndexCard({ index }: { index: IndexExplorerCard }) {
  const tone = trendTone(index.trend);
  return (
    <Link
      href={`/market/indices/${encodeURIComponent(index.indexKey)}`}
      className={`${card} group relative block overflow-hidden p-4 transition duration-300 hover:-translate-y-1 hover:border-emerald-300/60 hover:shadow-[0_28px_80px_-42px_rgba(4,120,87,0.55)] dark:hover:border-emerald-400/25`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.12),transparent_42%)] opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700/80 dark:text-emerald-400/80">
            {index.displayName}
          </p>
          <p className="mt-2 text-2xl font-black tabular-nums tracking-tight text-slate-950 dark:text-white sm:text-[1.7rem]">
            {formatIndexValue(index.value)}
          </p>
        </div>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-white/70 ${tone} dark:border-white/[0.08] dark:bg-white/[0.04]`}
          aria-label={`Trend ${index.trend}`}
        >
          <TrendIcon trend={index.trend} />
        </span>
      </div>

      <div className={`relative mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm font-black tabular-nums ${tone}`}>
        <span>{formatChange(index.change)}</span>
        <span>{formatChangePct(index.changePct)}</span>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/[0.06] dark:text-zinc-500">
        <span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-slate-600 dark:text-zinc-400">
          <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <span className="font-black tabular-nums text-slate-900 dark:text-zinc-200">
            {index.companyCount.toLocaleString("en-IN")}
          </span>
          companies
        </span>
        <span className="normal-case tracking-normal">Updated {formatUpdated(index.lastUpdated)}</span>
      </div>

      {index.valueSource === "sector_pulse" ? (
        <p className="relative mt-2 text-[9px] font-semibold text-slate-400 dark:text-zinc-600">
          Official level unpublished — showing live sector pulse
        </p>
      ) : null}
    </Link>
  );
}

export function NepseIndexExplorerPage() {
  const { data, loaded, error, refreshing, reload } = useNepseIndexExplorer();
  const pullDistance = usePullToRefresh(() => {
    void reload();
  }, refreshing);

  const indices = data?.indices ?? [];
  const totalCompanies = indices.reduce((sum, row) => sum + row.companyCount, 0);
  const advancing = indices.filter((row) => row.trend === "up").length;
  const declining = indices.filter((row) => row.trend === "down").length;

  return (
    <main className="min-h-screen bg-[#f4f8f6] text-slate-950 dark:bg-[#030a08] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(16,185,129,0.14),transparent_28rem),radial-gradient(circle_at_92%_18%,rgba(20,184,166,0.09),transparent_24rem)]" />

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

      <div className="relative mx-auto w-full max-w-7xl px-3 pb-28 pt-4 sm:px-5 lg:px-8">
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
                FIRE Nepal · Index Explorer
              </p>
              <h1 className="truncate text-xl font-black tracking-tight sm:text-2xl">Market Indices</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void reload()}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300"
            aria-label="Refresh indices"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          </button>
        </header>

        <section className="relative mb-5 overflow-hidden rounded-[1.75rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_8%_0%,rgba(52,211,153,0.22),transparent_34%),linear-gradient(145deg,#063126_0%,#071b17_52%,#040b0a_100%)] p-5 text-white shadow-[0_32px_90px_-40px_rgba(4,120,87,0.65)] sm:p-7">
          <div className="pointer-events-none absolute -right-8 top-0 h-40 w-40 rounded-full bg-emerald-400/10 blur-2xl" />
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/55">Official NEPSE benchmarks</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Index Explorer</h2>
          <p className="mt-2 max-w-2xl text-xs font-medium leading-relaxed text-emerald-50/65">
            Tap any index to open its official company list. Membership updates automatically when the Company Master sync refreshes listings and sectors from NEPSE.
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-lg">
            {[
              ["Indices", indices.length || 17],
              ["Advancing", advancing],
              ["Declining", declining],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 backdrop-blur">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/45">{label}</p>
                <p className="mt-1 text-lg font-black tabular-nums">{Number(value).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-semibold text-emerald-100/45">
            Constituent universe · {totalCompanies.toLocaleString("en-IN")} membership rows · last board{" "}
            {formatUpdated(data?.loadedAt ?? null)}
          </p>
        </section>

        {error ? (
          <p className="mb-4 rounded-xl border border-amber-300/30 bg-amber-50 p-3 text-xs font-semibold text-amber-900 dark:bg-amber-300/10 dark:text-amber-200">
            {error}
          </p>
        ) : null}

        {!loaded ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`${card} h-40 animate-pulse bg-emerald-50/40 dark:bg-white/[0.03]`} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {indices.map((index, i) => (
              <div
                key={index.indexKey}
                className="translate-y-0 opacity-100 transition duration-500"
                style={{ transitionDelay: `${Math.min(i, 12) * 35}ms` }}
              >
                <IndexCard index={index} />
              </div>
            ))}
          </div>
        )}

        {loaded && !indices.length ? (
          <p className={`${card} mt-4 p-10 text-center text-sm font-semibold text-slate-500`}>
            Official index board is warming up. Pull to refresh in a moment.
          </p>
        ) : null}
      </div>
    </main>
  );
}
