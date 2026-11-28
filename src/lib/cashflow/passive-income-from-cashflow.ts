/**
 * Cashflow → Return Planner passive income bridge.
 *
 * Single source of truth: authenticated Cashflow `incomeEntries` (+ legacy income keys).
 * Classifies passive vs active vs one-time, normalizes recurring monthly amounts,
 * and separates period "actual received" from recurring source streams.
 */

import type { CashflowDashboardState, IncomeSourceKey } from "@/components/cashflow/types";
import {
  normalizeIncomeFrequency,
  type CashflowIncomeTypeId,
  type IncomeFrequency,
} from "@/lib/cashflow/income-types";

export type IncomeStreamClass = "passive" | "active" | "one_time";

/** Explicit override for ambiguous Cashflow categories (Business / Freelance / Other / Bonus). */
export type IncomeClassOverride = IncomeStreamClass | "auto";

export type PassiveIncomeBreakdownLine = {
  id: string;
  name: string;
  incomeType: CashflowIncomeTypeId | "legacy" | "portfolio_fd" | "portfolio_swp" | "ssf_pension";
  frequency: IncomeFrequency | "monthly";
  streamClass: IncomeStreamClass;
  /** Normalized monthly contribution when recurring & eligible for the Passive Income Goal. */
  recurringMonthlyNpr: number;
  /** Amount counted in the reporting month's actual received (period cash). */
  periodReceivedNpr: number;
  source: "cashflow_entry" | "legacy_income" | "portfolio" | "ssf";
};

export type CashflowPassiveIncomeSnapshot = {
  /** Recurring eligible passive used for goal coverage (excludes one-time). */
  recurringPassiveMonthlyNpr: number;
  /** Passive cash received in the reporting month (includes one-time passive in that month). */
  periodActualPassiveNpr: number;
  /** All income lines for breakdown UI (active + passive + one-time). */
  breakdown: PassiveIncomeBreakdownLine[];
  /** True when Cashflow has at least one income entry or legacy income amount. */
  hasIncomeRecords: boolean;
  /** Dividend + interest recurring from Cashflow (to avoid double-counting portfolio marks). */
  cashflowDividendInterestMonthlyNpr: number;
  cashflowRentalMonthlyNpr: number;
};

const AMBIGUOUS_TYPES = new Set<CashflowIncomeTypeId>(["business", "freelance", "other", "bonus"]);

function finiteNonNeg(n: number | undefined | null): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

/**
 * Default classification from Cashflow income type + frequency.
 * Ambiguous types default to active (or one_time when frequency is once / bonus).
 */
export function defaultIncomeStreamClass(
  incomeType: CashflowIncomeTypeId,
  frequency: IncomeFrequency,
): IncomeStreamClass {
  if (incomeType === "rental" || incomeType === "dividend") return "passive";
  if (incomeType === "salary" || incomeType === "overtime" || incomeType === "freelance") {
    return frequency === "once" ? "one_time" : "active";
  }
  if (incomeType === "bonus") return "one_time";
  if (incomeType === "business" || incomeType === "other") {
    return frequency === "once" ? "one_time" : "active";
  }
  return "active";
}

export function resolveIncomeStreamClass(
  incomeType: CashflowIncomeTypeId,
  frequency: IncomeFrequency,
  override?: IncomeClassOverride | null,
): IncomeStreamClass {
  if (override && override !== "auto") return override;
  return defaultIncomeStreamClass(incomeType, frequency);
}

/**
 * Normalize a recurring source amount to a monthly run-rate.
 * One-time → 0 (never inflates recurring Passive Income Goal).
 */
export function normalizeRecurringMonthlyAmount(
  amount: number,
  frequency: IncomeFrequency,
): number {
  const n = finiteNonNeg(amount);
  if (!(n > 0)) return 0;
  switch (frequency) {
    case "monthly":
      return n;
    case "yearly":
      return Math.round(n / 12);
    case "weekly":
      return Math.round((n * 52) / 12);
    case "quarterly":
      return Math.round(n / 3);
    case "once":
    default:
      return 0;
  }
}

/**
 * Period cash for a calendar month from a source record.
 * - Recurring monthly/weekly: normalized monthly amount every month
 * - Yearly: full amount only in anniversary month
 * - Quarterly: full amount in anniversary quarter months
 * - Once: full amount only in receipt month
 */
export function periodReceivedAmount(
  amount: number,
  frequency: IncomeFrequency,
  entryDate: string,
  monthKey: string,
): number {
  const n = finiteNonNeg(amount);
  if (!(n > 0)) return 0;
  const entryMonth = entryDate.slice(0, 7);

  switch (frequency) {
    case "monthly":
      return n;
    case "weekly":
      return Math.round((n * 52) / 12);
    case "yearly": {
      const [, month] = monthKey.split("-");
      return entryDate.slice(5, 7) === month ? n : 0;
    }
    case "quarterly": {
      const entryM = Number(entryDate.slice(5, 7));
      const month = Number(monthKey.slice(5, 7));
      if (!Number.isFinite(entryM) || !Number.isFinite(month) || entryM < 1 || month < 1) return 0;
      return ((month - entryM) % 3 + 3) % 3 === 0 ? n : 0;
    }
    case "once":
      return entryMonth === monthKey ? n : 0;
    default:
      return 0;
  }
}

