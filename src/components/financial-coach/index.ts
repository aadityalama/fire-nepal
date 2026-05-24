export type {
  BehavioralAnalytics,
  CoachCategory,
  CoachInsight,
  CoachNotification,
  CoachRecommendation,
  CoachSeverity,
  FinancialCoachModel,
  FinancialCoachSnapshot,
} from "@/components/financial-coach/types";
export { buildFinancialCoachModel } from "@/components/financial-coach/financial-coach-intelligence";
export {
  buildCashflowOnlyFinancialCoachSnapshot,
  buildFinancialCoachSnapshot,
} from "@/components/financial-coach/coach-snapshot";
export { AiFinancialCoachSection } from "@/components/financial-coach/AiFinancialCoachSection";
