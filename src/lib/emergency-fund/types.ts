/**
 * Intelligent Emergency Fund — shared types.
 * Ledger + settings live inside cashflow_snapshots.state JSON (backward compatible).
 */

import type { FinanceCategoryId } from "@/lib/finance/categories";
import type { DataQualityReport } from "@/lib/emergency-fund/data-quality";
import type { EmergencyPeriodMode } from "@/lib/emergency-fund/period";
import type { FundingPlanOption } from "@/lib/emergency-fund/funding-plans";
import type { SafetyMilestone } from "@/lib/emergency-fund/milestones";

export const DEFAULT_PROTECTION_MONTHS = 6;
export const DEFAULT_ALLOCATION_PCT = 30;
export const ALLOCATION_PCT_OPTIONS = [10, 20, 30, 50, 75, 100] as const;
export const PROTECTION_MONTH_OPTIONS = [3, 6, 9, 12] as const;
export const DEFAULT_PERIOD_MODE: EmergencyPeriodMode = "latest_completed";

/** Categories counted as essential living / mandatory obligations by default. */
export const ESSENTIAL_FINANCE_CATEGORY_IDS = [
  "Rent",
  "Food",
  "Utilities",
  "Transport",
  "Health",
  "Debt",
  "Insurance",
] as const satisfies readonly FinanceCategoryId[];

export type EssentialFinanceCategoryId = (typeof ESSENTIAL_FINANCE_CATEGORY_IDS)[number];

export type EmergencyDataSource =
  | "actual_and_budget"
  | "actual_history"
  | "budget_estimate"
  | "cashflow_estimate"
  | "manual_estimate"
  | "insufficient_data";

export type EmergencyDataSourceLabel =
  | "Actual Expense History"
  | "Budget-Based Estimate"
  | "Cashflow-Based Estimate"
  | "Manual Estimate"
  | "Insufficient Financial Data"
  | "Actual + Budget (conservative max)";

export type FinancialSafetyStatus =
  | "critical"
  | "high_risk"
  | "building_safety"
  | "strong_protection"
  | "extended_protection";

export type EmergencyReserveMode = "ledger" | "linked" | "hybrid";

export type EmergencyEmploymentType =
  | "stable"
  | "contract"
  | "overseas"
  | "self_employed"
  | "uncertain";

export type EmergencyIncomeSources = "single" | "multiple";

export type EmergencyFundTransactionType = "contribution" | "withdrawal";

export type EmergencyFundTransaction = {
  id: string;
  type: EmergencyFundTransactionType;
  /** Amount in NPR (base currency). Original currency preserved separately. */
  amountNpr: number;
  /** Original entered amount before conversion (when non-NPR). */
  originalAmount?: number;
  originalCurrency?: "NPR" | "KRW" | "USD";
  date: string;
  note?: string;
  createdAt: string;
  /** Prevent double-counting when seeded from a savings goal deposit. */
  linkedSavingsTransactionId?: string;
  confirmed: boolean;
};

export type EmergencyFundSettings = {
  protectionMonths: number;
  allocationPct: number;
  /** User override of recommended expense basis (NPR / month). */
  expenseBasisOverrideNpr?: number;
  /** Explicit opening balance for ledger mode. */
  openingBalanceNpr: number;
  linkedSavingsGoalIds: string[];
  /**
   * ledger — opening + contributions − withdrawals
   * linked — sum of linked emergency savings goal balances only
   * hybrid — ledger + linked balances (excluding goals already mirrored via linkedSavingsTransactionId)
   */
  reserveMode: EmergencyReserveMode;
  employmentType?: EmergencyEmploymentType;
  incomeSources?: EmergencyIncomeSources;
  dependents?: number;
  /** Manual monthly essential expense when no other data exists. */
  manualMonthlyExpenseNpr?: number;
  /** Extra categories the user opts into as essential. */
  includeDiscretionaryCategoryIds?: FinanceCategoryId[];
  /** Custom contribution amount override (takes precedence over allocation %). */
  customContributionNpr?: number;
  /** Selected calculation period mode. */
  periodMode?: EmergencyPeriodMode;
  customPeriodStartMonth?: string;
  customPeriodEndMonth?: string;
  /** Deadline-based funding plan months (optional). */
  fundingDeadlineMonths?: number;
  /** Chart window for growth history/projection. */
  growthChartMonths?: 3 | 6 | 12 | 24;
  /** Last successful cloud/local sync of EF-related finance data (not page render). */
  lastSyncedAt?: string;
  lastUpdatedAt?: string;
};

