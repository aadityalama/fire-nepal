import type { CashflowDashboardState, ExpenseCategoryKey } from "@/components/cashflow/types";
import type { FinancialCoachSnapshot } from "@/components/financial-coach/types";
import { monthlyBurn, sumIncome } from "@/components/cashflow/cashflow-metrics";

export const FIN_INTEL_ROLLUPS_KEY = "fire-nepal-fin-intel-rolls-v1";
const MAX_MONTHS = 14;

const EXPENSE_KEYS: ExpenseCategoryKey[] = [
  "rent",
  "food",
  "transportation",
  "familySupport",
  "emiLoans",
  "entertainment",
  "insurance",
];

function finiteNonNeg(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export type FinancialIntelMonthRollup = {
  month: string;
  expenseByCategory: Record<ExpenseCategoryKey, number>;
  burnNpr: number;
  incomeNpr: number;
  savingsRatePct: number | null;
  fireYearsToFi: number | null;
  netWorthNpr: number;
  updatedAt: string;
};

function snapshotExpenses(cf: CashflowDashboardState): Record<ExpenseCategoryKey, number> {
  const o = {} as Record<ExpenseCategoryKey, number>;
  for (const k of EXPENSE_KEYS) {
    o[k] = finiteNonNeg(cf.expenses[k]);
  }
  return o;
}

/** UTC calendar month key — consistent across devices for rollup series. */
export function currentIntelMonthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function loadIntelMonthRollups(): FinancialIntelMonthRollup[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FIN_INTEL_ROLLUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: FinancialIntelMonthRollup[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Partial<FinancialIntelMonthRollup>;
      if (typeof r.month !== "string" || !/^\d{4}-\d{2}$/.test(r.month)) continue;
      const exp = {} as Record<ExpenseCategoryKey, number>;
      for (const k of EXPENSE_KEYS) exp[k] = 0;
      const src = r.expenseByCategory;
      if (src && typeof src === "object") {
        for (const k of EXPENSE_KEYS) {
          const v = (src as Record<string, unknown>)[k];
          exp[k] = typeof v === "number" && Number.isFinite(v) ? Math.max(0, v) : 0;
        }
      }
      out.push({
        month: r.month,
        expenseByCategory: exp,
        burnNpr: typeof r.burnNpr === "number" && Number.isFinite(r.burnNpr) ? Math.max(0, r.burnNpr) : 0,
        incomeNpr: typeof r.incomeNpr === "number" && Number.isFinite(r.incomeNpr) ? Math.max(0, r.incomeNpr) : 0,
        savingsRatePct:
          typeof r.savingsRatePct === "number" && Number.isFinite(r.savingsRatePct) ? r.savingsRatePct : null,
        fireYearsToFi:
          typeof r.fireYearsToFi === "number" && Number.isFinite(r.fireYearsToFi) ? Math.max(0, r.fireYearsToFi) : null,
        netWorthNpr: typeof r.netWorthNpr === "number" && Number.isFinite(r.netWorthNpr) ? r.netWorthNpr : 0,
        updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
      });
    }
    return out.sort((a, b) => a.month.localeCompare(b.month));
  } catch {
    return [];
  }
}

function saveIntelMonthRollups(rows: FinancialIntelMonthRollup[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIN_INTEL_ROLLUPS_KEY, JSON.stringify(rows));
  } catch {
    /* quota */
  }
}

/**
 * Upserts the current calendar month from live cashflow + coach snapshot, trims history.
 * Safe to call on every dashboard tick — replaces same-month row.
 */
export function upsertCurrentMonthRollup(args: {
  cashflow: CashflowDashboardState;
  coach: FinancialCoachSnapshot;
}): void {
  if (typeof window === "undefined") return;
  const month = currentIntelMonthKey();
  const list = loadIntelMonthRollups().filter((r) => r.month !== month);
  const burnNpr = monthlyBurn(args.cashflow);
  const incomeNpr = sumIncome(args.cashflow);
  const row: FinancialIntelMonthRollup = {
    month,
    expenseByCategory: snapshotExpenses(args.cashflow),
    burnNpr,
    incomeNpr,
    savingsRatePct: args.coach.savingsRatePct,
    fireYearsToFi: args.coach.fireYearsToFi,
    netWorthNpr: Math.max(0, args.coach.netWorthNpr),
    updatedAt: new Date().toISOString(),
  };
  list.push(row);
  const sorted = list.sort((a, b) => a.month.localeCompare(b.month));
  const tail = sorted.slice(-MAX_MONTHS);
  saveIntelMonthRollups(tail);
}
