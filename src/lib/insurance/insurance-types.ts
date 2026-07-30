/** FIRE Nepal Insurance Workspace — shared types (client-safe). */

export type InsuranceType =
  | "health"
  | "life"
  | "critical_illness"
  | "travel"
  | "vehicle"
  | "property"
  | "other";

export type InsurancePaymentFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly" | "one_time";

export type InsurancePolicyStatus = "active" | "expiring" | "expired" | "lapsed";

export type InsuranceRiskLevel = "low" | "moderate" | "high" | "critical";

export type InsuranceProtectionBadge =
  | "Excellent"
  | "Strong"
  | "Needs attention"
  | "Underprotected";

export type InsuranceDocumentKind =
  | "policy_pdf"
  | "citizenship"
  | "passport"
  | "medical_reports"
  | "premium_receipts"
  | "other";

export type InsuranceDocument = {
  id: string;
  kind: InsuranceDocumentKind;
  fileName: string;
  dataUrl: string;
  uploadedAt: string;
};

export type InsurancePolicy = {
  id: string;
  type: InsuranceType;
  provider: string;
  coverageAmountNpr: number;
  premiumNpr: number;
  paymentFrequency: InsurancePaymentFrequency;
  startDate: string;
  expiryDate: string;
  /** Policy term in years used for installment scheduling (0 = derive from dates). */
  policyTermYears: number;
  nominee: string;
  familyMembersCovered: string[];
  notes: string;
  agentName: string;
  agentPhone: string;
  branch: string;
  policyNumber: string;
  proposalNumber: string;
  pan: string;
  medicalNotes: string;
  documents: InsuranceDocument[];
  /** Legacy single attachment — kept in sync with documents[policy_pdf] for older clients. */
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
  policyTermYears: number;
  nominee: string;
  familyMembersCovered: string[];
  notes: string;
  agentName: string;
  agentPhone: string;
  branch: string;
  policyNumber: string;
  proposalNumber: string;
  pan: string;
  medicalNotes: string;
  documents: InsuranceDocument[];
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
  half_yearly: "Half-Yearly",
  yearly: "Yearly",
  one_time: "One-time",
};

export const INSURANCE_DOCUMENT_KIND_LABELS: Record<InsuranceDocumentKind, string> = {
  policy_pdf: "Policy PDF",
  citizenship: "Citizenship",
  passport: "Passport",
  medical_reports: "Medical Reports",
  premium_receipts: "Premium Receipts",
  other: "Other Documents",
};

export const INSURANCE_DOCUMENT_KINDS: InsuranceDocumentKind[] = [
  "policy_pdf",
  "citizenship",
  "passport",
  "medical_reports",
  "premium_receipts",
  "other",
];

export const INSURANCE_TYPES: InsuranceType[] = [
  "health",
  "life",
  "critical_illness",
  "travel",
  "vehicle",
  "property",
  "other",
];
