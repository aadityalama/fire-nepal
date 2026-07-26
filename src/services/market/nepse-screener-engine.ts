import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { computePb, computePe } from "@/lib/market/nepse-fundamentals-format";
import { ema, macd, rsi, sma } from "@/lib/market/technical-indicators";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { getCachedNepseYonepseBoard } from "@/services/market/nepse-yonepse";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type { ScreenerMaTrend, ScreenerRow } from "@/types/market/nepse-professional-terminal";

const cache = createMemoryTtlCache();
const SCREENER_TTL_MS = 5 * 60_000;

type ValuationRow = {
  symbol: string;
  eps: number | null;
  pe: number | null;
  pb: number | null;
  book_value_npr: number | null;
  roe_pct: number | null;
};

type DividendRow = { symbol: string; cash_pct: number | null; bonus_pct: number | null; total: number | null };

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

async function loadValuations(): Promise<Map<string, ValuationRow>> {
  const sb = createMarketDataServiceClient();
  const map = new Map<string, ValuationRow>();
  if (!sb) return map;
  const { data } = await sb.from("nepse_company_valuation").select("symbol, eps, pe, pb, book_value_npr, roe_pct");
  for (const row of (data as Record<string, unknown>[] | null) ?? []) {
    const symbol = typeof row.symbol === "string" ? row.symbol.toUpperCase() : null;
    if (!symbol) continue;
    map.set(symbol, {
      symbol,
      eps: num(row.eps),
      pe: num(row.pe),
      pb: num(row.pb),
      book_value_npr: num(row.book_value_npr),
      roe_pct: num(row.roe_pct),
    });
  }
  return map;
}

async function loadLatestDividends(): Promise<Map<string, DividendRow>> {
  const sb = createMarketDataServiceClient();
  const map = new Map<string, DividendRow>();
  if (!sb) return map;
  // Latest fiscal year per symbol — pull a generous window then keep first per symbol.
  const { data } = await sb
    .from("nepse_company_dividends")
    .select("symbol, fiscal_year, cash_pct, bonus_pct")
    .order("fiscal_year", { ascending: false })
    .limit(4000);
  for (const row of (data as Record<string, unknown>[] | null) ?? []) {
    const symbol = typeof row.symbol === "string" ? row.symbol.toUpperCase() : null;
    if (!symbol || map.has(symbol)) continue;
    const cash = num(row.cash_pct);
    const bonus = num(row.bonus_pct);
    map.set(symbol, {
      symbol,
      cash_pct: cash,
      bonus_pct: bonus,
      total: cash != null || bonus != null ? (cash ?? 0) + (bonus ?? 0) : null,
    });
  }
  return map;
}

async function loadTechnicalForSymbols(symbols: string[]): Promise<Map<string, { rsi: number | null; macdHistogram: number | null; maTrend: ScreenerMaTrend }>> {
  const out = new Map<string, { rsi: number | null; macdHistogram: number | null; maTrend: ScreenerMaTrend }>();
  const sb = createMarketDataServiceClient();
  if (!sb || !symbols.length) return out;

  // Cap technical enrichment for performance — callers should pass filtered candidates.
  const capped = symbols.slice(0, 120);
  await Promise.all(
    capped.map(async (symbol) => {
      const { data } = await sb
        .from("nepse_eod_prices")
        .select("close_npr")
        .eq("symbol", symbol)
        .order("trade_date", { ascending: false })
        .limit(80);
      const closes = ((data as { close_npr: number | null }[] | null) ?? [])
        .map((row) => num(row.close_npr))
        .filter((v): v is number => v != null && v > 0)
        .reverse();
      if (closes.length < 20) {
        out.set(symbol, { rsi: null, macdHistogram: null, maTrend: DATA_UNAVAILABLE });
        return;
      }
      const last = closes[closes.length - 1];
      const ema20 = ema(closes, 20);
      const sma50 = sma(closes, Math.min(50, closes.length));
      let maTrend: ScreenerMaTrend = DATA_UNAVAILABLE;
      if (ema20 != null && sma50 != null) {
        maTrend = last >= ema20 && ema20 >= sma50 ? "bullish" : last < ema20 && ema20 < sma50 ? "bearish" : "neutral";
      } else if (ema20 != null) {
        maTrend = last >= ema20 ? "bullish" : "bearish";
      }
      const macdVal = macd(closes);
      out.set(symbol, {
        rsi: rsi(closes),
        macdHistogram: macdVal?.histogram ?? null,
        maTrend,
      });
    }),
  );
  return out;
}

