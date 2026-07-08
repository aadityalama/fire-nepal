import type { CashflowIncomeTypeId, IncomeFrequency } from "@/lib/cashflow/income-types";

/** Monthly cashflow dashboard (separate from portfolio v2 storage). */
export const CASHFLOW_STATE_VERSION = 1 as const;

export type IncomeEntry = {
  id: string;
  name: string;
  amount: number;
  incomeType: CashflowIncomeTypeId;
  frequency: IncomeFrequency;
  /** Last received date (ISO YYYY-MM-DD). */
  date: string;
  note?: string;
  createdAt: string;
  /** @deprecated migrated to `frequency` */
  repeatMonthly?: boolean;
  /** @deprecated no longer used in UI */
  incomeSource?: string;
};

export type IncomeSourceKey =
  | "salary"
  | "overtime"
  | "rentalIncome"
  | "dividendIncome"
  | "depositInterestIncome"
  | "freelanceIncome"
  | "businessIncome"
  | "socialMediaIncome";

export type ExpenseCategoryKey =
  | "rent"
  | "food"
  | "transportation"
  | "familySupport"
  | "emiLoans"
  | "entertainment"
  | "insurance";

export type CashflowDashboardState = {
  version: typeof CASHFLOW_STATE_VERSION;
  /** All amounts in one consistent monthly unit (e.g. NPR); labels use NPR for display. */
  income: Record<IncomeSourceKey, number | undefined>;
  /** User-managed income records with dates (Add Income form). */
  incomeEntries?: IncomeEntry[];
  expenses: Record<ExpenseCategoryKey, number | undefined>;
  emergencyCashReserve: number | undefined;
  /**
   * When set, used as monthly burn for emergency coverage & FIRE metrics instead of
   * the sum of expense categories.
   */
  monthlyExpensesOverride: number | undefined;
};
