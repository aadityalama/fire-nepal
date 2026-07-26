import { createMemoryTtlCache } from "@/lib/api/memory-ttl-cache";
import { computePb, computePe } from "@/lib/market/nepse-fundamentals-format";
import { bollingerBands, ema, macd, rsi, sma } from "@/lib/market/technical-indicators";
import { createMarketDataServiceClient } from "@/services/market/nepse-market-data-engine";
import { getCachedNepseYonepseBoard } from "@/services/market/nepse-yonepse";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type {
  ScreenerBollingerPos,
  ScreenerMaTrend,
  ScreenerRow,
  ScreenerTechRating,
} from "@/types/market/nepse-professional-terminal";

const cache = createMemoryTtlCache();
const SCREENER_TTL_MS = 5 * 60_000;

type ValuationRow = {
  symbol: string;
  eps: number | null;
  pe: number | null;
  pb: number | null;
  book_value_npr: number | null;
  roe_pct: number | null;
  roa_pct: number | null;
};

type DividendRow = { symbol: string; cash_pct: number | null; bonus_pct: number | null; total: number | null };

type TechBundle = {
  rsi: number | null;
  macdHistogram: number | null;
  smaTrend: ScreenerMaTrend;
  emaTrend: ScreenerMaTrend;
  bollingerPos: ScreenerBollingerPos;
  high52w: number | null;
  low52w: number | null;
};

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function passRange(value: number | null | undefined, min?: number, max?: number): boolean {
  if (min == null && max == null) return true;
  if (value == null || !Number.isFinite(value)) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function bollingerPos(close: number, bands: { upper: number; middle: number; lower: number } | null): ScreenerBollingerPos {
  if (!bands) return DATA_UNAVAILABLE;
  if (close >= bands.upper) return "above_upper";
  if (close <= bands.lower) return "below_lower";
  if (close >= bands.middle) return "upper_half";
  return "lower_half";
}

function rateTechnical(rsiVal: number | null, macdHist: number | null, smaTrend: ScreenerMaTrend): ScreenerTechRating {
  let score = 50;
  let signals = 0;
  if (rsiVal != null) {
    signals += 1;
    if (rsiVal < 30) score += 15;
    else if (rsiVal > 70) score -= 15;
    else if (rsiVal >= 45 && rsiVal <= 55) score += 5;
  }
  if (macdHist != null) {
    signals += 1;
    score += macdHist > 0 ? 12 : -12;
  }
  if (smaTrend === "bullish") {
    signals += 1;
    score += 12;
  } else if (smaTrend === "bearish") {
    signals += 1;
    score -= 12;
  }
  if (!signals) return DATA_UNAVAILABLE;
  if (score >= 65) return "bullish";
  if (score <= 35) return "bearish";
  return "neutral";
}

function scoreAi(input: {
  pe: number | null;
  pb: number | null;
  roe: number | null;
  dy: number | null;
  changePct: number | null;
  technicalRating: ScreenerTechRating;
}): number | null {
  let score = 50;
  let used = 0;
  if (input.pe != null && input.pe > 0) {
    used += 1;
    if (input.pe < 12) score += 12;
    else if (input.pe > 30) score -= 10;
  }
  if (input.pb != null && input.pb > 0) {
    used += 1;
    if (input.pb < 1.5) score += 10;
    else if (input.pb > 4) score -= 8;
  }
  if (input.roe != null) {
    used += 1;
    if (input.roe >= 15) score += 12;
    else if (input.roe < 5) score -= 8;
  }
  if (input.dy != null) {
    used += 1;
    if (input.dy >= 3) score += 8;
  }
  if (input.technicalRating === "bullish") {
    used += 1;
    score += 10;
  } else if (input.technicalRating === "bearish") {
    used += 1;
    score -= 10;
  }
  if (input.changePct != null) {
    used += 1;
    score += Math.max(-8, Math.min(8, input.changePct));
  }
  if (!used) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function loadValuations(): Promise<Map<string, ValuationRow>> {
  const sb = createMarketDataServiceClient();
  const map = new Map<string, ValuationRow>();
  if (!sb) return map;
  const { data } = await sb.from("nepse_company_valuation").select("symbol, eps, pe, pb, book_value_npr, roe_pct, roa_pct");
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
      roa_pct: num(row.roa_pct),
    });
  }
  return map;
}