export type ScreenerFilters = {
  sector?: string;
  minMarketCap?: number;
  maxMarketCap?: number;
  minPe?: number;
  maxPe?: number;
  minPb?: number;
  maxPb?: number;
  minEps?: number;
  maxEps?: number;
  minRoe?: number;
  maxRoe?: number;
  minDivYield?: number;
  maxDivYield?: number;
  minRsi?: number;
  maxRsi?: number;
  macdSignal?: "bullish" | "bearish" | "any";
  maTrend?: "bullish" | "bearish" | "neutral" | "any";
  minChangePct?: number;
  maxChangePct?: number;
  minVolume?: number;
  maxVolume?: number;
  /** When true, compute RSI/MACD/MA for matching fundamentals/live rows. */
  includeTechnicals?: boolean;
  limit?: number;
};

function passRange(value: number | null | undefined, min?: number, max?: number): boolean {
  if (min == null && max == null) return true;
  if (value == null || !Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

/** Advanced screener — live board + DB valuation/dividends + optional EOD technicals. */
export async function runAdvancedScreener(filters: ScreenerFilters = {}): Promise<{ rows: ScreenerRow[]; totalMatched: number; loadedAt: string }> {
  const cacheKey = `screener:${JSON.stringify(filters)}`;
  const hit = cache.get<{ rows: ScreenerRow[]; totalMatched: number; loadedAt: string }>(cacheKey);
  if (hit) return hit;

  const [board, valuations, dividends] = await Promise.all([getCachedNepseYonepseBoard(), loadValuations(), loadLatestDividends()]);

  let rows: ScreenerRow[] = Object.values(board.bySymbol)
    .filter((tick) => tick.ltpNpr > 0)
    .map((tick) => {
      const valuation = valuations.get(tick.symbol);
      const dividend = dividends.get(tick.symbol);
      const eps = valuation?.eps ?? null;
      const book = valuation?.book_value_npr ?? null;
      const pe = computePe(tick.ltpNpr, eps) ?? valuation?.pe ?? null;
      const pb = computePb(tick.ltpNpr, book) ?? valuation?.pb ?? null;
      const roePct =
        valuation?.roe_pct ??
        (eps != null && book != null && book > 0 ? (eps / book) * 100 : null);
      const totalDiv = dividend?.total ?? null;
      const dividendYieldPct = totalDiv != null && tick.ltpNpr > 0 ? (totalDiv / tick.ltpNpr) * 100 : null;
      return {
        symbol: tick.symbol,
        companyName: tick.companyName ?? null,
        sector: tick.sector ?? null,
        ltpNpr: tick.ltpNpr,
        changePct: tick.changePct ?? null,
        volume: tick.volume ?? null,
        turnoverNpr: tick.turnoverNpr ?? null,
        trades: tick.trades ?? null,
        marketCapNpr: tick.marketCap ?? null,
        pe,
        pb,
        eps,
        roePct,
        bookValueNpr: book,
        dividendYieldPct,
        rsi: null,
        macdHistogram: null,
        maTrend: DATA_UNAVAILABLE as ScreenerMaTrend,
      };
    });

  const wantsTechnicalFilter =
    filters.minRsi != null ||
    filters.maxRsi != null ||
    (filters.macdSignal != null && filters.macdSignal !== "any") ||
    (filters.maTrend != null && filters.maTrend !== "any") ||
    filters.includeTechnicals === true;

  rows = rows.filter((row) => {
    if (filters.sector && filters.sector !== "all" && row.sector !== filters.sector) return false;
    if (!passRange(row.marketCapNpr, filters.minMarketCap, filters.maxMarketCap)) return false;
    if (!passRange(row.pe, filters.minPe, filters.maxPe)) return false;
    if (!passRange(row.pb, filters.minPb, filters.maxPb)) return false;
    if (!passRange(row.eps, filters.minEps, filters.maxEps)) return false;
    if (!passRange(row.roePct, filters.minRoe, filters.maxRoe)) return false;
    if (!passRange(row.dividendYieldPct, filters.minDivYield, filters.maxDivYield)) return false;
    if (!passRange(row.changePct, filters.minChangePct, filters.maxChangePct)) return false;
    if (!passRange(row.volume, filters.minVolume, filters.maxVolume)) return false;
    return true;
  });

  if (wantsTechnicalFilter) {
    const tech = await loadTechnicalForSymbols(rows.map((row) => row.symbol));
    rows = rows
      .map((row) => {
        const t = tech.get(row.symbol);
        return t ? { ...row, rsi: t.rsi, macdHistogram: t.macdHistogram, maTrend: t.maTrend } : row;
      })
      .filter((row) => {
        if (!passRange(row.rsi, filters.minRsi, filters.maxRsi)) return false;
        if (filters.macdSignal === "bullish" && !(row.macdHistogram != null && row.macdHistogram > 0)) return false;
        if (filters.macdSignal === "bearish" && !(row.macdHistogram != null && row.macdHistogram < 0)) return false;
        if (filters.maTrend && filters.maTrend !== "any" && row.maTrend !== filters.maTrend) return false;
        return true;
      });
  }

  rows.sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0));
  const totalMatched = rows.length;
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 200);
  const payload = { rows: rows.slice(0, limit), totalMatched, loadedAt: new Date().toISOString() };
  cache.set(cacheKey, payload, SCREENER_TTL_MS);
  return payload;
}

