/**
 * Emergency Fund 3.0 — shared types for budget-powered financial safety.
 */

export type ProtectionMode = "full_lifestyle" | "essential_survival";

export type FundingMethod = "monthly_contribution" | "target_deadline" | null;

export type BudgetLineInclusion =
  | "included"
  | "excluded"
  | "already_included"
  | "projection_duplicate"
  | "ambiguous";

export type BudgetLineSource = "monthly_budget" | "yearly_budget";

export type EmergencyBudgetLine = {
  id: string;
  name: string;
  category: string;
  period: "Monthly" | "Yearly";
  originalAmountNpr: number;
  monthlyEquivalentNpr: number;
  inclusion: BudgetLineInclusion;
  source: BudgetLineSource;
  suggestedEssential: boolean;
};

export type NormalizedBudgetBreakdown = {
  /** True when at least one monthly or yearly budget line exists. */
  hasBudgetData: boolean;
  /** True when only yearly obligations exist (no monthly lines). */
  isPartialBudget: boolean;
  /** Sum of Monthly-period budget monthly amounts. */
  originalMonthlyBudgetNpr: number;
  /** Sum of Yearly-period original annual amounts. */
  yearlyBudgetTotalNpr: number;
  /** Sum of yearly monthly equivalents before dedupe (amount/12). */
  annualMonthlyEquivalentNpr: number;
  /** Yearly monthly equivalents already covered by monthly allocations. */
  annualAllocationsAlreadyIncludedNpr: number;
  /** Yearly monthly equivalents treated as projections of monthly totals. */
  yearlyProjectionDuplicateNpr: number;
  /** Additional yearly monthly equivalents added to the monthly total. */
  additionalAnnualMonthlyAllocationsNpr: number;
  /** Original monthly + additional annual monthly (not already included / not projection). */
  effectiveMonthlyBudgetNpr: number;
  /** Lines used for Full Lifestyle mode (included only). */
  includedLines: EmergencyBudgetLine[];
  /** All normalized lines (including excluded / flagged). */
  allLines: EmergencyBudgetLine[];
  /** Ambiguous yearly ↔ monthly relationships requiring user review. */
  ambiguousLines: EmergencyBudgetLine[];
  /** Latest budget record updatedAt (ISO), if any. */
  lastBudgetUpdatedAt: string | null;
  currency: "NPR";
};

export type EmergencyFundTransactionType = "contribution" | "withdrawal";

export type EmergencyFundTransaction = {
  id: string;
  type: EmergencyFundTransactionType;
  amountNpr: number;
  date: string;
  note: string;
  createdAt: string;
};

export type ProtectionGuidanceAnswers = {
  employmentStability: "stable" | "unstable" | "unknown";
  householdIncomeSources: "single" | "multiple" | "unknown";
  dependents: number;
  overseasEmployment: boolean | null;
  significantRecurringObligations: boolean | null;
};

export type EmergencyFundSettingsState = {
  version: 1;
  protectionMode: ProtectionMode;
  /** 3 | 6 | 9 | 12 or custom value when customProtectionMonths is set. */
  protectionMonths: number;
  useCustomProtectionMonths: boolean;
  /** Budget record ids selected as essential (Essential Survival mode). */
  essentialRecordIds: string[];
  fundingMethod: FundingMethod;
  plannedMonthlyContributionNpr: number | null;
  deadlineMonths: number | null;
  useCustomDeadlineMonths: boolean;
  linkedSavingsGoalIds: string[];
  transactions: EmergencyFundTransaction[];
  /**
   * Explicit opening reserve. When null and no transactions exist,
   * the cashflow emergencyCashReserve is treated as the current designated reserve.
   */
  openingReserveNpr: number | null;
  guidance: ProtectionGuidanceAnswers | null;
  /** ISO timestamp of last successful budget + settings sync used for UI. */
  lastSuccessfulSyncAt: string | null;
  /** Prior effective monthly budget used for change insights (null until a change is observed). */
  previousEffectiveMonthlyBudgetNpr: number | null;
  /** Last successfully synced effective monthly budget (for detecting changes). */
  lastSeenEffectiveMonthlyBudgetNpr: number | null;
};

export type SafetyMilestone = {
  months: number;
  label: string;
  requiredReserveNpr: number;
  progressPct: number;
  remainingNpr: number;
  achieved: boolean;
};

export type EmergencyInsightPriority =
  | "missing_budget"
  | "annual_obligation"
  | "insufficient_reserve"
  | "funding_shortfall"
  | "funding_plan"
  | "milestone";

export type EmergencyInsight = {
  id: string;
  priority: EmergencyInsightPriority;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
};

export type EmergencySimulationInput = {
  currentReserveNpr: number;
  simulatedMonthlyBudgetNpr: number;
  oneTimeEmergencyCostNpr: number;
};

export type EmergencySimulationResult = {
  availableSimulatedReserveNpr: number;
  uncoveredOneTimeCostNpr: number;
  simulatedSafetyRunwayMonths: number | null;
  approximateProtectionDays: number | null;
  monthByMonth: Array<{ month: number; remainingNpr: number }>;
};

export type UpcomingAnnualPayment = {
  id: string;
  name: string;
  dueDate: string;
  amountNpr: number;
  reservedNpr: number;
  remainingObligationNpr: number;
  daysUntil: number;
  window: "30" | "90" | "180" | "later";
};

export const DEFAULT_PROTECTION_MONTHS = 6;

export const PROTECTION_PERIOD_OPTIONS = [
  { months: 3, label: "3 Mo", education: "Basic Protection" },
  { months: 6, label: "6 Mo", education: "Standard Protection" },
  { months: 9, label: "9 Mo", education: "Advanced Protection" },
  { months: 12, label: "12 Mo", education: "Extended Protection" },
] as const;

export const FUNDING_DEADLINE_OPTIONS = [3, 6, 12, 24] as const;

export const SAFETY_MILESTONE_MONTHS = [1, 3, 6, 9, 12] as const;
