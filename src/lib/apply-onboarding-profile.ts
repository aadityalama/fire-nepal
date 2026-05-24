import { loadCashflowState, saveCashflowState } from "@/components/cashflow/cashflow-storage";
import type { ProductOnboardingState } from "@/lib/product-onboarding-storage";

/**
 * Seeds cashflow from onboarding when the user has not yet entered salary.
 * Never overwrites non-zero salary or an existing emergency reserve.
 */
export function applyOnboardingToCashflowIfEmpty(onboarding: ProductOnboardingState): void {
  if (typeof window === "undefined" || !onboarding.completed) return;
  const cf = loadCashflowState();
  const existingSalary = cf.income.salary ?? 0;
  if (existingSalary > 0) return;

  const salary = Math.max(0, onboarding.salaryMonthlyNpr);
  const savings = Math.max(0, onboarding.monthlySavingsNpr);
  const spend = Math.max(0, salary - savings);
  const reserve = cf.emergencyCashReserve ?? (spend > 0 ? Math.round(6 * spend) : undefined);

  saveCashflowState({
    ...cf,
    income: {
      ...cf.income,
      salary: salary > 0 ? salary : cf.income.salary,
    },
    emergencyCashReserve: reserve ?? cf.emergencyCashReserve,
  });
}
