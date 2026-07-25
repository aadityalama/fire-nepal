"use client";

import { ArrowLeft, Bot, Building2, ShieldAlert, Star } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { formatCompactNpr } from "@/lib/market/nepse-hub";
import { useRealtimeMarket } from "@/providers/realtime-provider";
import { NepseMarketChart } from "./NepseMarketChart";

const TABS = [
  "Overview",
  "Technical Analysis",
  "Fundamentals",
  "Financials",
  "Corporate Actions",
  "Dividends",
  "Shareholding",
  "News",
  "Peers",
  "AI Analysis",
] as const;

const INDICATORS = [
  "RSI",
  "MACD",
  "EMA",
  "SMA",
  "VWAP",
  "Bollinger Bands",
  "ATR",
  "ADX",
  "CCI",
  "OBV",
  "Ichimoku",
  "SuperTrend",
  "Stochastic",
  "Pivot Points",
  "Fibonacci",
] as const;

export function NepseCompanyPage({ symbol }: { symbol: string }) {
  const { snapshot } = useRealtimeMarket();
  const { isWatched, toggle } = useNepseWatchlist();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const normalized = decodeURIComponent(symbol).toUpperCase();
  const tick = snapshot?.nepseBySymbol[normalized];
  const positive = (tick?.changePct ?? 0) >= 0;

  return (
    <main className="min-h-screen bg-[#f4f8f6] px-3 py-4 text-slate-950 dark:bg-[#030a08] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/market" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.05]" aria-label="Back to NEPSE Hub">
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">{tick?.companyName ?? "NEPSE Company"}</p>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">{normalized}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggle(normalized)}
            className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ${
              isWatched(normalized)
                ? "border-amber-300/50 bg-amber-50 text-amber-700 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-200"
                : "border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300"
            }`}
          >
            <Star size={15} fill={isWatched(normalized) ? "currentColor" : "none"} />
            {isWatched(normalized) ? "Watching" : "Watch"}
          </button>
        </header>

        <section className="rounded-[1.75rem] border border-emerald-400/15 bg-[radial-gradient(circle_at_4%_0%,rgba(52,211,153,0.2),transparent_35%),linear-gradient(145deg,#063126,#06120f)] p-5 text-white sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-bold text-emerald-100/55">Last traded price</p>
              <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">
                {tick ? `रु ${tick.ltpNpr.toLocaleString("en-IN")}` : "—"}
              </p>
              <p className={`mt-2 text-sm font-black ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {tick?.changePct == null ? "Live quote unavailable" : `${positive ? "+" : ""}${tick.changePct.toFixed(2)}% today`}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-right">
              {[
                ["High", tick?.highNpr ? `रु ${tick.highNpr.toLocaleString("en-IN")}` : "—"],
                ["Low", tick?.lowNpr ? `रु ${tick.lowNpr.toLocaleString("en-IN")}` : "—"],
                ["Volume", tick?.volume?.toLocaleString("en-IN") ?? "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-100/45">{label}</p>
                  <p className="mt-1 text-xs font-black tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <nav className="no-scrollbar sticky top-0 z-30 mt-3 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-1 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-[#07110f]/90" aria-label="Company research sections">
          {TABS.map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black transition ${
                tab === item ? "bg-emerald-500 text-white" : "text-slate-500 hover:bg-slate-100 dark:text-zinc-500 dark:hover:bg-white/[0.05]"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mt-4">
          {(tab === "Overview" || tab === "Technical Analysis") && (
            <NepseMarketChart value={tick?.ltpNpr ?? 1_000} changePct={tick?.changePct} />
          )}

          {tab === "Overview" ? (
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.42fr]">
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
                <h2 className="text-base font-black">Market Overview</h2>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Previous Close", tick?.previousCloseNpr ? `रु ${tick.previousCloseNpr.toLocaleString("en-IN")}` : "—"],
                    ["Turnover", formatCompactNpr(tick?.turnoverNpr)],
                    ["Trades", tick?.trades?.toLocaleString("en-IN") ?? "—"],
                    ["Sector", tick?.sector ?? "—"],
                    ["Market Cap", tick?.marketCap?.toLocaleString("en-IN") ?? "—"],
                    ["Range", tick?.intradayRangePct == null ? "—" : `${tick.intradayRangePct.toFixed(2)}%`],
                    ["52W High", "History required"],
                    ["52W Low", "History required"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">{label}</p>
                      <p className="mt-1.5 truncate text-xs font-black">{value}</p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <h2 className="text-base font-black">Risk & Rating</h2>
                </div>
                <p className="mt-5 text-3xl font-black">Not rated</p>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
                  Buy / Hold / Sell and risk scoring remain disabled until audited fundamentals and sufficient OHLC history are available.
                </p>
              </section>
            </div>
          ) : null}

          {tab === "Technical Analysis" ? (
            <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
              <h2 className="text-base font-black">Technical Indicator Engine</h2>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-500">Indicator contracts are ready; calculations require normalized historical OHLCV candles.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {INDICATORS.map((indicator) => (
                  <div key={indicator} className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
                    <p className="text-xs font-black">{indicator}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400 dark:text-zinc-600">Awaiting OHLCV</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tab !== "Overview" && tab !== "Technical Analysis" ? (
            <section className="grid min-h-80 place-items-center rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-white/10 dark:bg-white/[0.025]">
              <div className="max-w-md">
                {tab === "AI Analysis" ? <Bot className="mx-auto h-8 w-8 text-emerald-500" /> : <Building2 className="mx-auto h-8 w-8 text-emerald-500" />}
                <h2 className="mt-3 text-lg font-black">{tab}</h2>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
                  This module is wired for the future audited company-data provider. It will never infer financial statements, ownership, dividends or recommendations from incomplete quotes.
                </p>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
