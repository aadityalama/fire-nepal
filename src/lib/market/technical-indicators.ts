/**
 * Pure technical-indicator math over OHLCV candles.
 *
 * Every function is deterministic and framework-free so the same engine can run against
 * indicative series today and real EOD history once the automated data engine persists it.
 * Functions return `null` when the series is too short for the requested period.
 */

export type Candle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

function last<T>(values: T[]): T | null {
  return values.length ? values[values.length - 1] : null;
}

export function sma(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  const window = values.slice(-period);
  return window.reduce((sum, value) => sum + value, 0) / period;
}

export function emaSeries(values: number[], period: number): number[] {
  if (values.length < period || period <= 0) return [];
  const k = 2 / (period + 1);
  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const out = [seed];
  for (let i = period; i < values.length; i++) {
    out.push(values[i] * k + out[out.length - 1] * (1 - k));
  }
  return out;
}

export function ema(values: number[], period: number): number | null {
  return last(emaSeries(values, period));
}

export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signalPeriod = 9,
): { macd: number; signal: number; histogram: number } | null {
  if (closes.length < slow + signalPeriod) return null;
  const fastSeries = emaSeries(closes, fast);
  const slowSeries = emaSeries(closes, slow);
  const aligned = fastSeries.slice(fastSeries.length - slowSeries.length);
  const macdLine = slowSeries.map((value, index) => aligned[index] - value);
  const signalSeries = emaSeries(macdLine, signalPeriod);
  const macdValue = last(macdLine);
  const signalValue = last(signalSeries);
  if (macdValue == null || signalValue == null) return null;
  return { macd: macdValue, signal: signalValue, histogram: macdValue - signalValue };
}

export function bollingerBands(
  closes: number[],
  period = 20,
  mult = 2,
): { upper: number; middle: number; lower: number } | null {
  const middle = sma(closes, period);
  if (middle == null) return null;
  const window = closes.slice(-period);
  const variance = window.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  return { upper: middle + mult * sd, middle, lower: middle - mult * sd };
}

function trueRanges(candles: Candle[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prevClose = candles[i - 1].close;
    out.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - prevClose),
        Math.abs(current.low - prevClose),
      ),
    );
  }
  return out;
}

export function atr(candles: Candle[], period = 14): number | null {
  const ranges = trueRanges(candles);
  if (ranges.length < period) return null;
  let value = ranges.slice(0, period).reduce((sum, range) => sum + range, 0) / period;
  for (let i = period; i < ranges.length; i++) {
    value = (value * (period - 1) + ranges[i]) / period;
  }
  return value;
}

export function adx(candles: Candle[], period = 14): number | null {
  if (candles.length < period * 2 + 1) return null;
  const plusDm: number[] = [];
  const minusDm: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDm.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDm.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }
  const ranges = trueRanges(candles);
  const smooth = (values: number[]): number[] => {
    const out = [values.slice(0, period).reduce((sum, value) => sum + value, 0)];
    for (let i = period; i < values.length; i++) {
      out.push(out[out.length - 1] - out[out.length - 1] / period + values[i]);
    }
    return out;
  };
  const trSmooth = smooth(ranges);
  const plusSmooth = smooth(plusDm);
  const minusSmooth = smooth(minusDm);
  const dx: number[] = [];
  for (let i = 0; i < trSmooth.length; i++) {
    if (trSmooth[i] === 0) continue;
    const plusDi = (plusSmooth[i] / trSmooth[i]) * 100;
    const minusDi = (minusSmooth[i] / trSmooth[i]) * 100;
    const sum = plusDi + minusDi;
    if (sum === 0) continue;
    dx.push((Math.abs(plusDi - minusDi) / sum) * 100);
  }
  if (dx.length < period) return null;
  let value = dx.slice(0, period).reduce((sum, item) => sum + item, 0) / period;
  for (let i = period; i < dx.length; i++) {
    value = (value * (period - 1) + dx[i]) / period;
  }
  return value;
}

export function cci(candles: Candle[], period = 20): number | null {
  if (candles.length < period) return null;
  const typical = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
  const mean = sma(typical, period);
  if (mean == null) return null;
  const window = typical.slice(-period);
  const meanDeviation = window.reduce((sum, value) => sum + Math.abs(value - mean), 0) / period;
  if (meanDeviation === 0) return 0;
  return (typical[typical.length - 1] - mean) / (0.015 * meanDeviation);
}

