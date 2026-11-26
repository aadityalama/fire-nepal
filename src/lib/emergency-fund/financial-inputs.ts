/**
 * Aggregate Emergency Fund inputs from existing finance modules.
 * Pure helpers — callers supply already-loaded records (no silent zero for missing sources).
 */

import type { CashflowDashboardState, ExpenseCategoryKey } from "@/components/cashflow/types";
import {
  currentMonthKey,
  monthlyBurn,
  sumIncome,
  sumExpenseCategories,
} from "@/components/cashflow/cashflow-metrics";
import type { BudgetRecord } from "@/lib/budget/types";
import { isEssentialFinanceCategory, ESSENTIAL_CASHFLOW_KEYS } from "@/lib/emergency-fund/essential-categories";
import type {
  CurrencyConversionMeta,
  EmergencyFinancialInputs,
  MonthlyEssentialSlice,
} from "@/lib/emergency-fund/types";
import type { Expense } from "@/lib/expense-utils";
import type { FinanceCategoryId } from "@/lib/finance/categories";
import { normalizeEmergencyCategory } from "@/lib/emergency-fund/category-normalize";

export type ExpenseLike = {
  amount: number;
  date: string;
  category: string;
  amountCurrency?: "NPR" | "KRW" | "USD";
};

function monthKeysBack(count: number, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(currentMonthKey(d));
  }
  return keys;
}

function convertToNpr(
  amount: number,
  currency: "NPR" | "KRW" | "USD" | undefined,
  rates: CurrencyConversionMeta,
): { npr: number | null; incomplete: boolean } {
  const cur = currency ?? "NPR";
  if (cur === "NPR") return { npr: amount, incomplete: false };
  if (cur === "KRW") {
    if (rates.krwPerNpr == null || !(rates.krwPerNpr > 0)) {
      return { npr: null, incomplete: true };
    }
    return { npr: amount / rates.krwPerNpr, incomplete: false };
  }
  if (cur === "USD") {
    if (rates.usdPerNpr == null || !(rates.usdPerNpr > 0)) {
      return { npr: null, incomplete: true };
    }
    return { npr: amount / rates.usdPerNpr, incomplete: false };
  }
  return { npr: null, incomplete: true };
}

export function sumEssentialCashflowCategories(state: CashflowDashboardState): number | null {
  let sum = 0;
  let any = false;
  for (const key of ESSENTIAL_CASHFLOW_KEYS) {
    const v = state.expenses[key as ExpenseCategoryKey];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      sum += v;
      any = true;
    }
  }
  // Prefer essential-only sum; fall back to full monthlyBurn if override set.
  const override = state.monthlyExpensesOverride;
  if (typeof override === "number" && Number.isFinite(override) && override > 0) {
    return Math.round(override);
  }
  if (!any) {
    const burn = monthlyBurn(state);
    return burn > 0 ? Math.round(burn) : null;
  }
  return Math.round(sum);
}

/**
 * Planned essential monthly expenses from Budget Planner.
 * Yearly budgets are converted to monthly. Does NOT count as actual spend.
 */
export function sumPlannedEssentialBudget(
  budgets: BudgetRecord[],
  extraIncluded: readonly FinanceCategoryId[] = [],
): number | null {
  if (!budgets.length) return null;
  let sum = 0;
  let any = false;
  for (const b of budgets) {
    if (!isEssentialFinanceCategory(b.category, extraIncluded)) continue;
    const monthly = Number.isFinite(b.monthlyBudgetNpr)
      ? b.monthlyBudgetNpr
      : b.period === "Yearly"
        ? b.amountNpr / 12
        : b.amountNpr;
    if (monthly > 0) {
      sum += monthly;
      any = true;
    }
  }
  return any ? Math.round(sum) : null;
}

