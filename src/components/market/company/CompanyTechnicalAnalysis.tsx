"use client";

import { formatFundamentalValue } from "@/lib/market/nepse-fundamentals-format";
import {
  buildTechnicalAnalysis,
  signalClass,
  stanceClass,
} from "@/lib/market/nepse-technical-summary";
import type { Candle } from "@/lib/market/technical-indicators";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import { useMemo } from "react";

const eyebrow = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500";

export function CompanyTechnicalAnalysis({ candles }: { candles: Candle[] }) {
  const analysis = useMemo(() => buildTechnicalAnalysis(candles), [candles]);

  return (
    <div className="space-y-4" data-testid="company-technical-analysis">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025] sm:col-span-2 lg:col-span-1">
          <p className={eyebrow}>Technical Summary</p>
          <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${stanceClass(analysis.stance)}`}>
            {analysis.stance}
          </p>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">{analysis.stanceDetail}</p>
          {analysis.stance !== DATA_UNAVAILABLE ? (
            <p className="mt-2 text-[10px] font-bold text-slate-500 dark:text-zinc-500">
              {analysis.bullish} bullish · {analysis.bearish} bearish · {analysis.neutral} neutral
            </p>
          ) : null}
        </div>

        {[
          ["Open", analysis.ohlcLatest?.open ?? null],
          ["High", analysis.ohlcLatest?.high ?? null],
          ["Low", analysis.ohlcLatest?.low ?? null],
          ["Close", analysis.ohlcLatest?.close ?? null],
          ["Volume", analysis.ohlcLatest?.volume ?? null],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
            <p className={eyebrow}>{label as string}</p>
            <p className="mt-2 text-sm font-black tabular-nums text-slate-950 dark:text-white">
              {label === "Volume"
                ? formatFundamentalValue(value as number | null, { style: "shares" })
                : formatFundamentalValue(value as number | null, { style: "npr" })}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="company-tech-indicators">
        {[
          { label: "RSI (14)", value: analysis.rsi, style: "number" as const },
          { label: "MACD Hist", value: analysis.macd?.histogram ?? null, style: "number" as const },
          { label: "EMA (20)", value: analysis.ema20, style: "npr" as const },
          { label: "EMA (50)", value: analysis.ema50, style: "npr" as const },
          { label: "SMA (20)", value: analysis.sma20, style: "npr" as const },
          { label: "BB Upper", value: analysis.bollinger?.upper ?? null, style: "npr" as const },
          { label: "BB Mid", value: analysis.bollinger?.middle ?? null, style: "npr" as const },
          { label: "BB Lower", value: analysis.bollinger?.lower ?? null, style: "npr" as const },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
            <p className={eyebrow}>{item.label}</p>
            <p className="mt-1.5 text-sm font-black tabular-nums">{formatFundamentalValue(item.value, { style: item.style })}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
          <h4 className="text-sm font-black">Pivot Points</h4>
          <dl className="mt-3 space-y-1.5">
            {(analysis.pivots
              ? [
                  ["Resistance 2", analysis.pivots.r2],
                  ["Resistance 1", analysis.pivots.r1],
                  ["Pivot", analysis.pivots.pivot],
                  ["Support 1", analysis.pivots.s1],
                  ["Support 2", analysis.pivots.s2],
                ]
              : [
                  ["Resistance 2", null],
                  ["Resistance 1", null],
                  ["Pivot", null],
                  ["Support 1", null],
                  ["Support 2", null],
                ]
            ).map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-black/20">
                <dt className="font-bold text-slate-500 dark:text-zinc-500">{label as string}</dt>
                <dd className="font-black tabular-nums">{formatFundamentalValue(value as number | null, { style: "npr" })}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
          <h4 className="text-sm font-black">Fibonacci Levels</h4>
          <dl className="mt-3 space-y-1.5">
            {(analysis.fibonacci.length
              ? analysis.fibonacci
              : [
                  { label: "0.0%", value: null as number | null },
                  { label: "23.6%", value: null },
                  { label: "38.2%", value: null },
                  { label: "50.0%", value: null },
                  { label: "61.8%", value: null },
                ]
            ).map((level) => (
              <div key={level.label} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-black/20">
                <dt className="font-bold text-slate-500 dark:text-zinc-500">{level.label}</dt>
                <dd className="font-black tabular-nums">{formatFundamentalValue(level.value, { style: "npr" })}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
          <h4 className="text-sm font-black">Support & Resistance</h4>
          <dl className="mt-3 space-y-1.5">
            {(analysis.supportResistance.length
              ? analysis.supportResistance.slice(0, 8)
              : [{ label: DATA_UNAVAILABLE, value: null as number | null, kind: "pivot" as const }]
            ).map((level) => (
              <div key={`${level.label}-${level.value}`} className="flex items-center justify-between rounded-lg bg-white/80 px-3 py-2 text-xs dark:bg-black/20">
                <dt className="font-bold text-slate-500 dark:text-zinc-500">{level.label}</dt>
                <dd className="font-black tabular-nums">{formatFundamentalValue(level.value, { style: "npr" })}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section>
        <h4 className="mb-2 text-sm font-black">Indicator Signals</h4>
        {analysis.readings.length ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.readings.map((reading) => (
              <div key={reading.name} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/[0.06] dark:bg-white/[0.025]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black">{reading.name}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black capitalize ${signalClass(reading.signal)}`}>
                    {reading.signal}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black tabular-nums">{reading.value === "—" ? DATA_UNAVAILABLE : reading.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-500">{reading.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-28 place-items-center rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/60 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <p className="text-sm font-black text-slate-800 dark:text-zinc-200">{DATA_UNAVAILABLE}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
              RSI, MACD, EMA, SMA and Bollinger require sufficient EOD history.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
