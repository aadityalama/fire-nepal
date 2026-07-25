"use client";

import { ArrowLeft, RefreshCw, Search, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { formatCompactNpr } from "@/lib/market/nepse-hub";
import { useRealtimeMarket } from "@/providers/realtime-provider";

export function NepseWatchlistPage() {
  const { snapshot, status, reload } = useRealtimeMarket();
  const { symbols, toggle, isWatched, syncState, cloudEnabled } = useNepseWatchlist();
  const [query, setQuery] = useState("");

  const ticks = useMemo(() => Object.values(snapshot?.nepseBySymbol ?? {}), [snapshot?.nepseBySymbol]);
  const watched = useMemo(
    () => symbols.map((symbol) => ({ symbol, tick: snapshot?.nepseBySymbol[symbol] })),
    [symbols, snapshot?.nepseBySymbol],
  );
  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return ticks
      .filter((tick) => `${tick.symbol} ${tick.companyName ?? ""}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query, ticks]);

  return (
    <main className="min-h-screen bg-[#f4f8f6] px-3 py-4 text-slate-950 dark:bg-[#030a08] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/market" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300" aria-label="Back to NEPSE Hub">
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">FIRE Nepal · NEPSE Hub</p>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Watchlist</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] font-bold text-slate-400 dark:text-zinc-600 sm:inline">
              {cloudEnabled ? (syncState === "saving" ? "Syncing…" : "Cloud synced") : "Device only"} · {symbols.length}/64
            </span>
            <button type="button" onClick={reload} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300" aria-label="Refresh quotes">
              <RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        <div className="relative mb-4">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Add a company — search NABIL, HDL, SHIVM…"
            aria-label="Search companies to watch"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold text-slate-950 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
          />
          {searchResults.length ? (
            <div className="absolute inset-x-0 top-[3.4rem] z-20 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-[#07110f]">
              {searchResults.map((tick) => (
                <div key={tick.symbol} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs transition hover:bg-emerald-500/10">
                  <Link href={`/market/company/${tick.symbol}`} className="min-w-0 flex-1">
                    <span className="font-black text-slate-950 dark:text-white">{tick.symbol}</span>
                    <span className="ml-2 truncate text-slate-500 dark:text-zinc-500">{tick.companyName}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(tick.symbol)}
                    className={isWatched(tick.symbol) ? "text-amber-400" : "text-slate-300 dark:text-zinc-700"}
                    aria-label={`${isWatched(tick.symbol) ? "Remove" : "Add"} ${tick.symbol}`}
                  >
                    <Star size={16} fill={isWatched(tick.symbol) ? "currentColor" : "none"} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {watched.length ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.035]">
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.05]">
              {watched.map(({ symbol, tick }) => {
                const positive = (tick?.changePct ?? 0) >= 0;
                return (
                  <li key={symbol} className="flex items-center gap-3 px-4 py-3 transition hover:bg-emerald-500/[0.04]">
                    <Link href={`/market/company/${symbol}`} className="min-w-0 flex-1">
                      <p className="text-sm font-black">{symbol}</p>
                      <p className="truncate text-[11px] font-medium text-slate-500 dark:text-zinc-500">
                        {tick?.companyName ?? "Awaiting live quote"}
                      </p>
                    </Link>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black tabular-nums">
                        {tick ? `रु ${tick.ltpNpr.toLocaleString("en-IN")}` : "—"}
                      </p>
                      <p className={`text-[11px] font-black tabular-nums ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {tick?.changePct == null ? "—" : `${positive ? "+" : ""}${tick.changePct.toFixed(2)}%`}
                      </p>
                    </div>
                    <p className="hidden w-24 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-500 dark:text-zinc-500 sm:block">
                      {formatCompactNpr(tick?.turnoverNpr)}
                    </p>
                    <button
                      type="button"
                      onClick={() => toggle(symbol)}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-amber-400 transition hover:bg-amber-400/10"
                      aria-label={`Remove ${symbol} from watchlist`}
                    >
                      <Star size={16} fill="currentColor" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/[0.025]">
            <div>
              <Star className="mx-auto h-7 w-7 text-amber-400" />
              <p className="mt-3 text-sm font-black">Your watchlist is empty</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-500">
                Search above or star companies from any market table.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