export type EmergencyFundLedger = {
  version: 1;
  settings: EmergencyFundSettings;
  transactions: EmergencyFundTransaction[];
};

export type MonthlyEssentialSlice = {
  monthKey: string;
  essentialTotalNpr: number;
  totalExpenseNpr: number;
  /** True when the month is complete (not the current partial month). */
  complete: boolean;
  hasReliableData: boolean;
};

export type CurrencyConversionMeta = {
  baseCurrency: "NPR" | "KRW" | "USD";
  krwPerNpr: number | null;
  usdPerNpr: number | null;
  rateUpdatedAt: string | null;
  incomplete: boolean;
  stale: boolean;
  flaggedMessage?: string;
};

export type EmergencyFinancialInputs = {
  monthlyNetIncomeNpr: number | null;
  actualMonthlyTotalExpensesNpr: number | null;
  actualEssentialMonthlyAvgNpr: number | null;
  plannedEssentialMonthlyNpr: number | null;
  cashflowEssentialMonthlyNpr: number | null;
  monthlyInsuranceObligationNpr: number | null;
  analysisMonthsUsed: number;
  analysisPeriodLabel: string | null;
  monthlySlices: MonthlyEssentialSlice[];
  categoryClassificationReliable: boolean;
  currency: CurrencyConversionMeta;
  fetchedAt: string;
};

export type EmergencyInsightTone = "positive" | "warning" | "info" | "critical";

export type EmergencyInsight = {
  id: string;
  tone: EmergencyInsightTone;
  priority: number;
  titleEn: string;
  titleNe: string;
  titleKo: string;
  messageEn: string;
  messageNe: string;
  messageKo: string;
  actionEn?: string;
  actionNe?: string;
  actionKo?: string;
  href?: string;
};

export type IntelligentEmergencyFundResult = {
  hasSufficientData: boolean;
  dataSource: EmergencyDataSource;
  dataSourceLabel: EmergencyDataSourceLabel;
  calculationPeriodLabel: string | null;
  incomePeriodLabel: string | null;
  expensePeriodLabel: string | null;
  essentialAveragingLabel: string | null;
  lastUpdatedAt: string;
  lastSyncedAt: string | null;

  actualEssentialMonthlyAvgNpr: number | null;
  plannedEssentialMonthlyNpr: number | null;
  cashflowEssentialMonthlyNpr: number | null;
  recommendedExpenseBasisNpr: number | null;
  expenseBasisOverridden: boolean;
  categoryClassificationReliable: boolean;

  protectionMonths: number;
  emergencyFundTargetNpr: number | null;
  currentReserveNpr: number;
  remainingShortfallNpr: number | null;
  /** Uncapped progress percentage (may exceed 100). */
  fundingProgressPct: number | null;
  /** Visual ring progress capped at 100. */
  fundingProgressRingPct: number | null;
  safetyRunwayMonths: number | null;
  safetyStatus: FinancialSafetyStatus | null;

  monthlyNetIncomeNpr: number | null;
  recurringMonthlyIncomeNpr: number | null;
  actualMonthlyTotalExpensesNpr: number | null;
  actualMonthlySavingsNpr: number | null;
  conservativeMonthlySpendingNpr: number | null;
  availableContributionCapacityNpr: number | null;
  allocationPct: number;
  recommendedMonthlyContributionNpr: number | null;
  contributionExceedsCapacity: boolean;
  negativeCashflow: boolean;
  capacityReliable: boolean;

  estimatedMonthsRemaining: number | null;
  estimatedCompletionLabel: string | null;
  fullyFunded: boolean;
  additionalSavingsRequired: boolean;

  dataQuality: DataQualityReport | null;
  milestones: SafetyMilestone[];
  fundingPlans: FundingPlanOption[];

  insights: EmergencyInsight[];
  currency: CurrencyConversionMeta;
};

export function defaultEmergencyFundSettings(
  openingBalanceNpr = 0,
): EmergencyFundSettings {
  return {
    protectionMonths: DEFAULT_PROTECTION_MONTHS,
    allocationPct: DEFAULT_ALLOCATION_PCT,
    openingBalanceNpr: Math.max(0, openingBalanceNpr),
    linkedSavingsGoalIds: [],
    reserveMode: "ledger",
    periodMode: DEFAULT_PERIOD_MODE,
    growthChartMonths: 12,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function defaultEmergencyFundLedger(openingBalanceNpr = 0): EmergencyFundLedger {
  return {
    version: 1,
    settings: defaultEmergencyFundSettings(openingBalanceNpr),
    transactions: [],
  };
}