/** Derive smart watchlist buckets from the screener universe (real data only). */
export async function buildSmartWatchlistBuckets(): Promise<
  { id: string; label: string; description: string; symbols: string[] }[]
> {
  const { rows } = await runAdvancedScreener({ includeTechnicals: true, limit: 200 });
  const withPe = rows.filter((r) => r.pe != null && r.pe > 0);
  const medianPe = withPe.length
    ? [...withPe].map((r) => r.pe!).sort((a, b) => a - b)[Math.floor(withPe.length / 2)]
    : null;

  const highDividend = rows
    .filter((r) => r.dividendYieldPct != null && r.dividendYieldPct >= 2)
    .sort((a, b) => (b.dividendYieldPct ?? 0) - (a.dividendYieldPct ?? 0))
    .slice(0, 20)
    .map((r) => r.symbol);

  const growth = rows
    .filter((r) => (r.roePct ?? 0) >= 12 && (r.eps ?? 0) > 0 && (r.changePct ?? 0) >= 0)
    .sort((a, b) => (b.roePct ?? 0) - (a.roePct ?? 0))
    .slice(0, 20)
    .map((r) => r.symbol);

  const value = rows
    .filter((r) => r.pe != null && medianPe != null && r.pe > 0 && r.pe <= medianPe * 0.85 && (r.pb == null || r.pb <= 2.5))
    .sort((a, b) => (a.pe ?? 99) - (b.pe ?? 99))
    .slice(0, 20)
    .map((r) => r.symbol);

  const opportunities = rows
    .filter((r) => (r.roePct ?? 0) >= 10 && (r.maTrend === "bullish" || (r.rsi != null && r.rsi >= 45 && r.rsi <= 70)))
    .sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0))
    .slice(0, 20)
    .map((r) => r.symbol);

  const ai = rows
    .filter((r) => (r.roePct ?? 0) >= 12 && r.dividendYieldPct != null && r.dividendYieldPct > 0 && (r.pe == null || (medianPe != null && r.pe <= medianPe)))
    .slice(0, 15)
    .map((r) => r.symbol);

  return [
    { id: "ai", label: "AI Watchlist", description: "Quality + dividend + reasonable PE from published filings", symbols: ai },
    { id: "opportunities", label: "Top Opportunities", description: "Healthy ROE with constructive technical context", symbols: opportunities },
    { id: "high-dividend", label: "High Dividend", description: "Latest announced yield ≥ 2% vs live price", symbols: highDividend },
    { id: "growth", label: "Growth Stocks", description: "ROE ≥ 12% with positive session change", symbols: growth },
    { id: "value", label: "Value Stocks", description: "PE below sector-median band with moderate PB", symbols: value },
  ];
}
