/**
 * Pure historical finance aggregation for FireNepal analytics.
 * Derives income from cashflow snapshots and expenses from expense transaction rows.
 * Never fabricates values — empty periods are 0 / no data.
 */

import {
  currentMonthKey,
  entryMonthlyAmount,
  sumLegacyIncome,
} from "@/components/cashflow/cashflow-metrics";
import type { CashflowDashboardState, IncomeEntry } from "@/components/cashflow/types";
import { CASHFLOW_INCOME_TYPES, type CashflowIncomeTypeId } from "@/lib/cashflow/income-types";
import {
  FINANCE_CATEGORY_IDS,
  getFinanceCategoryLabel,
  normalizeFinanceCategory,
  type FinanceCategoryId,
} from "@/lib/finance/categories";
import type { ExpenseTransactionRow } from "@/lib/transaction-history-types";

export type HistoricalPeriodPreset =
  | "monthly"
  | "yearly"
  | "1y"
  | "2y"
  | "5y"
  | "current_month"
  | "previous_month"
  | "current_year"
  | "previous_year"
  | "custom";

export type MonthKey = string; // YYYY-MM
export type YearKey = string; // YYYY

export type HistoricalMonthPoint = {
  key: MonthKey;
  label: string;
  shortLabel: string;
  income: number;
  expense: number;
  netCashflow: number;
  savings: number;
  hasData: boolean;
};

export type HistoricalYearPoint = {
  key: YearKey;
  label: string;
  income: number;
  expense: number;
  netCashflow: number;
  savings: number;
  hasData: boolean;
  monthsWithData: number;
};

export type CategoryBreakdownItem = {
  category: FinanceCategoryId;
  label: string;
  amount: number;
};

export type IncomeSourceBreakdownItem = {
  source: CashflowIncomeTypeId | "legacy";
  label: string;
  amount: number;
};

export type HistoricalSummary = {
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  savings: number;
  savingsRate: number | null;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  highestIncomeMonth: HistoricalMonthPoint | null;
  highestExpenseMonth: HistoricalMonthPoint | null;
  monthsInRange: number;
  monthsWithData: number;
  hasAnyData: boolean;
};

export type PeriodDetail = {
  key: string;
  label: string;
  totalIncome: number;
  totalExpenses: number;
  netCashflow: number;
  expenseCategories: CategoryBreakdownItem[];
  incomeSources: IncomeSourceBreakdownItem[];
  transactionCount: number;
  largestExpense: { description: string; amount: number; date: string } | null;
  largestIncome: { description: string; amount: number; date: string } | null;
};

