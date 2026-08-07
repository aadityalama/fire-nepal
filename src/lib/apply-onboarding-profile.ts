import type { ProductOnboardingState } from "@/lib/product-onboarding-storage";
import { patchCashflowState } from "@/lib/cashflow/patch-cashflow-cloud";

/**
 * Seeds cashflow from onboarding when the user has not yet entered salary.
 * Never overwrites non-zero salary or an existing emergency reserve.
 * Authenticated users persist via Supabase only.
 */
export function applyOnboardingToCashflowIfEmpty(onboarding: ProductOnboardingState, userId?: string | null): void {
  if (typeof window === "undefined" || !onboarding.completed) return;

  void patchCashflowState(userId, (cf) => {
    const existingSalary = cf.income.salary ?? 0;
    if (existingSalary > 0) return cf;

    const salary = Math.max(0, onboarding.salaryMonthlyNpr);
    const savings = Math.max(0, onboarding.monthlySavingsNpr);
    const spend = Math.max(0, salary - savings);
    const reserve = cf.emergencyCashReserve ?? (spend > 0 ? Math.round(6 * spend) : undefined);

    return {
      ...cf,
      income: {
        ...cf.income,
        salary: salary > 0 ? salary : cf.income.salary,
      },
      emergencyCashReserve: reserve ?? cf.emergencyCashReserve,
    };
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.error("[onboarding] cashflow seed failed", error);
    }
  });
}