export function obv(candles: Candle[]): number | null {
  if (candles.length < 2) return null;
  let value = 0;
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) value += candles[i].volume;
    else if (candles[i].close < candles[i - 1].close) value -= candles[i].volume;
  }
  return value;
}

export function vwap(candles: Candle[]): number | null {
  let priceVolume = 0;
  let totalVolume = 0;
  for (const candle of candles) {
    const typical = (candle.high + candle.low + candle.close) / 3;
    priceVolume += typical * candle.volume;
    totalVolume += candle.volume;
  }
  return totalVolume > 0 ? priceVolume / totalVolume : null;
}

export function stochastic(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3,
): { k: number; d: number } | null {
  if (candles.length < kPeriod + dPeriod - 1) return null;
  const kValues: number[] = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const window = candles.slice(i - kPeriod + 1, i + 1);
    const highest = Math.max(...window.map((candle) => candle.high));
    const lowest = Math.min(...window.map((candle) => candle.low));
    const range = highest - lowest;
    kValues.push(range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100);
  }
  const k = last(kValues);
  const d = sma(kValues, dPeriod);
  if (k == null || d == null) return null;
  return { k, d };
}

export function superTrend(
  candles: Candle[],
  period = 10,
  mult = 3,
): { value: number; direction: "up" | "down" } | null {
  const atrValue = atr(candles, period);
  const latest = last(candles);
  if (atrValue == null || !latest) return null;
  const mid = (latest.high + latest.low) / 2;
  const upper = mid + mult * atrValue;
  const lower = mid - mult * atrValue;
  const direction = latest.close >= mid ? "up" : "down";
  return { value: direction === "up" ? lower : upper, direction };
}

export function ichimoku(
  candles: Candle[],
): { conversion: number; base: number; spanA: number; spanB: number } | null {
  const midpoint = (window: Candle[]): number =>
    (Math.max(...window.map((candle) => candle.high)) + Math.min(...window.map((candle) => candle.low))) / 2;
  if (candles.length < 52) return null;
  const conversion = midpoint(candles.slice(-9));
  const base = midpoint(candles.slice(-26));
  const spanA = (conversion + base) / 2;
  const spanB = midpoint(candles.slice(-52));
  return { conversion, base, spanA, spanB };
}

export function pivotPoints(candle: Candle): {
  pivot: number;
  r1: number;
  r2: number;
  s1: number;
  s2: number;
} {
  const pivot = (candle.high + candle.low + candle.close) / 3;
  return {
    pivot,
    r1: 2 * pivot - candle.low,
    r2: pivot + (candle.high - candle.low),
    s1: 2 * pivot - candle.high,
    s2: pivot - (candle.high - candle.low),
  };
}

