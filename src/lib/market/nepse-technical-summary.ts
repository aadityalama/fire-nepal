import {
  bollingerBands,
  buildIndicatorReadings,
  ema,
  fibonacciLevels,
  macd,
  pivotPoints,
  rsi,
  sma,
  type Candle,
  type IndicatorReading,
  type IndicatorSignal,
} from "@/lib/market/technical-indicators";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";

export type TechnicalStance = "Buy" | "Hold" | "Sell" | typeof DATA_UNAVAILABLE;

export type SupportResistanceLevel = {
  label: string;
  value: number;
  kind: "support" | "resistance" | "pivot";
};

export type TechnicalAnalysisBundle = {
  readings: IndicatorReading[];
  stance: TechnicalStance;
  stanceDetail: string;
  bullish: number;
  bearish: number;
  neutral: number;
  ohlcLatest: {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  } | null;
  rsi: number | null;
  macd: { macd: number; signal: number; histogram: number } | null;
  ema20: number | null;
  ema50: number | null;
  sma20: number | null;
  bollinger: { upper: number; middle: number; lower: number } | null;
  pivots: ReturnType<typeof pivotPoints> | null;
  fibonacci: { label: string; value: number }[];
  supportResistance: SupportResistanceLevel[];
};

function swingLevels(candles: Candle[], lookback = 5): SupportResistanceLevel[] {
  if (candles.length < lookback * 2 + 1) return [];
  const supports: number[] = [];
  const resistances: number[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    let isSwingHigh = true;
    let isSwingLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (candles[i - j].high >= high || candles[i + j].high >= high) isSwingHigh = false;
      if (candles[i - j].low <= low || candles[i + j].low <= low) isSwingLow = false;
    }
    if (isSwingHigh) resistances.push(high);
    if (isSwingLow) supports.push(low);
  }
  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const nearestSupport = [...supports].filter((v) => v < lastClose).sort((a, b) => b - a).slice(0, 2);
  const nearestResistance = [...resistances].filter((v) => v > lastClose).sort((a, b) => a - b).slice(0, 2);
  return [
    ...nearestSupport.map((value, index) => ({ label: `Support ${index + 1}`, value, kind: "support" as const })),
    ...nearestResistance.map((value, index) => ({ label: `Resistance ${index + 1}`, value, kind: "resistance" as const })),
  ];
}

function scoreStance(readings: IndicatorReading[]): {
  stance: TechnicalStance;
  detail: string;
  bullish: number;
  bearish: number;
  neutral: number;
} {
  if (!readings.length) {
    return {
      stance: DATA_UNAVAILABLE,
      detail: "EOD history is required before a technical stance can be computed.",
      bullish: 0,
      bearish: 0,
      neutral: 0,
    };
  }
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;
  for (const reading of readings) {
    if (reading.signal === "bullish") bullish += 1;
    else if (reading.signal === "bearish") bearish += 1;
    else neutral += 1;
  }
  const decisive = bullish + bearish;
  if (decisive < 3) {
    return {
      stance: DATA_UNAVAILABLE,
      detail: "Not enough confirmed indicator signals from available EOD history.",
      bullish,
      bearish,
      neutral,
    };
  }
  if (bullish >= bearish + 2) {
    return {
      stance: "Buy",
      detail: `${bullish} bullish vs ${bearish} bearish signals from real EOD indicators.`,
      bullish,
      bearish,
      neutral,
    };
  }
  if (bearish >= bullish + 2) {
    return {
      stance: "Sell",
      detail: `${bearish} bearish vs ${bullish} bullish signals from real EOD indicators.`,
      bullish,
      bearish,
      neutral,
    };
  }
  return {
    stance: "Hold",
    detail: `Mixed tape — ${bullish} bullish, ${bearish} bearish, ${neutral} neutral.`,
    bullish,
    bearish,
    neutral,
  };
}

/** Build the full technical analysis bundle from real EOD candles only. */
export function buildTechnicalAnalysis(candles: Candle[]): TechnicalAnalysisBundle {
  if (!candles.length) {
    return {
      readings: [],
      stance: DATA_UNAVAILABLE,
      stanceDetail: "No EOD bars available for this symbol in nepse_eod_prices.",
      bullish: 0,
      bearish: 0,
      neutral: 0,
      ohlcLatest: null,
      rsi: null,
      macd: null,
      ema20: null,
      ema50: null,
      sma20: null,
      bollinger: null,
      pivots: null,
      fibonacci: [],
      supportResistance: [],
    };
  }

  const closes = candles.map((c) => c.close);
  const last = candles[candles.length - 1];
  const readings = buildIndicatorReadings(candles);
  const scored = scoreStance(readings);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);
  const pivots = pivotPoints(last);
  const supportResistance: SupportResistanceLevel[] = [
    { label: "Pivot", value: pivots.pivot, kind: "pivot" },
    { label: "R1", value: pivots.r1, kind: "resistance" },
    { label: "R2", value: pivots.r2, kind: "resistance" },
    { label: "S1", value: pivots.s1, kind: "support" },
    { label: "S2", value: pivots.s2, kind: "support" },
    ...swingLevels(candles),
  ];

  return {
    readings,
    stance: scored.stance,
    stanceDetail: scored.detail,
    bullish: scored.bullish,
    bearish: scored.bearish,
    neutral: scored.neutral,
    ohlcLatest: {
      open: last.open,
      high: last.high,
      low: last.low,
      close: last.close,
      volume: last.volume,
    },
    rsi: rsi(closes),
    macd: macd(closes),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    sma20: sma(closes, 20),
    bollinger: bollingerBands(closes),
    pivots,
    fibonacci: fibonacciLevels(rangeHigh, rangeLow),
    supportResistance,
  };
}

export function signalClass(signal: IndicatorSignal): string {
  if (signal === "bullish") {
    return "border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/[0.08] dark:text-emerald-300";
  }
  if (signal === "bearish") {
    return "border-rose-300/60 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/[0.08] dark:text-rose-300";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400";
}

export function stanceClass(stance: TechnicalStance): string {
  if (stance === "Buy") return "border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200";
  if (stance === "Sell") return "border-rose-300/50 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200";
  if (stance === "Hold") return "border-amber-300/50 bg-amber-50 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100";
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300";
}
