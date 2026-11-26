/**
 * Aggregate Emergency Fund inputs from existing finance modules.
 * Pure helpers — callers supply already-loaded records (no silent zero for missing sources).
 *
 * Accuracy invariants:
 * - Personal expense `amount` is already NPR (amountCurrency is entry metadata only).
 * - Income and expenses use the same selected period month keys.
 * - Prefer dated income entries over legacy buckets; never sum both when entries exist.
 * - Recurring income is separated from irregular (once/bonus/yearly) for capacity.
 */

import type { CashflowDashboardState, ExpenseCategoryKey, IncomeEntry } from "@/components/cashflow/types";
import {
  currentMonthKey,
  entryMonthlyAmount,
  monthlyBurn,
  sumExpenseCategories,
  sumLegacyIncome,
} from "@/components/cashflow/cashflow-metrics";
import type { BudgetRecord } from "@/lib/budget/types";
import { isEssentialFinanceCategory, ESSENTIAL_CASHFLOW_KEYS } from "@/lib/emergency-fund/essential-categories";
import { normalizeEmergencyCategory } from "@/lib/emergency-fund/category-normalize";
import {
  assessEmergencyDataQuality,
  type DataQualityReport,
} from "@/lib/emergency-fund/data-quality";
import {
  formatMonthLabel,
  resolvePeriodMonthKeys,
  type EmergencyPeriodMode,
} from "@/lib/emergency-fund/period";
import type {
  CurrencyConversionMeta,
  EmergencyFinancialInputs,
  MonthlyEssentialSlice,
} from "@/lib/emergency-fund/types";
import type { Expense } from "@/lib/expense-utils";
import type { FinanceCategoryId } from "@/lib/finance/categories";
import { normalizeIncomeFrequency } from "@/lib/cashflow/income-types";