export type HistoricalRange = {
  startMonth: MonthKey;
  endMonth: MonthKey;
  monthKeys: MonthKey[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toMonthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function parseMonthKey(monthKey: MonthKey): { year: number; month: number } {
  const [y, m] = monthKey.split("-").map(Number);
  return { year: y || 1970, month: m || 1 };
}

export function addMonths(monthKey: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(monthKey);
  const d = new Date(year, month - 1 + delta, 1);
  return toMonthKey(d);
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function formatMonthLabel(monthKey: MonthKey): string {
  const { year, month } = parseMonthKey(monthKey);
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function formatMonthShortLabel(monthKey: MonthKey): string {
  const { year, month } = parseMonthKey(monthKey);
  const d = new Date(year, month - 1, 1);
  return `${d.toLocaleDateString("en-GB", { month: "short" })} ${String(year).slice(2)}`;
}

export function listMonthKeysInclusive(startMonth: MonthKey, endMonth: MonthKey): MonthKey[] {
  if (compareMonthKeys(startMonth, endMonth) > 0) return [];
  const keys: MonthKey[] = [];
  let cursor = startMonth;
  // Hard cap at 120 months to avoid runaway loops
  for (let i = 0; i < 120; i += 1) {
    keys.push(cursor);
    if (cursor === endMonth) break;
    cursor = addMonths(cursor, 1);
  }
  return keys;
}

export function resolveHistoricalRange(
  preset: HistoricalPeriodPreset,
  options?: {
    now?: Date;
    selectedYear?: number;
    customFrom?: string; // YYYY-MM-DD or YYYY-MM
    customTo?: string;
  },
): HistoricalRange {
  const now = options?.now ?? new Date();
  const endMonth = toMonthKey(now);
  const year = options?.selectedYear ?? now.getFullYear();

  const monthFromDateLike = (raw: string | undefined, fallback: MonthKey): MonthKey => {
    if (!raw) return fallback;
    if (/^\d{4}-\d{2}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 7);
    return fallback;
  };

  switch (preset) {
    case "current_month":
      return { startMonth: endMonth, endMonth, monthKeys: [endMonth] };
    case "previous_month": {
      const prev = addMonths(endMonth, -1);
      return { startMonth: prev, endMonth: prev, monthKeys: [prev] };
    }
    case "current_year": {
      const start = `${now.getFullYear()}-01`;
      return { startMonth: start, endMonth, monthKeys: listMonthKeysInclusive(start, endMonth) };
    }
    case "previous_year": {
      const y = now.getFullYear() - 1;
      const start = `${y}-01`;
      const end = `${y}-12`;
      return { startMonth: start, endMonth: end, monthKeys: listMonthKeysInclusive(start, end) };
    }
    case "monthly": {
      const start = `${year}-01`;
      const end = year === now.getFullYear() ? endMonth : `${year}-12`;
      const cappedEnd = compareMonthKeys(end, endMonth) > 0 ? endMonth : end;
      return { startMonth: start, endMonth: cappedEnd, monthKeys: listMonthKeysInclusive(start, cappedEnd) };
    }
    case "yearly": {
      // Show up to last 10 calendar years ending at current year (monthly buckets still used for math)
      const startYear = now.getFullYear() - 9;
      const start = `${startYear}-01`;
      return { startMonth: start, endMonth, monthKeys: listMonthKeysInclusive(start, endMonth) };
    }
    case "1y": {
      const start = addMonths(endMonth, -11);
      return { startMonth: start, endMonth, monthKeys: listMonthKeysInclusive(start, endMonth) };
    }
    case "2y": {
      const start = addMonths(endMonth, -23);
      return { startMonth: start, endMonth, monthKeys: listMonthKeysInclusive(start, endMonth) };
    }
    case "5y": {
      const start = addMonths(endMonth, -59);
      return { startMonth: start, endMonth, monthKeys: listMonthKeysInclusive(start, endMonth) };
    }
    case "custom": {
      const start = monthFromDateLike(options?.customFrom, addMonths(endMonth, -11));
      let end = monthFromDateLike(options?.customTo, endMonth);
      if (compareMonthKeys(end, endMonth) > 0) end = endMonth;
      if (compareMonthKeys(start, end) > 0) {
        return { startMonth: end, endMonth: end, monthKeys: [end] };
      }
      return { startMonth: start, endMonth: end, monthKeys: listMonthKeysInclusive(start, end) };
    }
    default: {
      const start = addMonths(endMonth, -11);
      return { startMonth: start, endMonth, monthKeys: listMonthKeysInclusive(start, endMonth) };
    }
  }
}

/** Entry start month — recurring income does not apply before this. */
export function incomeEntryStartMonth(entry: IncomeEntry): MonthKey {
  if (entry.date && /^\d{4}-\d{2}/.test(entry.date)) return entry.date.slice(0, 7);
  if (entry.createdAt && /^\d{4}-\d{2}/.test(entry.createdAt)) return entry.createdAt.slice(0, 7);
  return currentMonthKey();
}

/**
 * Historical monthly income from cashflow entries.
 * Recurring monthly/weekly income only counts from the entry's start month forward (never before).
 * Legacy income buckets only apply to the current calendar month.
 */
export function historicalIncomeForMonth(
  state: CashflowDashboardState,
  monthKey: MonthKey,
  now = new Date(),
): number {
  const entries = state.incomeEntries ?? [];
  let total = 0;
  for (const entry of entries) {
    if (compareMonthKeys(monthKey, incomeEntryStartMonth(entry)) < 0) continue;
    total += entryMonthlyAmount(entry, monthKey);
  }
  if (monthKey === toMonthKey(now)) {
    total += sumLegacyIncome(state);
  }
  return total;
}

export function historicalIncomeBySourceForMonth(
  state: CashflowDashboardState,
  monthKey: MonthKey,
  now = new Date(),
): IncomeSourceBreakdownItem[] {
  const bySource = new Map<CashflowIncomeTypeId | "legacy", number>();
  for (const entry of state.incomeEntries ?? []) {
    if (compareMonthKeys(monthKey, incomeEntryStartMonth(entry)) < 0) continue;
    const amount = entryMonthlyAmount(entry, monthKey);
    if (amount <= 0) continue;
    bySource.set(entry.incomeType, (bySource.get(entry.incomeType) ?? 0) + amount);
  }
  if (monthKey === toMonthKey(now)) {
    const legacy = sumLegacyIncome(state);
    if (legacy > 0) bySource.set("legacy", legacy);
  }
  return Array.from(bySource.entries())
    .map(([source, amount]) => ({
      source,
      label:
        source === "legacy"
          ? "Legacy income"
          : (CASHFLOW_INCOME_TYPES.find((t) => t.id === source)?.label ?? source),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function isActiveExpenseRow(row: ExpenseTransactionRow): boolean {
  return row.deleted_at == null && row.transaction_type === "expense";
}

function isActiveIncomeRow(row: ExpenseTransactionRow): boolean {
  return row.deleted_at == null && row.transaction_type === "income";
}

export function expenseAmountForMonth(rows: ExpenseTransactionRow[], monthKey: MonthKey): number {
  return rows.reduce((acc, row) => {
    if (!isActiveExpenseRow(row)) return acc;
    if (!row.transaction_date.startsWith(monthKey)) return acc;
    const amount = Number(row.amount);
    return acc + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}

/** Optional ledger income rows (if any) — additive to cashflow income for that month. */
export function ledgerIncomeForMonth(rows: ExpenseTransactionRow[], monthKey: MonthKey): number {
  return rows.reduce((acc, row) => {
    if (!isActiveIncomeRow(row)) return acc;
    if (!row.transaction_date.startsWith(monthKey)) return acc;
    const amount = Number(row.amount);
    return acc + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}

export function expenseCategoryBreakdownForMonths(
  rows: ExpenseTransactionRow[],
  monthKeys: MonthKey[],
): CategoryBreakdownItem[] {
  const keySet = new Set(monthKeys);
  const totals = new Map<FinanceCategoryId, number>();
  for (const id of FINANCE_CATEGORY_IDS) totals.set(id, 0);

  for (const row of rows) {
    if (!isActiveExpenseRow(row)) continue;
    const mk = row.transaction_date.slice(0, 7);
    if (!keySet.has(mk)) continue;
    const cat = normalizeFinanceCategory(row.category ?? "Other");
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    totals.set(cat, (totals.get(cat) ?? 0) + amount);
  }

  return FINANCE_CATEGORY_IDS.map((category) => ({
    category,
    label: getFinanceCategoryLabel(category),
    amount: totals.get(category) ?? 0,
  })).filter((item) => item.amount > 0);
}

export function monthHasRecordedData(
  state: CashflowDashboardState,
  rows: ExpenseTransactionRow[],
  monthKey: MonthKey,
  now = new Date(),
): boolean {
  if (historicalIncomeForMonth(state, monthKey, now) > 0) return true;
  if (ledgerIncomeForMonth(rows, monthKey) > 0) return true;
  if (expenseAmountForMonth(rows, monthKey) > 0) return true;
  // Explicit zero-amount records still count as "has data" if any transaction exists that month
  return rows.some(
    (row) =>
      row.deleted_at == null &&
      (row.transaction_type === "expense" || row.transaction_type === "income") &&
      row.transaction_date.startsWith(monthKey),
  );
}

export function buildMonthlySeries(
  state: CashflowDashboardState,
  rows: ExpenseTransactionRow[],
  monthKeys: MonthKey[],
  now = new Date(),
): HistoricalMonthPoint[] {
  return monthKeys.map((key) => {
    const income = historicalIncomeForMonth(state, key, now) + ledgerIncomeForMonth(rows, key);
    const expense = expenseAmountForMonth(rows, key);
    const netCashflow = income - expense;
    const hasData = monthHasRecordedData(state, rows, key, now);
    return {
      key,
      label: formatMonthLabel(key),
      shortLabel: formatMonthShortLabel(key),
      income,
      expense,
      netCashflow,
      savings: netCashflow,
      hasData,
    };
  });
}

export function buildYearlySeries(months: HistoricalMonthPoint[]): HistoricalYearPoint[] {
  const byYear = new Map<YearKey, HistoricalYearPoint>();
  for (const m of months) {
    const year = m.key.slice(0, 4);
    const existing = byYear.get(year) ?? {
      key: year,
      label: year,
      income: 0,
      expense: 0,
      netCashflow: 0,
      savings: 0,
      hasData: false,
      monthsWithData: 0,
    };
    existing.income += m.income;
    existing.expense += m.expense;
    existing.netCashflow += m.netCashflow;
    existing.savings += m.savings;
    if (m.hasData) {
      existing.hasData = true;
      existing.monthsWithData += 1;
    }
    byYear.set(year, existing);
  }
  return Array.from(byYear.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function buildHistoricalSummary(months: HistoricalMonthPoint[]): HistoricalSummary {
  const totalIncome = months.reduce((a, m) => a + m.income, 0);
  const totalExpenses = months.reduce((a, m) => a + m.expense, 0);
  const netCashflow = totalIncome - totalExpenses;
  const monthsWithData = months.filter((m) => m.hasData).length;
  const divisor = monthsWithData > 0 ? monthsWithData : 0;
  const averageMonthlyIncome = divisor > 0 ? totalIncome / divisor : 0;
  const averageMonthlyExpenses = divisor > 0 ? totalExpenses / divisor : 0;

  let highestIncomeMonth: HistoricalMonthPoint | null = null;
  let highestExpenseMonth: HistoricalMonthPoint | null = null;
  for (const m of months) {
    if (!m.hasData) continue;
    if (!highestIncomeMonth || m.income > highestIncomeMonth.income) highestIncomeMonth = m;
    if (!highestExpenseMonth || m.expense > highestExpenseMonth.expense) highestExpenseMonth = m;
  }

  return {
    totalIncome,
    totalExpenses,
    netCashflow,
    savings: netCashflow,
    savingsRate: totalIncome > 0 ? (netCashflow / totalIncome) * 100 : null,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    highestIncomeMonth,
    highestExpenseMonth,
    monthsInRange: months.length,
    monthsWithData,
    hasAnyData: monthsWithData > 0,
  };
}

export function buildPeriodDetail(
  state: CashflowDashboardState,
  rows: ExpenseTransactionRow[],
  monthKeys: MonthKey[],
  label: string,
  key: string,
  now = new Date(),
): PeriodDetail {
  const keySet = new Set(monthKeys);
  let totalIncome = 0;
  let totalExpenses = 0;
  const incomeSourceMap = new Map<CashflowIncomeTypeId | "legacy", number>();

  for (const mk of monthKeys) {
    totalIncome += historicalIncomeForMonth(state, mk, now) + ledgerIncomeForMonth(rows, mk);
    totalExpenses += expenseAmountForMonth(rows, mk);
    for (const item of historicalIncomeBySourceForMonth(state, mk, now)) {
      incomeSourceMap.set(item.source, (incomeSourceMap.get(item.source) ?? 0) + item.amount);
    }
  }

  const periodRows = rows.filter(
    (row) =>
      row.deleted_at == null &&
      (row.transaction_type === "expense" || row.transaction_type === "income") &&
      keySet.has(row.transaction_date.slice(0, 7)),
  );

  let largestExpense: PeriodDetail["largestExpense"] = null;
  let largestIncome: PeriodDetail["largestIncome"] = null;

  for (const row of periodRows) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    if (row.transaction_type === "expense") {
      if (!largestExpense || amount > largestExpense.amount) {
        largestExpense = { description: row.description, amount, date: row.transaction_date };
      }
    }
    if (row.transaction_type === "income") {
      if (!largestIncome || amount > largestIncome.amount) {
        largestIncome = { description: row.description, amount, date: row.transaction_date };
      }
    }
  }

  // Largest income from cashflow entries if ledger has none
  if (!largestIncome) {
    for (const entry of state.incomeEntries ?? []) {
      for (const mk of monthKeys) {
        if (compareMonthKeys(mk, incomeEntryStartMonth(entry)) < 0) continue;
        const amount = entryMonthlyAmount(entry, mk);
        if (amount <= 0) continue;
        if (!largestIncome || amount > largestIncome.amount) {
          largestIncome = { description: entry.name, amount, date: entry.date };
        }
      }
    }
  }

  const incomeSources = Array.from(incomeSourceMap.entries())
    .map(([source, amount]) => ({
      source,
      label:
        source === "legacy"
          ? "Legacy income"
          : (CASHFLOW_INCOME_TYPES.find((t) => t.id === source)?.label ?? source),
      amount,
    }))
    .filter((i) => i.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return {
    key,
    label,
    totalIncome,
    totalExpenses,
    netCashflow: totalIncome - totalExpenses,
    expenseCategories: expenseCategoryBreakdownForMonths(rows, monthKeys),
    incomeSources,
    transactionCount: periodRows.length + (state.incomeEntries ?? []).filter((entry) =>
      monthKeys.some((mk) => compareMonthKeys(mk, incomeEntryStartMonth(entry)) >= 0 && entryMonthlyAmount(entry, mk) > 0),
    ).length,
    largestExpense,
    largestIncome,
  };
}

export function yearOverYearComparison(years: HistoricalYearPoint[]): HistoricalYearPoint[] {
  return years.filter((y) => y.hasData);
}
