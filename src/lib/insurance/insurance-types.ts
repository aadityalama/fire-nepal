/** FIRE Nepal Insurance Workspace — shared types (client-safe). */

export type InsuranceType =
  | "health"
  | "life"
  | "critical_illness"
  | "travel"
  | "vehicle"
  | "property"
  | "other";

export type InsurancePaymentFrequency = "monthly" | "quarterly" | "yearly" | "one_time";

export type InsurancePolicyStatus = "active" | "expiring" | "expired" | "lapsed";

export type InsuranceRiskLevel = "low" | "moderate" | "high" | "critical";

export type InsuranceProtectionBadge =
  | "Excellent"
  | "Strong"
  | "Needs attention"
  | "Underprotected";

export type InsurancePolicy = {
  id: string;
  type: InsuranceType;
  provider: string;
  coverageAmountNpr: number;
  premiumNpr: number;
  paymentFrequency: InsurancePaymentFrequency;
  startDate: string;
  expiryDate: string;
  nominee: string;
  familyMembersCovered: string[];
  notes: string;
  /** Local object URL or data URL — OCR-ready attachment placeholder */
  documentDataUrl: string | null;
  documentFileName: string | null;
  status: InsurancePolicyStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type InsurancePolicyFormInput = {
  type: InsuranceType;
  provider: string;
  coverageAmountNpr: number;
  premiumNpr: number;
  paymentFrequency: InsurancePaymentFrequency;
  startDate: string;
  expiryDate: string;
  nominee: string;
  familyMembersCovered: string[];
  notes: string;
  documentDataUrl: string | null;
  documentFileName: string | null;
};

export type InsuranceWorkspaceState = {
  version: 1;
  policies: InsurancePolicy[];
};

export type InsuranceEngineInputs = {
  monthlyIncomeNpr: number;
  monthlyExpenseNpr: number;
  totalSavingsNpr: number;
  investableNpr: number;
  emergencyFundMonths: number | null;
  fireGoalNpr: number;
  fireProgressPct: number | null;
  age: number;
  adults: number;
  children: number;
  ssfMonthlyContributionNpr: number;
  yearsToReturn: number | null;
  returnReadinessPct: number | null;
};

export type InsuranceRecommendation = {
  recommendedHealthCoverageNpr: number;
  recommendedLifeCoverageNpr: number;
  recommendedCriticalIllnessNpr: number;
  incomeProtectionNeedNpr: number;
  recommendedMonthlyPremiumNpr: number;
  protectionScorePct: number;
  protectionBadge: InsuranceProtectionBadge;
  riskLevel: InsuranceRiskLevel;
  coverageGapNpr: number;
  healthGapNpr: number;
  lifeGapNpr: number;
  criticalGapNpr: number;
  currentHealthCoverageNpr: number;
  currentLifeCoverageNpr: number;
  currentCriticalCoverageNpr: number;
  currentMonthlyPremiumNpr: number;
  aiSummary: string;
  suggestionTitle: string;
  suggestionBody: string;
  suggestionIncreaseLifeNpr: number;
};

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  health: "Health Insurance",
  life: "Life Insurance",
  critical_illness: "Critical Illness",
  travel: "Travel",
  vehicle: "Vehicle",
  property: "Property",
  other: "Other",
};

export const INSURANCE_TYPE_ICONS: Record<InsuranceType, string> = {
  health: "🏥",
  life: "🛡️",
  critical_illness: "❤️‍🩹",
  travel: "✈️",
  vehicle: "🚗",
  property: "🏠",
  other: "📄",
};

export const PAYMENT_FREQUENCY_LABELS: Record<InsurancePaymentFrequency, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  one_time: "One-time",
};

export const INSURANCE_TYPES: InsuranceType[] = [
  "health",
  "life",
  "critical_illness",
  "travel",
  "vehicle",
  "property",
  "other",
];
