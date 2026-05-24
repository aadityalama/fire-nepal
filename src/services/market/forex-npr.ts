import { FALLBACK_USD_PER_NPR } from "@/lib/portfolio-convert";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { fetchJson } from "@/lib/api/fetch-json";
import type { ForexCross } from "@/types/market";

export async function fetchNprForexCross(): Promise<ForexCross> {
  try {
    const data = await fetchJson<{ rates?: { KRW?: number; USD?: number } }>(
      "https://open.er-api.com/v6/latest/NPR",
      { timeoutMs: 10_000, retries: 1 },
    );
    const krwPerNpr = data.rates?.KRW ?? FALLBACK_KRW_PER_NPR;
    const usdPerNpr = data.rates?.USD ?? FALLBACK_USD_PER_NPR;
    return {
      krwPerNpr,
      usdPerNpr,
      nprPerUsd: 1 / Math.max(usdPerNpr, 1e-12),
    };
  } catch {
    return {
      krwPerNpr: FALLBACK_KRW_PER_NPR,
      usdPerNpr: FALLBACK_USD_PER_NPR,
      nprPerUsd: 1 / FALLBACK_USD_PER_NPR,
    };
  }
}
