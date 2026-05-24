import type { CashflowDashboardState, ExpenseCategoryKey, IncomeSourceKey } from "@/components/cashflow/types";

function finiteNonNeg(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function sumIncome(state: CashflowDashboardState): number {
  const keys: IncomeSourceKey[] = [
    "salary",
    "overtime",
    "rentalIncome",
    "dividendIncome",
    "depositInterestIncome",
    "freelanceIncome",
    "businessIncome",
    "socialMediaIncome",
  ];
  return keys.reduce((acc, k) => acc + finiteNonNeg(state.income[k]), 0);
}

export function sumExpenseCategories(state: CashflowDashboardState): number {
  const keys: ExpenseCategoryKey[] = [
    "rent",
    "food",
    "transportation",
    "familySupport",
    "emiLoans",
    "entertainment",
    "insurance",
  ];
  return keys.reduce((acc, k) => acc + finiteNonNeg(state.expenses[k]), 0);
}

/** Monthly outflows used for savings rate, runway, and investable cashflow. */
export function monthlyBurn(state: CashflowDashboardState): number {
  const o = finiteNonNeg(state.monthlyExpensesOverride);
  if (o > 0) return o;
  return sumExpenseCategories(state);
}

export function coverageMonths(state: CashflowDashboardState): number | null {
  const reserve = finiteNonNeg(state.emergencyCashReserve);
  const burn = monthlyBurn(state);
  if (burn <= 0) return null;
  return reserve / burn;
}

export function savingsRatePct(state: CashflowDashboardState): number | null {
  const inc = sumIncome(state);
  if (inc <= 0) return null;
  const burn = monthlyBurn(state);
  return ((inc - burn) / inc) * 100;
}

export function investableCashflow(state: CashflowDashboardState): number {
  return sumIncome(state) - monthlyBurn(state);
}

/**
 * Composite 0–100: mostly savings rate, with a boost for emergency runway (up to ~6 months fully reflected).
 * Not net-worth–based; pairs with the cashflow module only.
 */
export function fireSpeedScore(state: CashflowDashboardState): number | null {
  const sr = savingsRatePct(state);
  if (sr === null) return null;
  const cov = coverageMonths(state);
  const runwayPts =
    cov === null ? 0 : Math.min(25, (Math.min(cov, 12) / 12) * 25);
  const savingsPts = Math.min(75, Math.max(0, sr) * 0.75);
  return Math.round(Math.min(100, savingsPts + runwayPts));
}
