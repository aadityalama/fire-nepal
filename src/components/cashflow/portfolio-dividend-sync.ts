import { patchCashflowState } from "@/lib/cashflow/patch-cashflow-cloud";

/** Fired after programmatic cashflow updates (e.g. portfolio dividend sync). */
export const CASHFLOW_EXTERNAL_SYNC_EVENT = "fire-nepal-cashflow-sync";

/**
 * Adds net NPR from a portfolio cash dividend into Cashflow `income.dividendIncome`
 * (same monthly field users edit on the Cashflow dashboard).
 *
 * Authenticated users persist via Supabase only (never localStorage as SoT).
 */
export function addDividendIncomeToCashflowStorage(netDividendNpr: number, userId?: string | null): void {
  if (typeof window === "undefined" || !Number.isFinite(netDividendNpr) || netDividendNpr <= 0) return;
  void patchCashflowState(userId, (cur) => {
    const prev = cur.income.dividendIncome ?? 0;
    return {
      ...cur,
      income: { ...cur.income, dividendIncome: prev + netDividendNpr },
    };
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[cashflow] dividend sync failed", error);
    }
  });
}
