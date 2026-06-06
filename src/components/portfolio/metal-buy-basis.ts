import type { MetalRow } from "@/components/portfolio/types";
import { NEPAL_UI_GRAMS_PER_TOLA } from "@/lib/portfolio/nepal-metal-ui-convert";

/** NPR per gram implied by buy inputs. */
export function metalBuyPriceNprPerGram(row: Pick<MetalRow, "metalBuyPriceAmount" | "metalBuyPriceUnit">): number | undefined {
  const amt = row.metalBuyPriceAmount;
  const unit = row.metalBuyPriceUnit;
  if (typeof amt !== "number" || !Number.isFinite(amt) || amt <= 0) return undefined;
  if (unit === "gram") return amt;
  if (unit === "tola") return amt / NEPAL_UI_GRAMS_PER_TOLA;
  return undefined;
}

/**
 * When buy price + unit are set with positive grams, total cost basis = grams × NPR/g.
 * Used to keep `totalCostBasisNpr` in sync for ROI / analytics (no change to ledger code).
 */
export function deriveMetalTotalCostBasisNprPatch(row: MetalRow): Pick<MetalRow, "totalCostBasisNpr"> | Record<string, never> {
  const perG = metalBuyPriceNprPerGram(row);
  if (perG == null) return {};
  const g = row.grams ?? 0;
  if (!(g > 0)) return { totalCostBasisNpr: undefined };
  const n = g * perG;
  return { totalCostBasisNpr: Math.round(n * 100) / 100 };
}

/** Convert stored buy amount when switching NPR / g ↔ NPR / tola so implied NPR/g stays the same. */
export function convertMetalBuyPriceAmountForUnitChange(
  amount: number | undefined,
  fromUnit: "gram" | "tola" | undefined,
  toUnit: "gram" | "tola",
): number | undefined {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return amount;
  if (fromUnit === toUnit || fromUnit == null) return amount;
  if (fromUnit === "gram" && toUnit === "tola") return Math.round(amount * NEPAL_UI_GRAMS_PER_TOLA * 100) / 100;
  if (fromUnit === "tola" && toUnit === "gram") return Math.round((amount / NEPAL_UI_GRAMS_PER_TOLA) * 1000000) / 1000000;
  return amount;
}
