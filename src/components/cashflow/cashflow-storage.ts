import {
  CASHFLOW_STATE_VERSION,
  type CashflowDashboardState,
  type ExpenseCategoryKey,
  type IncomeSourceKey,
} from "@/components/cashflow/types";

export const CASHFLOW_STORAGE_KEY = "fire-nepal-cashflow-v1";

/** Guest uses legacy key; signed-in users get an isolated key per account (shared-browser safety). */
export function cashflowStorageKey(userId?: string | null): string {
  if (userId) return `${CASHFLOW_STORAGE_KEY}:user:${userId}`;
  return CASHFLOW_STORAGE_KEY;
}

export function isCashflowLocalStorageKey(key: string | null | undefined): boolean {
  if (key == null) return false;
  return key === CASHFLOW_STORAGE_KEY || key.startsWith(`${CASHFLOW_STORAGE_KEY}:user:`);
}

function sanitizeMoney(raw: unknown): number | undefined {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
  if (raw < 0) return undefined;
  return raw;
}

const incomeKeys: IncomeSourceKey[] = [
  "salary",
  "overtime",
  "rentalIncome",
  "dividendIncome",
  "depositInterestIncome",
  "freelanceIncome",
  "businessIncome",
  "socialMediaIncome",
];

const expenseKeys: ExpenseCategoryKey[] = [
  "rent",
  "food",
  "transportation",
  "familySupport",
  "emiLoans",
  "entertainment",
  "insurance",
];

export function defaultCashflowState(): CashflowDashboardState {
  const income = {} as Record<IncomeSourceKey, number | undefined>;
  for (const k of incomeKeys) income[k] = undefined;
  const expenses = {} as Record<ExpenseCategoryKey, number | undefined>;
  for (const k of expenseKeys) expenses[k] = undefined;
  return {
    version: CASHFLOW_STATE_VERSION,
    income,
    expenses,
    emergencyCashReserve: undefined,
    monthlyExpensesOverride: undefined,
  };
}

function sanitizeIncomeRecord(raw: unknown): Record<IncomeSourceKey, number | undefined> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<IncomeSourceKey, unknown>>;
  const out = { ...defaultCashflowState().income };
  for (const k of incomeKeys) {
    out[k] = sanitizeMoney(o[k]);
  }
  return out;
}

function sanitizeExpenseRecord(raw: unknown): Record<ExpenseCategoryKey, number | undefined> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<ExpenseCategoryKey, unknown>>;
  const out = { ...defaultCashflowState().expenses };
  for (const k of expenseKeys) {
    out[k] = sanitizeMoney(o[k]);
  }
  return out;
}

export function sanitizeCashflowState(raw: unknown): CashflowDashboardState {
  if (!raw || typeof raw !== "object") return defaultCashflowState();
  const o = raw as Partial<CashflowDashboardState>;
  return {
    version: CASHFLOW_STATE_VERSION,
    income: sanitizeIncomeRecord(o.income),
    expenses: sanitizeExpenseRecord(o.expenses),
    emergencyCashReserve: sanitizeMoney(o.emergencyCashReserve),
    monthlyExpensesOverride: sanitizeMoney(o.monthlyExpensesOverride),
  };
}

export function loadCashflowState(userId?: string | null): CashflowDashboardState {
  if (typeof window === "undefined") return defaultCashflowState();
  try {
    const s = window.localStorage.getItem(cashflowStorageKey(userId));
    if (!s) return defaultCashflowState();
    return sanitizeCashflowState(JSON.parse(s) as unknown);
  } catch {
    return defaultCashflowState();
  }
}

/** Persist full cashflow document (income, expenses, emergency, override). */
export function saveCashflowState(state: CashflowDashboardState, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cashflowStorageKey(userId), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}
