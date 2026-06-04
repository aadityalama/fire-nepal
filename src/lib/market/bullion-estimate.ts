import { FALLBACK_USD_PER_NPR } from "@/lib/portfolio-convert";

/** Troy ounce → grams (same as LBMA / spot commodity convention). */
export const TROY_OZ_GRAMS = 31.1034768;

/** Conservative USD spot anchors when upstream feeds are unavailable (aligned with historical Yahoo GC=/SI= levels). */
export const DEFAULT_BULLION_USD_PER_TROY_OZ = {
  goldUsdPerOz: 2680,
  silverUsdPerOz: 32,
} as const;

export function metalNprPerGramFromUsdSpot(
  goldUsdPerOz: number,
  silverUsdPerOz: number,
  usdPerNpr: number,
): { goldNprPerGram: number; silverNprPerGram: number } {
  const nprPerUsd = 1 / Math.max(usdPerNpr, 1e-12);
  const g = Math.max(goldUsdPerOz, 1e-9);
  const s = Math.max(silverUsdPerOz, 1e-9);
  return {
    goldNprPerGram: (g * nprPerUsd) / TROY_OZ_GRAMS,
    silverNprPerGram: (s * nprPerUsd) / TROY_OZ_GRAMS,
  };
}

/** NPR/g from default USD spot anchors (never zero when `usdPerNpr` is valid). */
export function fallbackMetalRatesFromUsdAnchors(usdPerNpr: number = FALLBACK_USD_PER_NPR) {
  return metalNprPerGramFromUsdSpot(
    DEFAULT_BULLION_USD_PER_TROY_OZ.goldUsdPerOz,
    DEFAULT_BULLION_USD_PER_TROY_OZ.silverUsdPerOz,
    usdPerNpr,
  );
}
