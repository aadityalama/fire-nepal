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
  | "Underprotected"
  | "Incomplete data";

export type InsuranceMetricAvailability = "ready" | "insufficient_data";

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

/** One scheduled premium installment — persisted in premium_history JSON. */
export type PremiumHistoryEntry = {
  dueDate: string;
  amountNpr: number;
  status: "paid" | "due" | "overdue" | "upcoming";
  paidAt?: string | null;
};

export type InsurancePolicy = {
  id: string;
  type: InsuranceType;
  provider: string;
  coverageAmountNpr: number;
  /** Premium amount per frequency cycle (premium_amount). */
  premiumNpr: number;
  /** Premium frequency (premium_frequency). */
  paymentFrequency: InsurancePaymentFrequency;
  /** Policy start date (policy_start_date). */
  startDate: string;
  expiryDate: string;
  /** Policy term in years used for installment scheduling (0 = derive from dates). */
  policyTermYears?: number;
  nominee: string;
  familyMembersCovered: string[];
  notes: string;
  agentName?: string;
  agentPhone?: string;
  branch?: string;
  policyNumber?: string;
  proposalNumber?: string;
  /** PAN / pan_number */
  pan?: string;
  medicalNotes?: string;
  documents?: InsuranceDocument[];
  /** Persisted installment timeline (premium_history). */
  premiumHistory?: PremiumHistoryEntry[];
  totalInstallments?: number;
  installmentsPaid?: number;
  installmentsRemaining?: number;
  totalPremiumPaid?: number;
  remainingPremium?: number;
  nextPremiumDate?: string | null;
  nextPremiumAmount?: number;
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
  policyTermYears?: number;
  nominee: string;
  familyMembersCovered: string[];
  notes: string;
  agentName?: string;
  agentPhone?: string;
  branch?: string;
  policyNumber?: string;
  proposalNumber?: string;
  pan?: string;
  medicalNotes?: string;
  documents?: InsuranceDocument[];
  premiumHistory?: PremiumHistoryEntry[];
  totalInstallments?: number;
  installmentsPaid?: number;
  installmentsRemaining?: number;
  totalPremiumPaid?: number;
  remainingPremium?: number;
  nextPremiumDate?: string | null;
  nextPremiumAmount?: number;
  documentDataUrl: string | null;
  documentFileName: string | null;
};

export type InsuranceWorkspaceState = {
  version: 1;
  policies: InsurancePolicy[];
};

/**
 * Live finance inputs for the educational insurance needs engine.
 * Never invent missing values in the engine — pass null/0 and let availability flags decide.
 */
export type InsuranceEngineInputs = {
  monthlyIncomeNpr: number;
  monthlyExpenseNpr: number;
  totalSavingsNpr: number;
  investableNpr: number;
  /** Outstanding debt / portfolio liabilities in NPR (0 if none tracked). */
  liabilitiesNpr: number;
  emergencyFundMonths: number | null;
  fireGoalNpr: number;
  fireProgressPct: number | null;
  /** Null when age is not provided — engine must not invent a default age. */
  age: number | null;
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
  healthAvailability: InsuranceMetricAvailability;
  lifeAvailability: InsuranceMetricAvailability;
  criticalAvailability: InsuranceMetricAvailability;
  incomeProtectionAvailability: InsuranceMetricAvailability;
  premiumAvailability: InsuranceMetricAvailability;
  scoreAvailability: InsuranceMetricAvailability;
  gapAvailability: InsuranceMetricAvailability;
  missingInputs: string[];
  /** Concise user-facing explanation of the educational methodology used. */
  howCalculated: string;
  /** Short bullet steps for the “How this was calculated” UI. */
  calculationSteps: string[];
  methodologyDisclaimer: string;
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

export const INSURANCE_METHODOLOGY_DISCLAIMER =
  "Educational estimate only — not financial, insurance, or investment advice. Figures are derived from your FIRE Nepal inputs and do not guarantee coverage, premiums, or product suitability.";
