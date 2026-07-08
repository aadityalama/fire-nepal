import {
  CASHFLOW_STATE_VERSION,
  type CashflowDashboardState,
  type ExpenseCategoryKey,
  type IncomeEntry,
  type IncomeSourceKey,
} from "@/components/cashflow/types";
import type { CashflowIncomeTypeId } from "@/lib/cashflow/income-types";
import { normalizeIncomeFrequency, normalizeIncomeType } from "@/lib/cashflow/income-types";
import { INCOME_SOURCE_META } from "@/components/cashflow/cashflow-constants";

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

function sanitizeIncomeEntry(raw: unknown): IncomeEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<IncomeEntry> & { incomeSource?: string };
  const amount = sanitizeMoney(o.amount);
  if (amount === undefined || amount <= 0) return null;
  if (typeof o.id !== "string" || !o.id.trim()) return null;
  if (typeof o.name !== "string" || !o.name.trim()) return null;
  if (typeof o.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) return null;
  const incomeType = normalizeIncomeType(String(o.incomeType ?? "other"));
  const frequency = normalizeIncomeFrequency(o);
  return {
    id: o.id.trim(),
    name: o.name.trim(),
    amount,
    incomeType,
    frequency,
    date: o.date,
    note: typeof o.note === "string" && o.note.trim() ? o.note.trim() : undefined,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : new Date().toISOString(),
  };
}

function sanitizeIncomeEntries(raw: unknown): IncomeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeIncomeEntry).filter((entry): entry is IncomeEntry => entry !== null);
}

function mapLegacyIncomeKeyToType(key: IncomeSourceKey): CashflowIncomeTypeId {
  if (key === "salary") return "salary";
  if (key === "overtime") return "overtime";
  if (key === "dividendIncome" || key === "depositInterestIncome") return "dividend";
  if (key === "rentalIncome") return "rental";
  if (key === "freelanceIncome" || key === "socialMediaIncome") return "freelance";
  if (key === "businessIncome") return "business";
  return "other";
}

/** One-time migration: legacy monthly income keys → dated entries (keeps sync fields at zero). */
function migrateLegacyIncomeToEntries(state: CashflowDashboardState): IncomeEntry[] {
  const existing = state.incomeEntries ?? [];
  if (existing.length > 0) return existing;

  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const migrated: IncomeEntry[] = [];

  for (const meta of INCOME_SOURCE_META) {
    const amount = state.income[meta.key];
    if (typeof amount !== "number" || amount <= 0) continue;
    migrated.push({
      id: `legacy-${meta.key}`,
      name: meta.label,
      amount,
      incomeType: mapLegacyIncomeKeyToType(meta.key),
      frequency: "monthly",
      date,
      createdAt: new Date().toISOString(),
    });
  }

  return migrated;
}

function clearLegacyIncomeAfterMigration(state: CashflowDashboardState, migrated: IncomeEntry[]): CashflowDashboardState {
  if (migrated.length === 0 || (state.incomeEntries?.length ?? 0) > 0) return state;
  const income = { ...defaultCashflowState().income };
  return { ...state, income, incomeEntries: migrated };
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
  let state: CashflowDashboardState = {
    version: CASHFLOW_STATE_VERSION,
    income: sanitizeIncomeRecord(o.income),
    incomeEntries: sanitizeIncomeEntries(o.incomeEntries),
    expenses: sanitizeExpenseRecord(o.expenses),
    emergencyCashReserve: sanitizeMoney(o.emergencyCashReserve),
    monthlyExpensesOverride: sanitizeMoney(o.monthlyExpensesOverride),
  };
  const migrated = migrateLegacyIncomeToEntries(state);
  state = clearLegacyIncomeAfterMigration(state, migrated);
  return state;
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