async function loadLatestDividends(): Promise<Map<string, DividendRow>> {
  const sb = createMarketDataServiceClient();
  const map = new Map<string, DividendRow>();
  if (!sb) return map;
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

async function loadTechnicalForSymbols(symbols: string[]): Promise<Map<string, TechBundle>> {
  const out = new Map<string, TechBundle>();
  const sb = createMarketDataServiceClient();
  if (!sb || !symbols.length) return out;

  const capped = symbols.slice(0, 140);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 370);
  const sinceIso = since.toISOString().slice(0, 10);

  for (let i = 0; i < capped.length; i += 25) {
    const chunk = capped.slice(i, i + 25);
    await Promise.all(
      chunk.map(async (symbol) => {
        const { data } = await sb
          .from("nepse_eod_prices")
          .select("close_npr, high_npr, low_npr")
          .eq("symbol", symbol)
          .gte("trade_date", sinceIso)
          .order("trade_date", { ascending: true })
          .limit(280);

        const rows = (data as { close_npr: number | null; high_npr: number | null; low_npr: number | null }[] | null) ?? [];
        const closes = rows.map((row) => num(row.close_npr)).filter((v): v is number => v != null && v > 0);
        let high52: number | null = null;
        let low52: number | null = null;
        for (const row of rows) {
          const high = num(row.high_npr) ?? num(row.close_npr);
          const low = num(row.low_npr) ?? num(row.close_npr);
          if (high != null && high > 0) high52 = high52 == null ? high : Math.max(high52, high);
          if (low != null && low > 0) low52 = low52 == null ? low : Math.min(low52, low);
        }

        if (closes.length < 20) {
          out.set(symbol, {
            rsi: null,
            macdHistogram: null,
            smaTrend: DATA_UNAVAILABLE,
            emaTrend: DATA_UNAVAILABLE,
            bollingerPos: DATA_UNAVAILABLE,
            high52w: high52,
            low52w: low52,
          });
          return;
        }

        const last = closes[closes.length - 1];
        const sma20 = sma(closes, 20);
        const sma50 = sma(closes, Math.min(50, closes.length));
        const ema12 = ema(closes, 12);
        const ema26 = ema(closes, 26);
        let smaTrend: ScreenerMaTrend = DATA_UNAVAILABLE;
        if (sma20 != null && sma50 != null) {
          smaTrend = sma20 > sma50 ? "bullish" : sma20 < sma50 ? "bearish" : "neutral";
        }
        let emaTrend: ScreenerMaTrend = DATA_UNAVAILABLE;
        if (ema12 != null && ema26 != null) {
          emaTrend = ema12 > ema26 ? "bullish" : ema12 < ema26 ? "bearish" : "neutral";
        }
        const macdVal = macd(closes);
        out.set(symbol, {
          rsi: rsi(closes),
          macdHistogram: macdVal?.histogram ?? null,
          smaTrend,
          emaTrend,
          bollingerPos: bollingerPos(last, bollingerBands(closes)),
          high52w: high52,
          low52w: low52,
        });
      }),
    );
  }
  return out;
}

export type ScreenerFilters = {
  sector?: string;
  minPrice?: number;
  maxPrice?: number;
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
  minRoa?: number;
  maxRoa?: number;
  minDivYield?: number;
  maxDivYield?: number;
  minRsi?: number;
  maxRsi?: number;
  macdSignal?: "bullish" | "bearish" | "any";
  maTrend?: "bullish" | "bearish" | "neutral" | "any";
  smaTrend?: "bullish" | "bearish" | "neutral" | "any";
  emaTrend?: "bullish" | "bearish" | "neutral" | "any";
  bollingerPosition?: "above_upper" | "below_lower" | "upper_half" | "lower_half" | "any";
  technicalRating?: "bullish" | "bearish" | "neutral" | "any";
  minAiScore?: number;
  maxAiScore?: number;
  minChangePct?: number;
  maxChangePct?: number;
  minVolume?: number;
  maxVolume?: number;
  minTurnover?: number;
  near52wHigh?: boolean;
  near52wLow?: boolean;
  /** When true, compute RSI/MACD/MA/BB/52W for matching rows. */
  includeTechnicals?: boolean;
  limit?: number;
};

