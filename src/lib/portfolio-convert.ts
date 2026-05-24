import { FALLBACK_KRW_PER_NPR, krwToNpr } from "@/lib/exchange-rate";

/** USD per 1 NPR (matches ~133.5 NPR/USD). */
export const FALLBACK_USD_PER_NPR = 1 / 133.5;

export type PortfolioDisplayCurrency = "NPR" | "KRW" | "USD";

export function amountToNpr(
  amount: number,
  currency: PortfolioDisplayCurrency,
  krwPerNpr: number,
  usdPerNpr: number,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (currency === "NPR") return amount;
  if (currency === "KRW") return krwToNpr(amount, krwPerNpr);
  return amount / usdPerNpr;
}

export function fetchNprCrossRates(): Promise<{ krwPerNpr: number; usdPerNpr: number }> {
  return fetch("https://open.er-api.com/v6/latest/NPR", { cache: "no-store" })
    .then((r) => r.json() as Promise<{ rates?: { KRW?: number; USD?: number } }>)
    .then((data) => ({
      krwPerNpr: data.rates?.KRW ?? FALLBACK_KRW_PER_NPR,
      usdPerNpr: data.rates?.USD ?? FALLBACK_USD_PER_NPR,
    }))
    .catch(() => ({
      krwPerNpr: FALLBACK_KRW_PER_NPR,
      usdPerNpr: FALLBACK_USD_PER_NPR,
    }));
}
