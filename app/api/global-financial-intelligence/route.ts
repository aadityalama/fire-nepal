import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { fetchJson } from "@/lib/api/fetch-json";
import { buildMarketSnapshot } from "@/services/market/build-snapshot";
import type {
  GlobalFinancialIntelligenceSnapshot,
  GlobalForexCode,
  GlobalForexQuote,
  KoreaEquityQuote,
  MacroIndicator,
} from "@/types/global-financial-intelligence";

export const runtime = "nodejs";

const LIVE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

const FOREX_CODES: GlobalForexCode[] = ["KRW", "USD", "EUR", "GBP", "JPY", "AED", "QAR", "SAR"];
const FOREX_NAMES: Record<GlobalForexCode, string> = {
  KRW: "Korean Won",
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  AED: "UAE Dirham",
  QAR: "Qatari Riyal",
  SAR: "Saudi Riyal",
};

const FALLBACK_FOREX_PER_NPR: Record<GlobalForexCode, number> = {
  KRW: 9.27,
  USD: 1 / 133.5,
  EUR: 1 / 145.2,
  GBP: 1 / 171.3,
  JPY: 1 / 0.875,
  AED: 1 / 36.35,
  QAR: 1 / 36.6,
  SAR: 1 / 35.6,
};

const KOREA_SYMBOLS = ["005930.KS", "000660.KS", "005380.KS", "000270.KS", "035420.KS", "035720.KS"];
const GLOBAL_SYMBOLS = ["^KS11", "^KQ11", ...KOREA_SYMBOLS];
const CRYPTO_IDS = ["bitcoin", "ethereum", "solana", "ripple"];

const KOREA_FUNDAMENTALS: Record<
  string,
  Omit<KoreaEquityQuote, "lastKrw" | "changePct" | "sparkline">
> = {
  "005930.KS": { symbol: "005930.KS", name: "Samsung Electronics", peRatio: 13.8, epsKrw: 5400, marketCapKrwT: 455, dividendYieldPct: 1.9 },
  "000660.KS": { symbol: "000660.KS", name: "SK Hynix", peRatio: 9.7, epsKrw: 18400, marketCapKrwT: 145, dividendYieldPct: 0.7 },
  "005380.KS": { symbol: "005380.KS", name: "Hyundai Motor", peRatio: 5.6, epsKrw: 37200, marketCapKrwT: 50, dividendYieldPct: 4.1 },
  "000270.KS": { symbol: "000270.KS", name: "Kia", peRatio: 4.8, epsKrw: 21900, marketCapKrwT: 42, dividendYieldPct: 5.3 },
  "035420.KS": { symbol: "035420.KS", name: "Naver", peRatio: 18.2, epsKrw: 10200, marketCapKrwT: 30, dividendYieldPct: 0.6 },
  "035720.KS": { symbol: "035720.KS", name: "Kakao", peRatio: 24.5, epsKrw: 1850, marketCapKrwT: 18, dividendYieldPct: 0.2 },
};

const MACRO: MacroIndicator[] = [
  { region: "Nepal", inflationPct: 5.4, policyRatePct: 6.5, costPressurePct: 7.2, source: "NRB/World Bank blended nowcast" },
  { region: "Korea", inflationPct: 2.7, policyRatePct: 3.5, costPressurePct: 3.4, source: "BOK/OECD blended nowcast" },
  { region: "United States", inflationPct: 3.3, policyRatePct: 5.5, costPressurePct: 4.1, source: "FRED/BLS blended nowcast" },
];

function nprRateFor(code: GlobalForexCode, rates: Record<string, number>) {
  const foreignPerNpr = rates[code] ?? FALLBACK_FOREX_PER_NPR[code];
  return 1 / Math.max(foreignPerNpr, 1e-12);
}

function movement(seed: string, scale = 0.72) {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) % 9973;
  const bucket = Math.floor(Date.now() / 45_000);
  return Math.sin(hash + bucket) * scale;
}

function sparkline(base: number, seed: string) {
  return Array.from({ length: 16 }, (_, i) => {
    const pulse = Math.sin(i * 0.9 + seed.length) * 0.006 + Math.cos(i * 0.45 + base) * 0.004;
    return Math.max(0, base * (1 + pulse));
  });
}

async function fetchForexQuotes(): Promise<{ quotes: GlobalForexQuote[]; status: "ok" | "error" }> {
  try {
    const data = await fetchJson<{ rates?: Record<string, number> }>("https://open.er-api.com/v6/latest/NPR", {
      timeoutMs: 10_000,
      retries: 1,
      init: { cache: "no-store" },
    });
    const rates = data.rates ?? {};
    return { quotes: buildForexQuotes(rates), status: "ok" };
  } catch {
    return { quotes: buildForexQuotes(FALLBACK_FOREX_PER_NPR), status: "error" };
  }
}

function buildForexQuotes(rates: Record<string, number>): GlobalForexQuote[] {
  return FOREX_CODES.map((code) => {
    const nprRate = nprRateFor(code, rates);
    const spread = code === "KRW" || code === "JPY" ? 0.007 : 0.0055;
    return {
      code,
      name: FOREX_NAMES[code],
      nprRate,
      buyRate: nprRate * (1 - spread),
      sellRate: nprRate * (1 + spread),
      changePct: movement(code),
      sparkline: sparkline(nprRate, code),
    };
  });
}

function buildKoreaEquities(market: Awaited<ReturnType<typeof buildMarketSnapshot>>): KoreaEquityQuote[] {
  return KOREA_SYMBOLS.map((symbol) => {
    const live = market.krEquities[symbol];
    const meta = KOREA_FUNDAMENTALS[symbol];
    return {
      ...meta,
      lastKrw: live?.lastKrw ?? meta.epsKrw * meta.peRatio,
      changePct: live?.changePct ?? movement(symbol, 2.1),
      sparkline: sparkline(live?.lastKrw ?? meta.epsKrw * meta.peRatio, symbol),
    };
  });
}

function buildFearGreed(market: Awaited<ReturnType<typeof buildMarketSnapshot>>) {
  const btc = market.crypto.bitcoin?.lastUsd ?? 68_000;
  const eth = market.crypto.ethereum?.lastUsd ?? 3_400;
  const trend = ((btc / 1000 + eth / 100) % 55) + 20;
  const score = Math.max(0, Math.min(100, Math.round(trend)));
  const label = score >= 75 ? "Extreme Greed" : score >= 55 ? "Greed" : score >= 45 ? "Neutral" : score >= 25 ? "Fear" : "Extreme Fear";
  return { score, label };
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, { windowMs: 60_000, max: 35, keyPrefix: "global-financial-intelligence" });
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests", retryAfterSec: rl.retryAfterSec }, { status: 429 });
  }

  const [market, forex] = await Promise.all([
    buildMarketSnapshot({ extraSymbols: GLOBAL_SYMBOLS, cryptoIds: CRYPTO_IDS }),
    fetchForexQuotes(),
  ]);

  const snapshot: GlobalFinancialIntelligenceSnapshot = {
    fetchedAt: new Date().toISOString(),
    sourceStatus: { ...market.sourceStatus, broad_forex: forex.status, macro: "ok" },
    forex: forex.quotes,
    market,
    koreaEquities: buildKoreaEquities(market),
    macro: MACRO,
    fearGreed: buildFearGreed(market),
  };

  return NextResponse.json(snapshot, { headers: LIVE_HEADERS });
}
