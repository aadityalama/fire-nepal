import { patchCashflowState } from "@/lib/cashflow/patch-cashflow-cloud";

/**
 * Writes modelled aggregate monthly FD interest (NPR) into cashflow
 * `income.depositInterestIncome`. Portfolio is the source of truth for this field;
 * editing FD rows on the wealth dashboard updates cashflow on the next debounced sync.
 *
 * Authenticated users persist via Supabase only (never localStorage as SoT).
 */
export function replaceDepositInterestIncomeFromPortfolioNpr(monthlyNpr: number, userId?: string | null): void {
  if (typeof window === "undefined") return;
  const v = Number.isFinite(monthlyNpr) && monthlyNpr > 0 ? monthlyNpr : 0;
  void patchCashflowState(userId, (cur) => ({
    ...cur,
    income: {
      ...cur.income,
      depositInterestIncome: v > 0 ? v : undefined,
    },
  })).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[cashflow] FD interest sync failed", error);
    }
  });
}
