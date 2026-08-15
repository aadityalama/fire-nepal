/**
 * Nepal Official Pension Policy Data Layer — types.
 * Rules/rates must never be fabricated in UI or calculators.
 * Unverified numeric rules stay `pending_verification`.
 */

export type PensionInstitutionId = "ssf" | "epf" | "cit" | "government_pension";

export type PolicyRuleStatus = "active" | "expired" | "superseded" | "pending_verification";

export type PolicyRuleCategory =
  | "contribution"
  | "eligibility"
  | "retirement_benefit"
  | "medical"
  | "maternity"
  | "accident_disability"
  | "family_protection"
  | "withdrawal"
  | "loan"
  | "interest"
  | "gratuity"
  | "procedure"
  | "portal"
  | "other";

export type PensionPolicyRule = {
  id: string;
  institution: PensionInstitutionId;
  policyServiceName: string;
  /** Official source URL (government / authorized institutional). */
  officialSourceUrl: string;
  ruleCategory: PolicyRuleCategory;
  /** ISO date YYYY-MM-DD when this version becomes applicable. */
  effectiveDate: string;
  version: string;
  /** ISO date when FireNepal last verified against the official source. */
  lastVerifiedDate: string;
  status: PolicyRuleStatus;
  title: string;
  summary: string;
  notes?: string;
  /** Optional structured parameters — only when officially verified. */
  parameters?: Record<string, number | string | boolean>;
  /** If this version supersedes another rule id. */
  supersedesRuleId?: string;
};

export type OfficialPortalLink = {
  institution: PensionInstitutionId;
  label: "Pay / Contribution" | "Official Login" | "Official Portal";
  href: string;
  description: string;
  verified: true;
  officialSourceUrl: string;
};

export type PolicyResolutionResult =
  | { ok: true; rule: PensionPolicyRule }
  | { ok: false; reason: "Official policy information unavailable for verification."; category: PolicyRuleCategory };

export type PolicyDrivenCalculatorInput = {
  institution: PensionInstitutionId;
  age: number;
  monthlySalaryNpr: number;
  monthlyEmployeeContributionNpr: number;
  monthlyEmployerContributionNpr: number;
  contributionMonths: number;
  currentBalanceNpr: number;
  expectedRetirementAge: number;
  /** As-of date for policy version selection (ISO YYYY-MM-DD). Defaults to today. */
  asOfDate?: string;
};

export type PolicyDrivenCalculatorResult = {
  institution: PensionInstitutionId;
  policyVersionIds: string[];
  asOfDate: string;
  yearsToRetirement: number;
  monthlyEmployeeRatePct: number | null;
  monthlyEmployerRatePct: number | null;
  projectedBalanceNpr: number | null;
  estimatedMonthlyBenefitNpr: number | null;
  narrative: string;
  warnings: string[];
  unavailableMessage?: string;
};