export function fibonacciLevels(high: number, low: number): { label: string; value: number }[] {
  const range = high - low;
  return [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map((ratio) => ({
    label: `${(ratio * 100).toFixed(1)}%`,
    value: high - range * ratio,
  }));
}

export type IndicatorSignal = "bullish" | "bearish" | "neutral";

export type IndicatorReading = {
  name: string;
  value: string;
  signal: IndicatorSignal;
  detail: string;
};

/** Full indicator panel for a candle series (order matches the product spec). */
export function buildIndicatorReadings(candles: Candle[]): IndicatorReading[] {
  const closes = candles.map((candle) => candle.close);
  const price = last(closes) ?? 0;
  const readings: IndicatorReading[] = [];

  const rsiValue = rsi(closes);
  readings.push({
    name: "RSI (14)",
    value: rsiValue == null ? "—" : rsiValue.toFixed(1),
    signal: rsiValue == null ? "neutral" : rsiValue >= 70 ? "bearish" : rsiValue <= 30 ? "bullish" : "neutral",
    detail: rsiValue == null ? "Needs more history" : rsiValue >= 70 ? "Overbought" : rsiValue <= 30 ? "Oversold" : "Momentum balanced",
  });

  const macdValue = macd(closes);
  readings.push({
    name: "MACD (12,26,9)",
    value: macdValue == null ? "—" : macdValue.histogram.toFixed(2),
    signal: macdValue == null ? "neutral" : macdValue.histogram > 0 ? "bullish" : macdValue.histogram < 0 ? "bearish" : "neutral",
    detail: macdValue == null ? "Needs more history" : macdValue.histogram > 0 ? "Above signal line" : "Below signal line",
  });

  for (const period of [20, 50] as const) {
    const emaValue = ema(closes, period);
    readings.push({
      name: `EMA (${period})`,
      value: emaValue == null ? "—" : emaValue.toFixed(2),
      signal: emaValue == null ? "neutral" : price > emaValue ? "bullish" : "bearish",
      detail: emaValue == null ? "Needs more history" : price > emaValue ? "Price above average" : "Price below average",
    });
  }

  const smaValue = sma(closes, 20);
  readings.push({
    name: "SMA (20)",
    value: smaValue == null ? "—" : smaValue.toFixed(2),
    signal: smaValue == null ? "neutral" : price > smaValue ? "bullish" : "bearish",
    detail: smaValue == null ? "Needs more history" : price > smaValue ? "Price above average" : "Price below average",
  });

  const vwapValue = vwap(candles);
  readings.push({
    name: "VWAP",
    value: vwapValue == null ? "—" : vwapValue.toFixed(2),
    signal: vwapValue == null ? "neutral" : price > vwapValue ? "bullish" : "bearish",
    detail: vwapValue == null ? "No volume data" : price > vwapValue ? "Trading above VWAP" : "Trading below VWAP",
  });

  const bb = bollingerBands(closes);
  readings.push({
    name: "Bollinger (20,2)",
    value: bb == null ? "—" : `${bb.lower.toFixed(0)} – ${bb.upper.toFixed(0)}`,
    signal: bb == null ? "neutral" : price >= bb.upper ? "bearish" : price <= bb.lower ? "bullish" : "neutral",
    detail: bb == null ? "Needs more history" : price >= bb.upper ? "At upper band" : price <= bb.lower ? "At lower band" : "Inside bands",
  });

  const atrValue = atr(candles);
  readings.push({
    name: "ATR (14)",
    value: atrValue == null ? "—" : atrValue.toFixed(2),
    signal: "neutral",
    detail: atrValue == null ? "Needs more history" : "Average daily range",
  });

  const adxValue = adx(candles);
  readings.push({
    name: "ADX (14)",
    value: adxValue == null ? "—" : adxValue.toFixed(1),
    signal: "neutral",
    detail: adxValue == null ? "Needs more history" : adxValue >= 25 ? "Trending market" : "Weak trend",
  });

  const cciValue = cci(candles);
  readings.push({
    name: "CCI (20)",
    value: cciValue == null ? "—" : cciValue.toFixed(1),
    signal: cciValue == null ? "neutral" : cciValue > 100 ? "bearish" : cciValue < -100 ? "bullish" : "neutral",
    detail: cciValue == null ? "Needs more history" : cciValue > 100 ? "Stretched above cycle" : cciValue < -100 ? "Stretched below cycle" : "Inside normal cycle",
  });

  const obvValue = obv(candles);
  readings.push({
    name: "OBV",
    value: obvValue == null ? "—" : Math.round(obvValue).toLocaleString("en-IN"),
    signal: obvValue == null ? "neutral" : obvValue > 0 ? "bullish" : obvValue < 0 ? "bearish" : "neutral",
    detail: obvValue == null ? "No volume data" : obvValue > 0 ? "Accumulation bias" : "Distribution bias",
  });

  const ichimokuValue = ichimoku(candles);
  readings.push({
    name: "Ichimoku",
    value: ichimokuValue == null ? "—" : ichimokuValue.base.toFixed(2),
    signal:
      ichimokuValue == null
        ? "neutral"
        : price > Math.max(ichimokuValue.spanA, ichimokuValue.spanB)
          ? "bullish"
          : price < Math.min(ichimokuValue.spanA, ichimokuValue.spanB)
            ? "bearish"
            : "neutral",
    detail: ichimokuValue == null ? "Needs 52 sessions" : "Cloud position vs price",
  });

  const st = superTrend(candles);
  readings.push({
    name: "SuperTrend (10,3)",
    value: st == null ? "—" : st.value.toFixed(2),
    signal: st == null ? "neutral" : st.direction === "up" ? "bullish" : "bearish",
    detail: st == null ? "Needs more history" : st.direction === "up" ? "Uptrend support" : "Downtrend resistance",
  });

  const stoch = stochastic(candles);
  readings.push({
    name: "Stochastic (14,3)",
    value: stoch == null ? "—" : `${stoch.k.toFixed(1)} / ${stoch.d.toFixed(1)}`,
    signal: stoch == null ? "neutral" : stoch.k >= 80 ? "bearish" : stoch.k <= 20 ? "bullish" : "neutral",
    detail: stoch == null ? "Needs more history" : stoch.k >= 80 ? "Overbought zone" : stoch.k <= 20 ? "Oversold zone" : "Mid-range",
  });

  return readings;
}
