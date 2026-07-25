"use client";

import { ArrowLeft, BellPlus, Bot, Building2, ShieldAlert, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useNepseAlerts } from "@/hooks/useNepseAlerts";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { buildIndexSeries, formatCompactNpr } from "@/lib/market/nepse-hub";
import {
  buildIndicatorReadings,
  fibonacciLevels,
  pivotPoints,
  type Candle,
  type IndicatorSignal,
} from "@/lib/market/technical-indicators";
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

const FUNDAMENTAL_FIELDS = [
  "EPS",
  "P/E Ratio",
  "P/B Ratio",
  "ROE",
  "ROA",
  "Book Value",
  "Revenue",
  "Net Profit",
  "Operating Cash Flow",
  "Quarterly Reports",
] as const;

function signalClasses(signal: IndicatorSignal): string {
  if (signal === "bullish") {
    return "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08] dark:text-emerald-300";
  }
  if (signal === "bearish") {
    return "border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/[0.08] dark:text-rose-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400";
}

function AlertComposer({ symbol, ltpNpr }: { symbol: string; ltpNpr?: number }) {
  const { alerts, addAlert, removeAlert } = useNepseAlerts();
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [price, setPrice] = useState("");
  const mine = alerts.filter((alert) => alert.symbol === symbol);

  return (
    <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
      <div className="flex items-center gap-2">
        <BellPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h2 className="text-base font-black">Price Alerts</h2>
      </div>
      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
        Stored on this device and checked against every live refresh.
      </p>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const target = Number(price);
          if (Number.isFinite(target) && target > 0) {
            addAlert(symbol, direction, target);
            setPrice("");
          }
        }}
      >
        <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-black/25" role="group" aria-label="Alert direction">
          {(["above", "below"] as const).map((option) => (
            <button
              type="button"
              key={option}
              onClick={() => setDirection(option)}
              aria-pressed={direction === option}
              className={`rounded-[0.65rem] px-3 py-1.5 text-[10px] font-black capitalize transition ${
                direction === option
                  ? "bg-white text-slate-950 shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-slate-500 dark:text-zinc-500"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          placeholder={ltpNpr ? `e.g. ${Math.round(ltpNpr)}` : "Target NPR"}
          aria-label="Alert target price in NPR"
          className="fn-mobile-numeric-input h-10 w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-emerald-400 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
        />
        <button
          type="submit"
          className="h-10 rounded-xl bg-emerald-500 px-4 text-xs font-black text-white shadow-sm transition hover:brightness-105"
        >
          Add Alert
        </button>
      </form>
      {mine.length ? (
        <ul className="mt-3 space-y-1.5">
          {mine.map((alert) => (
            <li
              key={alert.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-xs dark:border-white/[0.06] dark:bg-white/[0.025]"
            >
              <span className="font-bold text-slate-800 dark:text-zinc-200">
                Notify when price is {alert.direction}{" "}
                <span className="tabular-nums">रु {alert.targetNpr.toLocaleString("en-IN")}</span>
              </span>
              <button
                type="button"
                onClick={() => removeAlert(alert.id)}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-400/10"
                aria-label="Remove alert"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function NepseCompanyPage({ symbol }: { symbol: string }) {
  const { snapshot } = useRealtimeMarket();
  const { isWatched, toggle } = useNepseWatchlist();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const normalized = decodeURIComponent(symbol).toUpperCase();
  const tick = snapshot?.nepseBySymbol[normalized];
  const positive = (tick?.changePct ?? 0) >= 0;

  const candles = useMemo<Candle[]>(
    () =>
      buildIndexSeries(tick?.ltpNpr ?? 1_000, "1Y").map((point) => ({
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.value,
        volume: point.volume,
      })),
    [tick?.ltpNpr],
  );
  const readings = useMemo(() => buildIndicatorReadings(candles), [candles]);
  const pivots = useMemo(() => pivotPoints(candles[candles.length - 1]), [candles]);
  const fib = useMemo(() => {
    const highs = candles.map((candle) => candle.high);
    const lows = candles.map((candle) => candle.low);
    return fibonacciLevels(Math.max(...highs), Math.min(...lows));
  }, [candles]);
  const bullishCount = readings.filter((reading) => reading.signal === "bullish").length;
  const bearishCount = readings.filter((reading) => reading.signal === "bearish").length;

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
                {tick && tick.ltpNpr > 0 ? `रु ${tick.ltpNpr.toLocaleString("en-IN")}` : "—"}
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
              <div className="space-y-4">
                <AlertComposer symbol={normalized} ltpNpr={tick?.ltpNpr} />
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
            </div>
          ) : null}

          {tab === "Technical Analysis" ? (
            <div className="mt-4 space-y-4">
              <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-black">Technical Indicator Engine</h2>
                  <span className="rounded-full border border-amber-300/40 bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:border-amber-300/15 dark:bg-amber-300/[0.07] dark:text-amber-200">
                    Indicative series until EOD history is live
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-500">
                  {bullishCount} bullish · {bearishCount} bearish · {readings.length - bullishCount - bearishCount} neutral signals from a 1-year curve anchored to the live price.
                </p>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {readings.map((reading) => (
                    <div key={reading.name} className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black">{reading.name}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black capitalize ${signalClasses(reading.signal)}`}>
                          {reading.signal}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-black tabular-nums">{reading.value}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-500">{reading.detail}</p>
                    </div>
                  ))}
                </div>
              </section>
              <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
                  <h2 className="text-sm font-black">Pivot Points</h2>
                  <dl className="mt-3 space-y-1.5">
                    {[
                      ["Resistance 2", pivots.r2],
                      ["Resistance 1", pivots.r1],
                      ["Pivot", pivots.pivot],
                      ["Support 1", pivots.s1],
                      ["Support 2", pivots.s2],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-white/[0.03]">
                        <dt className="font-bold text-slate-500 dark:text-zinc-500">{label}</dt>
                        <dd className="font-black tabular-nums">{(value as number).toFixed(2)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
                  <h2 className="text-sm font-black">Fibonacci Retracement</h2>
                  <dl className="mt-3 space-y-1.5">
                    {fib.map((level) => (
                      <div key={level.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-white/[0.03]">
                        <dt className="font-bold text-slate-500 dark:text-zinc-500">{level.label}</dt>
                        <dd className="font-black tabular-nums">{level.value.toFixed(2)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>
            </div>
          ) : null}

          {tab === "Fundamentals" ? (
            <section className="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/[0.08] dark:bg-white/[0.035] sm:p-5">
              <h2 className="text-base font-black">Fundamental Engine</h2>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-zinc-500">
                Ratios populate automatically once the audited company-data provider is connected. Live feed values are shown where available.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/70 p-3 dark:border-emerald-400/15 dark:bg-emerald-400/[0.06]">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Market Cap (feed)</p>
                  <p className="mt-1.5 text-xs font-black tabular-nums">{tick?.marketCap?.toLocaleString("en-IN") ?? "—"}</p>
                </div>
                {FUNDAMENTAL_FIELDS.map((field) => (
                  <div key={field} className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">{field}</p>
                    <p className="mt-1.5 text-[10px] font-bold text-slate-400 dark:text-zinc-600">Provider required</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {tab !== "Overview" && tab !== "Technical Analysis" && tab !== "Fundamentals" ? (
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
