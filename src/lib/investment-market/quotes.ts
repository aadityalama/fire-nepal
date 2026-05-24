import type { MasterInstrument } from "@/lib/investment-market/types";
import { getInstrumentByKey } from "@/lib/investment-market/catalog";

/**
 * Demo “live” unit price in NPR per share/unit (Phase 2).
 * US-listed instruments: convert demo USD last → NPR via `usdPerNpr` (USD per 1 NPR).
 */
export function demoLiveUnitNpr(i: MasterInstrument, usdPerNpr: number): number {
  switch (i.universe) {
    case "nepse":
      return i.demoLastPriceNpr;
    case "open_end_mf":
      return i.demoNavNpr;
    case "closed_end_mf":
      return i.demoLastPriceNpr;
    case "us_stock":
    case "etf":
      return i.demoLastPriceUsd / usdPerNpr;
    default:
      return 0;
  }
}

export function resolveLiveUnitNpr(
  instrumentKey: string | undefined,
  usdPerNpr: number,
): number | undefined {
  const inst = getInstrumentByKey(instrumentKey);
  if (!inst) return undefined;
  return demoLiveUnitNpr(inst, usdPerNpr);
}

/** Future: swap body for API-backed `fetchQuoteNpr(key)`. */
export type LiveQuoteResolver = (key: string, usdPerNpr: number) => number | undefined;