export type ExpenseLike = {
  amount: number;
  date: string;
  category: string;
  /** Original entry currency metadata — amount is already NPR. */
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

/**
 * Expense amounts are stored in NPR. Do not convert again using amountCurrency.
 * amountCurrency is retained only to detect whether FX was historically involved.
 */
export function buildMonthlyEssentialSlices(
  expenses: ExpenseLike[],
  options: {
    months?: number;
    now?: Date;
    extraIncluded?: readonly FinanceCategoryId[];
    monthKeys?: string[];
  } = {},
): {
  slices: MonthlyEssentialSlice[];
  unclassifiedShare: number;
  hasNonNprEntryMetadata: boolean;
} {
  const now = options.now ?? new Date();
  const extra = options.extraIncluded ?? [];
  const currentKey = currentMonthKey(now);
  const keys = options.monthKeys ?? monthKeysBack(options.months ?? 6, now);
  let classified = 0;
  let totalCounted = 0;
  let hasNonNprEntryMetadata = false;

  const byMonth = new Map<string, { essential: number; total: number; count: number }>();
  for (const key of keys) {
    byMonth.set(key, { essential: 0, total: 0, count: 0 });
  }

  for (const expense of expenses) {
    if (!expense.date || expense.date.length < 7) continue;
    const monthKey = expense.date.slice(0, 7);
    const bucket = byMonth.get(monthKey);
    if (!bucket) continue;

    if (expense.amountCurrency === "KRW" || expense.amountCurrency === "USD") {
      hasNonNprEntryMetadata = true;
    }

    const npr = expense.amount;
    if (!(typeof npr === "number") || !Number.isFinite(npr) || !(npr > 0)) continue;

    bucket.total += npr;
    bucket.count += 1;
    totalCounted += 1;

    const cat = normalizeEmergencyCategory(expense.category);
    if (isEssentialFinanceCategory(cat, extra)) {
      bucket.essential += npr;
      classified += 1;
    } else if (cat === "Other" && !extra.includes("Other")) {
      // unclassified
    } else {
      classified += 1;
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

  return { slices, unclassifiedShare, hasNonNprEntryMetadata };
}

export function averageEssentialFromSlices(
  slices: MonthlyEssentialSlice[],
  options: { preferMonths?: number; maxMonths?: number } = {},
): { averageNpr: number | null; monthsUsed: number; periodLabel: string | null } {
  const prefer = options.preferMonths ?? 3;
  const max = options.maxMonths ?? 6;
  const completed = slices.filter((s) => s.complete && s.hasReliableData).slice(0, max);
  if (completed.length === 0) {
    const current = slices.find((s) => !s.complete && s.hasReliableData);
    if (!current) return { averageNpr: null, monthsUsed: 0, periodLabel: null };
    return {
      averageNpr: current.essentialTotalNpr,
      monthsUsed: 1,
      periodLabel: `${formatMonthLabel(current.monthKey)} (partial)`,
    };
  }

  const windowSize = Math.min(Math.max(prefer, 1), max, completed.length);
  const window = completed.slice(0, windowSize);
  const avg = window.reduce((s, m) => s + m.essentialTotalNpr, 0) / window.length;
  const newest = window[0]!.monthKey;
  const oldest = window[window.length - 1]!.monthKey;
  return {
    averageNpr: Math.round(avg),
    monthsUsed: window.length,
    periodLabel:
      window.length === 1
        ? formatMonthLabel(newest)
        : `${formatMonthLabel(oldest)} → ${formatMonthLabel(newest)}`,
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

function isRecurringIncomeEntry(entry: IncomeEntry): boolean {
  const frequency = normalizeIncomeFrequency(entry);
  if (frequency === "once" || frequency === "yearly") return false;
  if (entry.incomeType === "bonus") return false;
  return frequency === "monthly" || frequency === "weekly";
}

/**
 * Cashflow treats monthly/weekly entries as templates that apply every month.
 * For period analysis, keep only the latest source per name+type that started
 * on or before the month — prevents stacking historical salary rows.
 */
function recurringEntriesActiveInMonth(
  entries: IncomeEntry[],
  monthKey: string,
): IncomeEntry[] {
  const bySource = new Map<string, IncomeEntry>();
  for (const entry of entries) {
    if (!isRecurringIncomeEntry(entry)) continue;
    const startMonth = entry.date.slice(0, 7);
    if (startMonth > monthKey) continue;
    const key = `${entry.name.trim().toLowerCase()}|${entry.incomeType ?? "other"}`;
    const prev = bySource.get(key);
    if (!prev || entry.date >= prev.date) bySource.set(key, entry);
  }
  return [...bySource.values()];
}

function irregularAmountInMonth(entries: IncomeEntry[], monthKey: string): number {
  let sum = 0;
  for (const entry of entries) {
    if (isRecurringIncomeEntry(entry)) continue;
    sum += entryMonthlyAmount(entry, monthKey);
  }
  return sum;
}

export type PeriodIncomeBreakdown = {
  totalNpr: number | null;
  recurringNpr: number | null;
  irregularNpr: number;
  irregularShare: number | null;
  legacyIncomeMixedWithEntries: boolean;
  duplicateIncomeSuspected: boolean;
  usedEntriesOnly: boolean;
};

/**
 * Average income across period month keys.
 * Uses dated entries when present; otherwise legacy monthly buckets (once).
 * Never adds legacy + entries together.
 */
export function sumIncomeForPeriod(
  cashflow: CashflowDashboardState,
  monthKeys: string[],
): PeriodIncomeBreakdown {
  const entries = cashflow.incomeEntries ?? [];
  const hasEntries = entries.length > 0;
  const legacy = sumLegacyIncome(cashflow);
  const legacyIncomeMixedWithEntries = hasEntries && legacy > 0;

  if (!monthKeys.length) {
    return {
      totalNpr: null,
      recurringNpr: null,
      irregularNpr: 0,
      irregularShare: null,
      legacyIncomeMixedWithEntries,
      duplicateIncomeSuspected: false,
      usedEntriesOnly: hasEntries,
    };
  }

  if (!hasEntries) {
    const total = legacy > 0 ? Math.round(legacy) : null;
    return {
      totalNpr: total,
      recurringNpr: total,
      irregularNpr: 0,
      irregularShare: total != null ? 0 : null,
      legacyIncomeMixedWithEntries: false,
      duplicateIncomeSuspected: false,
      usedEntriesOnly: false,
    };
  }

  // Detect near-duplicate entries (same name+amount+date)
  const seen = new Set<string>();
  let duplicateIncomeSuspected = false;
  for (const e of entries) {
    const key = `${e.name.trim().toLowerCase()}|${e.amount}|${e.date}|${e.frequency}`;
    if (seen.has(key)) duplicateIncomeSuspected = true;
    seen.add(key);
  }

  let totalSum = 0;
  let recurringSum = 0;
  let monthsWithIncome = 0;

  for (const monthKey of monthKeys) {
    const recurringEntries = recurringEntriesActiveInMonth(entries, monthKey);
    let monthRecurring = 0;
    for (const entry of recurringEntries) {
      const frequency = normalizeIncomeFrequency(entry);
      const amount = entry.amount;
      if (!(typeof amount === "number") || !Number.isFinite(amount) || amount <= 0) continue;
      monthRecurring += frequency === "weekly" ? Math.round(amount * 4) : amount;
    }
    const monthIrregular = irregularAmountInMonth(entries, monthKey);
    const monthTotal = monthRecurring + monthIrregular;
    if (monthTotal > 0) {
      totalSum += monthTotal;
      recurringSum += monthRecurring;
      monthsWithIncome += 1;
    }
  }

  if (monthsWithIncome === 0) {
    return {
      totalNpr: null,
      recurringNpr: null,
      irregularNpr: 0,
      irregularShare: null,
      legacyIncomeMixedWithEntries,
      duplicateIncomeSuspected,
      usedEntriesOnly: true,
    };
  }

  const totalNpr = Math.round(totalSum / monthsWithIncome);
  const recurringNpr = Math.round(recurringSum / monthsWithIncome);
  const irregularNpr = Math.max(0, totalNpr - recurringNpr);
  const irregularShare = totalNpr > 0 ? irregularNpr / totalNpr : null;

  return {
    totalNpr,
    recurringNpr: recurringNpr > 0 ? recurringNpr : null,
    irregularNpr,
    irregularShare,
    legacyIncomeMixedWithEntries,
    duplicateIncomeSuspected,
    usedEntriesOnly: true,
  };
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
  periodMode?: EmergencyPeriodMode;
  customStartMonth?: string;
  customEndMonth?: string;
  /** Historical essential averaging window (may differ from income period). */
  essentialAvgMonths?: number;
};

export type EmergencyFinancialInputsV2 = EmergencyFinancialInputs & {
  recurringMonthlyIncomeNpr: number | null;
  irregularIncomeShare: number | null;
  incomePeriodLabel: string;
  expensePeriodLabel: string;
  essentialAveragingLabel: string | null;
  periodMode: EmergencyPeriodMode;
  includesPartialCurrent: boolean;
  dataQuality: DataQualityReport;
  incomeMonthKeys: string[];
  expenseMonthKeys: string[];
};

export function buildEmergencyFinancialInputs(
  args: BuildEmergencyFinancialInputsArgs,
): EmergencyFinancialInputsV2 {
  const now = args.now ?? new Date();
  const periodMode: EmergencyPeriodMode = args.periodMode ?? "latest_completed";
  const period = resolvePeriodMonthKeys(periodMode, {
    now,
    customStartMonth: args.customStartMonth,
    customEndMonth: args.customEndMonth,
  });

  const rates: CurrencyConversionMeta = {
    baseCurrency: "NPR",
    krwPerNpr: args.rates?.krwPerNpr ?? null,
    usdPerNpr: args.rates?.usdPerNpr ?? null,
    rateUpdatedAt: args.rates?.rateUpdatedAt ?? null,
    incomplete: false,
    stale: Boolean(args.rates?.stale),
    flaggedMessage: undefined,
  };

  // Broader window for essential averaging disclosure (up to 6 completed months),
  // while primary income/expense totals follow the selected period.
  const essentialAvgMonths = Math.max(1, Math.min(6, args.essentialAvgMonths ?? 3));
  const historyKeys = monthKeysBack(Math.max(6, essentialAvgMonths + 1), now);

  const history = buildMonthlyEssentialSlices(args.expenses, {
    now,
    extraIncluded: args.extraIncludedCategories,
    monthKeys: historyKeys,
  });

  const periodSlices = buildMonthlyEssentialSlices(args.expenses, {
    now,
    extraIncluded: args.extraIncludedCategories,
    monthKeys: period.monthKeys,
  });

  const essentialAvg = averageEssentialFromSlices(history.slices, {
    preferMonths: essentialAvgMonths,
    maxMonths: 6,
  });

  // Actual total expenses for capacity: average over selected period months with data
  const periodTotals = period.monthKeys
    .map((key) => periodSlices.slices.find((s) => s.monthKey === key))
    .filter((s): s is MonthlyEssentialSlice => Boolean(s && s.totalExpenseNpr > 0));
  const actualTotalAvg =
    periodTotals.length > 0
      ? Math.round(periodTotals.reduce((a, s) => a + s.totalExpenseNpr, 0) / periodTotals.length)
      : averageTotalExpensesFromSlices(history.slices, essentialAvgMonths);

  const plannedEssential = sumPlannedEssentialBudget(
    args.budgets,
    args.extraIncludedCategories,
  );
  const cashflowEssential = sumEssentialCashflowCategories(args.cashflow);

  const incomeBreakdown = sumIncomeForPeriod(args.cashflow, period.monthKeys);
  // Display net income = period average total; capacity prefers recurring when available.
  const monthlyNetIncomeNpr = incomeBreakdown.totalNpr;
  const recurringMonthlyIncomeNpr =
    incomeBreakdown.recurringNpr ?? incomeBreakdown.totalNpr;

  const categoryClassificationReliable = history.unclassifiedShare < 0.35;

  // FX incomplete only when we would need rates for amounts not already in NPR.
  // Stored expense amounts are NPR — entry metadata alone does not force incomplete.
  const hasNonNprExpensesNeedingFx = false;

  const expenseMonthsWithData = history.slices.filter((s) => s.hasReliableData).length;

  const dataQuality = assessEmergencyDataQuality({
    monthlyNetIncomeNpr,
    recurringMonthlyIncomeNpr,
    irregularIncomeShare: incomeBreakdown.irregularShare,
    actualMonthlyTotalExpensesNpr: actualTotalAvg,
    actualEssentialMonthlyAvgNpr: essentialAvg.averageNpr,
    plannedEssentialMonthlyNpr: plannedEssential,
    cashflowEssentialMonthlyNpr: cashflowEssential,
    expenseMonthsWithData,
    requestedExpenseMonths: essentialAvgMonths,
    incomeMonthKeys: period.monthKeys,
    expenseMonthKeys: period.monthKeys,
    includesPartialCurrent: period.includesPartialCurrent,
    categoryClassificationReliable,
    currency: rates,
    hasNonNprExpensesNeedingFx,
    duplicateIncomeSuspected: incomeBreakdown.duplicateIncomeSuspected,
    legacyIncomeMixedWithEntries: incomeBreakdown.legacyIncomeMixedWithEntries,
  });

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
    analysisPeriodLabel: period.label,
    monthlySlices: history.slices,
    categoryClassificationReliable,
    currency: rates,
    fetchedAt: args.fetchedAt ?? now.toISOString(),
    recurringMonthlyIncomeNpr,
    irregularIncomeShare: incomeBreakdown.irregularShare,
    incomePeriodLabel: period.label,
    expensePeriodLabel: period.label,
    essentialAveragingLabel: essentialAvg.periodLabel,
    periodMode,
    includesPartialCurrent: period.includesPartialCurrent,
    dataQuality,
    incomeMonthKeys: period.monthKeys,
    expenseMonthKeys: period.monthKeys,
  };
}

export function expensesToExpenseLike(expenses: Expense[]): ExpenseLike[] {
  return expenses.map((e) => ({
    amount: e.amount,
    date: e.date,
    category: e.category,
    amountCurrency: e.amountCurrency === "KRW" ? "KRW" : "NPR",
  }));
}

export function cashflowTotalExpenseEstimate(state: CashflowDashboardState): number | null {
  const sum = sumExpenseCategories(state);
  if (sum > 0) return Math.round(sum);
  const burn = monthlyBurn(state);
  return burn > 0 ? Math.round(burn) : null;
}
