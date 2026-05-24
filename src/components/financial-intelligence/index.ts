/** STEP 5C — Smart automation & financial intelligence (deterministic, local-first). */

export type {
  CashBurnAnalysis,
  FinancialIntelligenceModel,
  MonthlyWealthReport,
  RecurringBucket,
  RecurringExpenseChartRow,
  RecurringExpenseSignal,
  SmartIntelNotificationCard,
  SpendingAnomaly,
  TrendLabel,
  WealthLeakInsight,
  WealthMomentum,
} from "./types";

export { buildFinancialIntelligenceModel, type BuildFinancialIntelligenceArgs } from "./build-financial-intelligence";
export {
  currentIntelMonthKey,
  FIN_INTEL_ROLLUPS_KEY,
  loadIntelMonthRollups,
  upsertCurrentMonthRollup,
  type FinancialIntelMonthRollup,
} from "./monthly-rollup-storage";
export { SmartFinancialIntelligenceSection } from "./SmartFinancialIntelligenceSection";