/** Advanced screener — live board + DB valuation/dividends + optional EOD technicals. */
export async function runAdvancedScreener(
  filters: ScreenerFilters = {},
): Promise<{ rows: ScreenerRow[]; totalMatched: number; loadedAt: string }> {
  const cacheKey = `screener-v3:${JSON.stringify(filters)}`;
  const hit = cache.get<{ rows: ScreenerRow[]; totalMatched: number; loadedAt: string }>(cacheKey);
  if (hit) return hit;

  const [board, valuations, dividends] = await Promise.all([
    getCachedNepseYonepseBoard(),
    loadValuations(),
    loadLatestDividends(),
  ]);

  let rows: ScreenerRow[] = Object.values(board.bySymbol)
    .filter((tick) => tick.ltpNpr > 0)
    .map((tick) => {
      const valuation = valuations.get(tick.symbol);
      const dividend = dividends.get(tick.symbol);
      const eps = valuation?.eps ?? null;
      const book = valuation?.book_value_npr ?? null;
      const pe = computePe(tick.ltpNpr, eps) ?? valuation?.pe ?? null;
      const pb = computePb(tick.ltpNpr, book) ?? valuation?.pb ?? null;
      const roePct = valuation?.roe_pct ?? (eps != null && book != null && book > 0 ? (eps / book) * 100 : null);
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
        roaPct: valuation?.roa_pct ?? null,
        bookValueNpr: book,
        dividendYieldPct,
        rsi: null,
        macdHistogram: null,
        smaTrend: DATA_UNAVAILABLE as ScreenerMaTrend,
        emaTrend: DATA_UNAVAILABLE as ScreenerMaTrend,
        maTrend: DATA_UNAVAILABLE as ScreenerMaTrend,
        bollingerPos: DATA_UNAVAILABLE as ScreenerBollingerPos,
        high52wNpr: null,
        low52wNpr: null,
        near52wHigh: false,
        near52wLow: false,
        technicalRating: DATA_UNAVAILABLE as ScreenerTechRating,
        aiScore: null,
      };
    });

  const wantsTechnicalFilter =
    filters.minRsi != null ||
    filters.maxRsi != null ||
    (filters.macdSignal != null && filters.macdSignal !== "any") ||
    (filters.maTrend != null && filters.maTrend !== "any") ||
    (filters.smaTrend != null && filters.smaTrend !== "any") ||
    (filters.emaTrend != null && filters.emaTrend !== "any") ||
    (filters.bollingerPosition != null && filters.bollingerPosition !== "any") ||
    (filters.technicalRating != null && filters.technicalRating !== "any") ||
    filters.near52wHigh === true ||
    filters.near52wLow === true ||
    filters.minAiScore != null ||
    filters.maxAiScore != null ||
    filters.includeTechnicals === true;

  rows = rows.filter((row) => {
    if (filters.sector && filters.sector !== "all" && row.sector !== filters.sector) return false;
    if (!passRange(row.ltpNpr, filters.minPrice, filters.maxPrice)) return false;
    if (!passRange(row.marketCapNpr, filters.minMarketCap, filters.maxMarketCap)) return false;
    if (!passRange(row.pe, filters.minPe, filters.maxPe)) return false;
    if (!passRange(row.pb, filters.minPb, filters.maxPb)) return false;
    if (!passRange(row.eps, filters.minEps, filters.maxEps)) return false;
    if (!passRange(row.roePct, filters.minRoe, filters.maxRoe)) return false;
    if (!passRange(row.roaPct, filters.minRoa, filters.maxRoa)) return false;
    if (!passRange(row.dividendYieldPct, filters.minDivYield, filters.maxDivYield)) return false;
    if (!passRange(row.changePct, filters.minChangePct, filters.maxChangePct)) return false;
    if (!passRange(row.volume, filters.minVolume, filters.maxVolume)) return false;
    if (!passRange(row.turnoverNpr, filters.minTurnover)) return false;
    return true;
  });

  if (wantsTechnicalFilter) {
    const tech = await loadTechnicalForSymbols(rows.map((row) => row.symbol));
    rows = rows
      .map((row) => {
        const t = tech.get(row.symbol);
        if (!t) return row;
        const nearHigh = t.high52w != null && row.ltpNpr != null && t.high52w > 0 ? ((row.ltpNpr - t.high52w) / t.high52w) * 100 >= -2 : false;
        const nearLow = t.low52w != null && row.ltpNpr != null && t.low52w > 0 ? ((row.ltpNpr - t.low52w) / t.low52w) * 100 <= 2 : false;
        const technicalRating = rateTechnical(t.rsi, t.macdHistogram, t.smaTrend);
        const aiScore = scoreAi({
          pe: row.pe,
          pb: row.pb,
          roe: row.roePct,
          dy: row.dividendYieldPct,
          changePct: row.changePct,
          technicalRating,
        });
        return {
          ...row,
          rsi: t.rsi,
          macdHistogram: t.macdHistogram,
          smaTrend: t.smaTrend,
          emaTrend: t.emaTrend,
          maTrend: t.smaTrend,
          bollingerPos: t.bollingerPos,
          high52wNpr: t.high52w,
          low52wNpr: t.low52w,
          near52wHigh: nearHigh,
          near52wLow: nearLow,
          technicalRating,
          aiScore,
        };
      })
      .filter((row) => {
        if (!passRange(row.rsi, filters.minRsi, filters.maxRsi)) return false;
        if (filters.macdSignal === "bullish" && !(row.macdHistogram != null && row.macdHistogram > 0)) return false;
        if (filters.macdSignal === "bearish" && !(row.macdHistogram != null && row.macdHistogram < 0)) return false;
        if (filters.maTrend && filters.maTrend !== "any" && row.maTrend !== filters.maTrend) return false;
        if (filters.smaTrend && filters.smaTrend !== "any" && row.smaTrend !== filters.smaTrend) return false;
        if (filters.emaTrend && filters.emaTrend !== "any" && row.emaTrend !== filters.emaTrend) return false;
        if (filters.bollingerPosition && filters.bollingerPosition !== "any" && row.bollingerPos !== filters.bollingerPosition) {
          return false;
        }
        if (filters.technicalRating && filters.technicalRating !== "any" && row.technicalRating !== filters.technicalRating) {
          return false;
        }
        if (!passRange(row.aiScore, filters.minAiScore, filters.maxAiScore)) return false;
        if (filters.near52wHigh && !row.near52wHigh) return false;
        if (filters.near52wLow && !row.near52wLow) return false;
        return true;
      });
  }

  rows.sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0));
  const totalMatched = rows.length;
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 250);
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

  const trending = [...rows]
    .filter((r) => (r.turnoverNpr ?? 0) > 0 && (r.volume ?? 0) > 0)
    .sort((a, b) => (b.turnoverNpr ?? 0) - (a.turnoverNpr ?? 0))
    .slice(0, 20)
    .map((r) => r.symbol);

  const momentum = rows
    .filter((r) => (r.changePct ?? 0) > 0 && (r.maTrend === "bullish" || (r.rsi != null && r.rsi >= 55 && r.rsi <= 75)))
    .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))
    .slice(0, 20)
    .map((r) => r.symbol);

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
    .filter(
      (r) =>
        (r.aiScore != null && r.aiScore >= 60) ||
        ((r.roePct ?? 0) >= 12 && r.dividendYieldPct != null && r.dividendYieldPct > 0 && (r.pe == null || (medianPe != null && r.pe <= medianPe))),
    )
    .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
    .slice(0, 15)
    .map((r) => r.symbol);

  return [
    { id: "trending", label: "Trending Stocks", description: "Highest live turnover on the board", symbols: trending },
    { id: "momentum", label: "Momentum Stocks", description: "Positive session with bullish MA/RSI context", symbols: momentum },
    { id: "ai", label: "AI Opportunities", description: "Deterministic AI score from filings + technicals", symbols: ai },
    { id: "opportunities", label: "Top Opportunities", description: "Healthy ROE with constructive technical context", symbols: opportunities },
    { id: "high-dividend", label: "High Dividend", description: "Latest announced yield ≥ 2% vs live price", symbols: highDividend },
    { id: "growth", label: "Growth Stocks", description: "ROE ≥ 12% with positive session change", symbols: growth },
    { id: "value", label: "Value Stocks", description: "PE below median band with moderate PB", symbols: value },
  ];
}
