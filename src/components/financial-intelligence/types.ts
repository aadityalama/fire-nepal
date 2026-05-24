/** STEP 5C — Smart automation & financial intelligence (deterministic, local-first). */

import type { ExpenseCategoryKey } from "@/components/cashflow/types";

export type RecurringBucket =
  | "rent"
  | "utilities"
  | "subscriptions"
  | "food"
  | "transport"
  | "debt_service"
  | "other";

/** Engine-classified recurring-style line item from monthly cashflow categories. */
export type RecurringExpenseSignal = {
  id: string;
  sourceKey: ExpenseCategoryKey;
  displayLabel: string;
  bucket: RecurringBucket;
  monthlyAmountNpr: number;
  /** How “structural” this looks as a recurring obligation (0–1). */
  recurrenceConfidence: number;
  /** MoM % when prior month rollup exists; null if unknown. */
  momChangePct: number | null;
  rising: boolean;
};

export type WealthLeakInsight = {
  id: string;
  title: string;
  detail: string;
  /** Heuristic NPR/month that could be redirected if behavior normalizes. */
  estimatedMonthlyLeakNpr: number;
  severity: "low" | "medium" | "high";
};

export type SpendingAnomaly = {
  id: string;
  kind: "high_burn" | "savings_drop" | "lifestyle_inflation" | "nw_slowdown";
  title: string;
  detail: string;
  severity: "watch" | "alert";
};

export type TrendLabel = "up" | "flat" | "down" | "unknown";

export type MonthlyWealthReport = {
  /** Calendar month this report summarizes (YYYY-MM). */
  month: string;
  headline: string;
  savingsRateTrend: TrendLabel;
  /** Implied from net worth trajectory when portfolio data exists. */
  investmentGrowthTrend: TrendLabel;
  fireTrajectory: "accelerating" | "steady" | "decelerating" | "unknown";
  cashflowQualityScore: number;
  /** Plain-language bullets for the report body. */
  bullets: string[];
};

export type SmartIntelNotificationCard = {
  id: string;
  title: string;
  subtitle: string;
  tone: "positive" | "neutral" | "caution";
};

export type RecurringExpenseChartRow = {
  bucket: RecurringBucket;
  label: string;
  amountNpr: number;
  /** 0–100 width for bar visualization. */
  sharePct: number;
};

export type CashBurnAnalysis = {
  burnToIncomePct: number | null;
  runwayMonths: number | null;
  narrative: string;
  /** 0 = stretched, 100 = comfortable vs heuristics. */
  burnStressScore: number;
};

export type WealthMomentum = {
  label: string;
  tone: "strong" | "neutral" | "weak";
  /** vs trailing average of NW deltas when available. */
  vsTrailingAvg: "above" | "in_line" | "below" | "unknown";
};

export type FinancialIntelligenceModel = {
  recurring: RecurringExpenseSignal[];
  recurringChart: RecurringExpenseChartRow[];
  risingCategories: { label: string; momPct: number }[];
  wealthLeaks: WealthLeakInsight[];
  anomalies: SpendingAnomaly[];
  monthlyReport: MonthlyWealthReport;
  smartCards: SmartIntelNotificationCard[];
  savingsEfficiencyScore: number;
  financialHealthScore: number;
  cashBurn: CashBurnAnalysis;
  wealthMomentum: WealthMomentum;
  /** True when at least one prior month exists in local rollups. */
  hasMonthOverMonth: boolean;
};