export function buildMonthlyEssentialSlices(
  expenses: ExpenseLike[],
  options: {
    months?: number;
    now?: Date;
    extraIncluded?: readonly FinanceCategoryId[];
    rates?: CurrencyConversionMeta;
  } = {},
): { slices: MonthlyEssentialSlice[]; incompleteConversion: boolean; unclassifiedShare: number } {
  const months = options.months ?? 6;
  const now = options.now ?? new Date();
  const extra = options.extraIncluded ?? [];
  const rates: CurrencyConversionMeta = options.rates ?? {
    baseCurrency: "NPR",
    krwPerNpr: null,
    usdPerNpr: null,
    rateUpdatedAt: null,
    incomplete: false,
    stale: false,
  };

  const currentKey = currentMonthKey(now);
  const keys = monthKeysBack(months, now);
  let incompleteConversion = false;
  let classified = 0;
  let totalCounted = 0;

  const byMonth = new Map<string, { essential: number; total: number; count: number }>();
  for (const key of keys) {
    byMonth.set(key, { essential: 0, total: 0, count: 0 });
  }

  for (const expense of expenses) {
    if (!expense.date || expense.date.length < 7) continue;
    const monthKey = expense.date.slice(0, 7);
    const bucket = byMonth.get(monthKey);
    if (!bucket) continue;

    const converted = convertToNpr(
      expense.amount,
      expense.amountCurrency,
      rates,
    );
    if (converted.incomplete || converted.npr == null) {
      incompleteConversion = true;
      continue;
    }
    const npr = converted.npr;
    if (!(npr > 0)) continue;

    bucket.total += npr;
    bucket.count += 1;
    totalCounted += 1;

    const cat = normalizeEmergencyCategory(expense.category);
    // Unclassified "Other" without user opt-in reduces reliability.
    if (isEssentialFinanceCategory(cat, extra)) {
      bucket.essential += npr;
      classified += 1;
    } else if (cat === "Other" && !extra.includes("Other")) {
      // leave unclassified
    } else {
      classified += 1; // known discretionary — classified as non-essential
    }
  }

  const slices: MonthlyEssentialSlice[] = keys.map((monthKey) => {
    const bucket = byMonth.get(monthKey)!;
    return {
      monthKey,
      essentialTotalNpr: Math.round(bucket.essential),
      totalExpenseNpr: Math.round(bucket.total),
      complete: monthKey !== currentKey,
      hasReliableData: bucket.count > 0 && bucket.essential > 0,
    };
  });

  const unclassifiedShare =
    totalCounted > 0 ? Math.max(0, 1 - classified / totalCounted) : 0;

  return { slices, incompleteConversion, unclassifiedShare };
}

/**
 * Average essential expenses across the latest N completed months with reliable data.
 * Prefers 3 months; expands up to 6 when available.
 */
export function averageEssentialFromSlices(
  slices: MonthlyEssentialSlice[],
  options: { preferMonths?: number; maxMonths?: number } = {},
): { averageNpr: number | null; monthsUsed: number; periodLabel: string | null } {
  const prefer = options.preferMonths ?? 3;
  const max = options.maxMonths ?? 6;
  // slices are newest-first from buildMonthlyEssentialSlices
  const completed = slices.filter((s) => s.complete && s.hasReliableData).slice(0, max);
  if (completed.length === 0) {
    // Fall back to current partial month only if it has data — labeled as estimate via caller.
    const current = slices.find((s) => !s.complete && s.hasReliableData);
    if (!current) return { averageNpr: null, monthsUsed: 0, periodLabel: null };
    return {
      averageNpr: current.essentialTotalNpr,
      monthsUsed: 1,
      periodLabel: `${current.monthKey} (partial month)`,
    };
  }

  // Default: latest 3 completed months. When preferMonths is raised (e.g. 6), use up to that.
  const windowSize = Math.min(Math.max(prefer, 1), max, completed.length);
  const window = completed.slice(0, windowSize);
  const avg = window.reduce((s, m) => s + m.essentialTotalNpr, 0) / window.length;
  const newest = window[0]!.monthKey;
  const oldest = window[window.length - 1]!.monthKey;
  return {
    averageNpr: Math.round(avg),
    monthsUsed: window.length,
    periodLabel: window.length === 1 ? newest : `${oldest} → ${newest}`,
  };
}

