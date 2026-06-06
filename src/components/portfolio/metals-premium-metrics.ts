import type { MetalRow } from "@/components/portfolio/types";
import { calendarDaysInvested, parsePurchaseIso } from "@/components/portfolio/holding-stats";

export type MetalRatePair = { goldNprPerGram: number; silverNprPerGram: number };

export type MetalBucketRollup = {
  grams: number;
  purchaseNpr: number;
  currentNpr: number;
  /** Sum of basis only where row has basis > 0 */
  basisSumNpr: number;
  rowsWithBasis: number;
};

export function rollupMetalBucket(rows: readonly MetalRow[], metal: "gold" | "silver", rates: MetalRatePair): MetalBucketRollup {
  const rate = metal === "gold" ? rates.goldNprPerGram : rates.silverNprPerGram;
  let grams = 0;
  let basisSumNpr = 0;
  let rowsWithBasis = 0;
  for (const r of rows) {
    if (r.metal !== metal) continue;
    const g = r.grams ?? 0;
    if (g <= 0) continue;
    grams += g;
    const b = r.totalCostBasisNpr;
    if (typeof b === "number" && b > 0) {
      basisSumNpr += b;
      rowsWithBasis += 1;
    }
  }
  return {
    grams,
    purchaseNpr: basisSumNpr,
    currentNpr: grams * rate,
    basisSumNpr,
    rowsWithBasis,
  };
}

/** Average NPR/g across lots that have a positive cost basis (basis sum ÷ grams on those lots). */
export function weightedBasisCostPerGram(rows: readonly MetalRow[], metal: "gold" | "silver"): number | null {
  let basisSum = 0;
  let gramsCovered = 0;
  for (const r of rows) {
    if (r.metal !== metal) continue;
    const g = r.grams ?? 0;
    if (g <= 0) continue;
    const b = r.totalCostBasisNpr;
    if (typeof b === "number" && b > 0) {
      basisSum += b;
      gramsCovered += g;
    }
  }
  if (gramsCovered <= 0) return null;
  return basisSum / gramsCovered;
}

export function rollupAllMetals(rows: readonly MetalRow[], rates: MetalRatePair): MetalBucketRollup {
  const gGold = rollupMetalBucket(rows, "gold", rates);
  const gSilver = rollupMetalBucket(rows, "silver", rates);
  return {
    grams: gGold.grams + gSilver.grams,
    purchaseNpr: gGold.purchaseNpr + gSilver.purchaseNpr,
    currentNpr: gGold.currentNpr + gSilver.currentNpr,
    basisSumNpr: gGold.basisSumNpr + gSilver.basisSumNpr,
    rowsWithBasis: gGold.rowsWithBasis + gSilver.rowsWithBasis,
  };
}

/** Oldest valid `boughtDate` among rows with grams > 0 (any metal). */
export function oldestMetalBoughtDate(rows: readonly MetalRow[]): Date | null {
  let best: Date | null = null;
  for (const r of rows) {
    const g = r.grams ?? 0;
    if (g <= 0) continue;
    const d = parsePurchaseIso(r.boughtDate);
    if (!d) continue;
    if (!best || d.getTime() < best.getTime()) best = d;
  }
  return best;
}

export function metalHoldingCalendarDays(rows: readonly MetalRow[]): number | null {
  const start = oldestMetalBoughtDate(rows);
  if (!start) return null;
  return calendarDaysInvested(start, new Date());
}

export function roiPct(cost: number, value: number): number | null {
  if (cost <= 0 || !Number.isFinite(value)) return null;
  return ((value - cost) / cost) * 100;
}

export function totalAppreciationPct(cost: number, value: number): number | null {
  return roiPct(cost, value);
}
