export type ExchangeRateSnapshot = {
  krwPerNpr: number;
  nprPerKrw: number;
  updatedAt: string;
  source: "live" | "cached";
};

export const FALLBACK_KRW_PER_NPR = 9.27;
const CACHE_KEY = "fire-nepal-krw-npr-rate";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;

export function getCachedExchangeRate(): ExchangeRateSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExchangeRateSnapshot;
    const age = Date.now() - new Date(parsed.updatedAt).getTime();
    if (age > CACHE_TTL_MS || !parsed.krwPerNpr) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function cacheExchangeRate(snapshot: ExchangeRateSnapshot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
}

export function fallbackExchangeRate(): ExchangeRateSnapshot {
  return {
    krwPerNpr: FALLBACK_KRW_PER_NPR,
    nprPerKrw: 1 / FALLBACK_KRW_PER_NPR,
    updatedAt: new Date().toISOString(),
    source: "cached",
  };
}

export async function fetchLiveExchangeRate(): Promise<ExchangeRateSnapshot> {
  const cached = getCachedExchangeRate();
  if (cached) return cached;

  try {
    const response = await fetch("https://open.er-api.com/v6/latest/NPR", {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Rate fetch failed");
    const data = (await response.json()) as { rates?: { KRW?: number } };
    const krwPerNpr = data.rates?.KRW ?? FALLBACK_KRW_PER_NPR;
    const snapshot: ExchangeRateSnapshot = {
      krwPerNpr,
      nprPerKrw: 1 / krwPerNpr,
      updatedAt: new Date().toISOString(),
      source: "live",
    };
    cacheExchangeRate(snapshot);
    return snapshot;
  } catch {
    const fallback = fallbackExchangeRate();
    cacheExchangeRate(fallback);
    return fallback;
  }
}

export function nprToKrw(npr: number, krwPerNpr: number) {
  return npr * krwPerNpr;
}

export function krwToNpr(krw: number, krwPerNpr: number) {
  return krw / krwPerNpr;
}

export function parseExpenseAmountInput(
  raw: string,
  inputCurrency: "NPR" | "KRW",
  krwPerNpr: number,
): number | null {
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (inputCurrency === "NPR") return n;
  return krwToNpr(n, krwPerNpr);
}

export function formatExpenseAmountForInput(
  amountNpr: number,
  inputCurrency: "NPR" | "KRW",
  krwPerNpr: number,
): string {
  if (inputCurrency === "NPR") return String(Math.round(amountNpr * 100) / 100);
  return String(Math.round(nprToKrw(amountNpr, krwPerNpr)));
}