function legacyKeyToType(key: IncomeSourceKey): CashflowIncomeTypeId {
  if (key === "salary") return "salary";
  if (key === "overtime") return "overtime";
  if (key === "rentalIncome") return "rental";
  if (key === "dividendIncome" || key === "depositInterestIncome") return "dividend";
  if (key === "freelanceIncome" || key === "socialMediaIncome") return "freelance";
  if (key === "businessIncome") return "business";
  return "other";
}

const LEGACY_PASSIVE_KEYS: IncomeSourceKey[] = [
  "rentalIncome",
  "dividendIncome",
  "depositInterestIncome",
];

/**
 * Build passive-income snapshot from Cashflow dashboard state.
 * Prefers `incomeEntries` (Income Center). Legacy income keys are used only when
 * there are no entries (pre-migration) so we never double-count migrated data.
 */
export function computeCashflowPassiveIncomeSnapshot(
  state: CashflowDashboardState,
  monthKey: string,
): CashflowPassiveIncomeSnapshot {
  const entries = state.incomeEntries ?? [];
  const breakdown: PassiveIncomeBreakdownLine[] = [];

  if (entries.length > 0) {
    for (const entry of entries) {
      const frequency = normalizeIncomeFrequency(entry);
      const streamClass = resolveIncomeStreamClass(
        entry.incomeType,
        frequency,
        entry.incomeClass ?? "auto",
      );
      const recurring =
        streamClass === "passive" ? normalizeRecurringMonthlyAmount(entry.amount, frequency) : 0;
      const period =
        streamClass === "passive"
          ? periodReceivedAmount(entry.amount, frequency, entry.date, monthKey)
          : streamClass === "one_time"
            ? periodReceivedAmount(entry.amount, "once", entry.date, monthKey)
            : periodReceivedAmount(entry.amount, frequency, entry.date, monthKey);

      breakdown.push({
        id: entry.id,
        name: entry.name,
        incomeType: entry.incomeType,
        frequency,
        streamClass,
        recurringMonthlyNpr: recurring,
        periodReceivedNpr: period,
        source: "cashflow_entry",
      });
    }
  } else {
    // Legacy monthly income map — treat positive keys as monthly recurring sources.
    for (const key of Object.keys(state.income) as IncomeSourceKey[]) {
      const amount = finiteNonNeg(state.income[key]);
      if (!(amount > 0)) continue;
      const incomeType = legacyKeyToType(key);
      const frequency: IncomeFrequency = "monthly";
      const streamClass = resolveIncomeStreamClass(incomeType, frequency, "auto");
      const isPassiveKey = LEGACY_PASSIVE_KEYS.includes(key);
      const resolvedClass = isPassiveKey ? "passive" : streamClass;
      breakdown.push({
        id: `legacy-${key}`,
        name: key,
        incomeType,
        frequency,
        streamClass: resolvedClass,
        recurringMonthlyNpr: resolvedClass === "passive" ? amount : 0,
        periodReceivedNpr: amount,
        source: "legacy_income",
      });
    }
  }

  const recurringPassiveMonthlyNpr = breakdown
    .filter((line) => line.streamClass === "passive")
    .reduce((sum, line) => sum + line.recurringMonthlyNpr, 0);

  const periodActualPassiveNpr = breakdown
    .filter((line) => line.streamClass === "passive")
    .reduce((sum, line) => sum + line.periodReceivedNpr, 0);

  const cashflowDividendInterestMonthlyNpr = breakdown
    .filter(
      (line) =>
        line.streamClass === "passive" &&
        (line.incomeType === "dividend" || line.id.includes("depositInterest")),
    )
    .reduce((sum, line) => sum + line.recurringMonthlyNpr, 0);

  const cashflowRentalMonthlyNpr = breakdown
    .filter((line) => line.streamClass === "passive" && line.incomeType === "rental")
    .reduce((sum, line) => sum + line.recurringMonthlyNpr, 0);

  const hasIncomeRecords =
    entries.length > 0 ||
    (Object.keys(state.income) as IncomeSourceKey[]).some((k) => finiteNonNeg(state.income[k]) > 0);

  return {
    recurringPassiveMonthlyNpr,
    periodActualPassiveNpr,
    breakdown,
    hasIncomeRecords,
    cashflowDividendInterestMonthlyNpr,
    cashflowRentalMonthlyNpr,
  };
}

/** True when an ambiguous type should show an explicit classification control. */
export function incomeTypeNeedsClassOverride(incomeType: CashflowIncomeTypeId): boolean {
  return AMBIGUOUS_TYPES.has(incomeType);
}
