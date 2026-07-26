"use client";

import { ArrowDownWideNarrow, ArrowLeft, RefreshCw, SlidersHorizontal, Star } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { formatCompactNpr } from "@/lib/market/nepse-hub";
import { useRealtimeMarket } from "@/providers/realtime-provider";

const SORT_OPTIONS = [
  { id: "turnover", label: "Turnover" },
  { id: "changeDesc", label: "% Gain" },
  { id: "changeAsc", label: "% Loss" },
  { id: "volume", label: "Volume" },
  { id: "price", label: "Price" },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]["id"];

const inputClass =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-950 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-white";

export function NepseScreenerPage() {
  const { snapshot, status, reload } = useRealtimeMarket();
  const { isWatched, toggle } = useNepseWatchlist();
  const [sector, setSector] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minChange, setMinChange] = useState("");
  const [maxChange, setMaxChange] = useState("");
  const [minVolume, setMinVolume] = useState("");
  const [sort, setSort] = useState<SortId>("turnover");

  const ticks = useMemo(
    () => Object.values(snapshot?.nepseBySymbol ?? {}).filter((tick) => tick.ltpNpr > 0),
    [snapshot?.nepseBySymbol],
  );
  const sectors = useMemo(
    () => [...new Set(ticks.map((tick) => tick.sector).filter((value): value is string => Boolean(value)))].sort(),
    [ticks],
  );

  const rows = useMemo(() => {
    const asNumber = (value: string) => (value.trim() === "" ? null : Number(value));
    const minP = asNumber(minPrice);
    const maxP = asNumber(maxPrice);
    const minC = asNumber(minChange);
    const maxC = asNumber(maxChange);
    const minV = asNumber(minVolume);
    const filtered = ticks.filter((tick) => {
      if (sector !== "all" && tick.sector !== sector) return false;
      if (minP != null && tick.ltpNpr < minP) return false;
      if (maxP != null && tick.ltpNpr > maxP) return false;
      if (minC != null && (tick.changePct ?? 0) < minC) return false;
      if (maxC != null && (tick.changePct ?? 0) > maxC) return false;
      if (minV != null && (tick.volume ?? 0) < minV) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sort === "turnover") sorted.sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0));
    if (sort === "changeDesc") sorted.sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0));
    if (sort === "changeAsc") sorted.sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
    if (sort === "volume") sorted.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
    if (sort === "price") sorted.sort((a, b) => b.ltpNpr - a.ltpNpr);
    return sorted.slice(0, 100);
  }, [ticks, sector, minPrice, maxPrice, minChange, maxChange, minVolume, sort]);

  return (
    <main className="min-h-screen bg-[#f4f8f6] px-3 py-4 text-slate-950 dark:bg-[#030a08] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/market" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300" aria-label="Back to NEPSE Hub">
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">FIRE Nepal · NEPSE Hub</p>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Stock Screener</h1>
            </div>
          </div>
          <button type="button" onClick={reload} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300" aria-label="Refresh quotes">
            <RefreshCw size={15} className={status === "loading" ? "animate-spin" : ""} />
          </button>
        </header>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h2 className="text-sm font-black">Filters</h2>
            <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-zinc-600">{rows.length} matches (top 100 shown)</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <label className="block">
              <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">Sector</span>
              <select value={sector} onChange={(event) => setSector(event.target.value)} className={inputClass}>
                <option value="all">All sectors</option>
                {sectors.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            {[
              ["Min price", minPrice, setMinPrice],
              ["Max price", maxPrice, setMaxPrice],
              ["Min change %", minChange, setMinChange],
              ["Max change %", maxChange, setMaxChange],
              ["Min volume", minVolume, setMinVolume],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">{label as string}</span>
                <input
                  value={value as string}
                  onChange={(event) => (setter as (value: string) => void)(event.target.value)}
                  inputMode="decimal"
                  placeholder="—"
                  className={`fn-mobile-numeric-input ${inputClass}`}
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <ArrowDownWideNarrow className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {SORT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => setSort(option.id)}
                aria-pressed={sort === option.id}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-black transition ${
                  sort === option.id ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-zinc-500"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.035]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-white/[0.07] dark:bg-white/[0.025] dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-3 py-3">Sector</th>
                  <th className="px-3 py-3 text-right">LTP</th>
                  <th className="px-3 py-3 text-right">Change</th>
                  <th className="px-3 py-3 text-right">Volume</th>
                  <th className="px-3 py-3 text-right">Turnover</th>
                  <th className="px-4 py-3 text-right">Watch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {rows.map((tick) => (
                  <tr key={tick.symbol} className="text-xs transition hover:bg-emerald-500/[0.04]">
                    <td className="px-4 py-3">
                      <Link href={`/market/company/${encodeURIComponent(tick.symbol)}`} className="font-black text-slate-950 hover:text-emerald-700 dark:text-white dark:hover:text-emerald-300">{tick.symbol}</Link>
                      <p className="mt-0.5 max-w-48 truncate text-[10px] font-medium text-slate-500 dark:text-zinc-500">{tick.companyName}</p>
                    </td>
                    <td className="px-3 py-3 text-[10px] font-bold text-slate-500 dark:text-zinc-500">{tick.sector ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">रु {tick.ltpNpr.toLocaleString("en-IN")}</td>
                    <td className={`px-3 py-3 text-right font-black tabular-nums ${(tick.changePct ?? 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                      {tick.changePct == null ? "—" : `${tick.changePct >= 0 ? "+" : ""}${tick.changePct.toFixed(2)}%`}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">{tick.volume?.toLocaleString("en-IN") ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-600 dark:text-zinc-300">{formatCompactNpr(tick.turnoverNpr)}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => toggle(tick.symbol)} className={isWatched(tick.symbol) ? "text-amber-400" : "text-slate-300 dark:text-zinc-700"} aria-label={`${isWatched(tick.symbol) ? "Remove" : "Add"} ${tick.symbol}`}>
                        <Star size={16} fill={isWatched(tick.symbol) ? "currentColor" : "none"} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length ? <p className="p-10 text-center text-xs font-semibold text-slate-500">No companies match the current filters.</p> : null}
        </div>
      </div>
    </main>
  );
}