export function averageTotalExpensesFromSlices(
  slices: MonthlyEssentialSlice[],
  preferMonths = 3,
): number | null {
  const completed = slices.filter((s) => s.complete && s.totalExpenseNpr > 0).slice(0, preferMonths);
  if (completed.length === 0) {
    const current = slices.find((s) => !s.complete && s.totalExpenseNpr > 0);
    return current ? current.totalExpenseNpr : null;
  }
  const window = completed.slice(0, preferMonths);
  return Math.round(window.reduce((s, m) => s + m.totalExpenseNpr, 0) / window.length);
}

export type BuildEmergencyFinancialInputsArgs = {
  cashflow: CashflowDashboardState;
  expenses: ExpenseLike[];
  budgets: BudgetRecord[];
  monthlyInsuranceObligationNpr?: number | null;
  extraIncludedCategories?: FinanceCategoryId[];
  rates?: CurrencyConversionMeta;
  now?: Date;
  fetchedAt?: string;
};

export function buildEmergencyFinancialInputs(
  args: BuildEmergencyFinancialInputsArgs,
): EmergencyFinancialInputs {
  const now = args.now ?? new Date();
  const rates: CurrencyConversionMeta = {
    baseCurrency: "NPR",
    krwPerNpr: args.rates?.krwPerNpr ?? null,
    usdPerNpr: args.rates?.usdPerNpr ?? null,
    rateUpdatedAt: args.rates?.rateUpdatedAt ?? null,
    incomplete: Boolean(args.rates?.incomplete),
    stale: Boolean(args.rates?.stale),
    flaggedMessage: args.rates?.flaggedMessage,
  };

  const { slices, incompleteConversion, unclassifiedShare } = buildMonthlyEssentialSlices(
    args.expenses,
    {
      months: 6,
      now,
      extraIncluded: args.extraIncludedCategories,
      rates,
    },
  );

  if (incompleteConversion) {
    rates.incomplete = true;
    rates.flaggedMessage =
      rates.flaggedMessage ??
      "Some expense amounts could not be converted — missing exchange rate data.";
  }

  const essentialAvg = averageEssentialFromSlices(slices, { preferMonths: 3, maxMonths: 6 });
  const actualTotalAvg = averageTotalExpensesFromSlices(slices, 3);
  const plannedEssential = sumPlannedEssentialBudget(
    args.budgets,
    args.extraIncludedCategories,
  );
  const cashflowEssential = sumEssentialCashflowCategories(args.cashflow);
  const income = sumIncome(args.cashflow);
  const monthlyNetIncomeNpr = income > 0 ? Math.round(income) : null;

  // Reliability: too many "Other" uncategorized expenses.
  const categoryClassificationReliable = unclassifiedShare < 0.35;

  return {
    monthlyNetIncomeNpr,
    actualMonthlyTotalExpensesNpr: actualTotalAvg,
    actualEssentialMonthlyAvgNpr: essentialAvg.averageNpr,
    plannedEssentialMonthlyNpr: plannedEssential,
    cashflowEssentialMonthlyNpr: cashflowEssential,
    monthlyInsuranceObligationNpr:
      args.monthlyInsuranceObligationNpr != null && args.monthlyInsuranceObligationNpr > 0
        ? Math.round(args.monthlyInsuranceObligationNpr)
        : null,
    analysisMonthsUsed: essentialAvg.monthsUsed,
    analysisPeriodLabel: essentialAvg.periodLabel,
    monthlySlices: slices,
    categoryClassificationReliable,
    currency: rates,
    fetchedAt: args.fetchedAt ?? now.toISOString(),
  };
}

/** Convert personal Expense[] into ExpenseLike without mutating. */
export function expensesToExpenseLike(expenses: Expense[]): ExpenseLike[] {
  return expenses.map((e) => ({
    amount: e.amount,
    date: e.date,
    category: e.category,
    amountCurrency: e.amountCurrency === "KRW" ? "KRW" : "NPR",
  }));
}

/** Cashflow essential burn used when expense tracker history is empty (estimate). */
export function cashflowTotalExpenseEstimate(state: CashflowDashboardState): number | null {
  const sum = sumExpenseCategories(state);
  if (sum > 0) return Math.round(sum);
  const burn = monthlyBurn(state);
  return burn > 0 ? Math.round(burn) : null;
}
