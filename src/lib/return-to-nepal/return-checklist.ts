import {
  computeInsuranceRecommendation,
  hasAdequateHealthInsurance,
  hasAdequateLifeInsurance,
} from "@/lib/insurance/insurance-engine";
import type { InsuranceEngineInputs, InsurancePolicy } from "@/lib/insurance/insurance-types";
import { sumCoverageByType } from "@/lib/insurance/insurance-utils";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

export type ChecklistStatus = "completed" | "on_track" | "in_progress" | "missing";

export type ReturnChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
};

/** Canonical inputs for Return Checklist — no localStorage reads inside the pure compute. */
export type ReturnChecklistSources = {
  state: ReturnToNepalPlannerState;
  /** Saved emergency cash reserve (cashflow.emergencyCashReserve). Null/undefined = not configured. */
  emergencyCashReserveNpr: number | null | undefined;
  /** Monthly burn used for runway (cashflow monthly expenses). */
  emergencyMonthlyBurnNpr: number;
  /** Explicit months target; falsy → fallback 12. */
  emergencyMonthsTarget: number;
  /** Live/cloud SSF monthly contribution. */
  monthlySsfContributionNpr: number;
  /** Target contribution for 100% SSF (e.g. ~10% of income). */
  ssfContributionTargetNpr: number;
  /** Listed investment portfolio total (canonical wealth totalInvestmentNpr). */
  totalInvestmentNpr: number;
  /** Investment goal target; falsy → fallback 2_000_000 only when no goal exists. */
  investmentGoalTargetNpr: number | null;
  /**
   * Modeled monthly passive income — same formula as Return KPI
   * (`passiveIncomeMonthlyNpr`: 4% investable/12 + dividends + FD interest).
   */
  modeledPassiveMonthlyNpr: number;
  /** Cash passive lines only (dividends + FD + rental + pension + SWP) — actual recorded. */
  actualPassiveMonthlyNpr: number;
  /** Passive goal target (typically Nepal COL or floor). */
  passiveTargetMonthlyNpr: number;
  insurancePolicies: InsurancePolicy[];
  insuranceInputs: InsuranceEngineInputs;
  /** Single canonical house funded % (0–100). */
  houseProgressPct: number;
  /** Whether a house savings goal (or progress source) exists. */
  houseGoalConfigured: boolean;
  adults: number;
  children: number;
  /** True when COL/household was user-persisted or differs from factory defaults. */
  householdConfigured: boolean;
  schoolFeesMonthlyNpr: number;
  healthcareMonthlyNpr: number;
  /** True when school/healthcare amounts come from user goals or settlement — not COL defaults alone. */
  familyCostSignalsConfigured: boolean;
  settlementChecklistLength: number;
  businessCapitalNpr: number;
  businessGoalConfigured: boolean;
  businessCapitalTargetNpr: number;
  liabilitiesNpr: number;
  /** True once the user has added liability rows or acknowledged debt status. */
  liabilitiesConfigured: boolean;
};

export const RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS = 12;
export const RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR = 2_000_000;
export const RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR = 1_000_000;
export const RETURN_CHECKLIST_FALLBACK_PASSIVE_FLOOR_NPR = 25_000;

export function deriveChecklistStatus(pct: number): ChecklistStatus {
  if (pct >= 100) return "completed";
  if (pct >= 75) return "on_track";
  if (pct >= 35) return "in_progress";
  return "missing";
}

function coverageProgressPct(current: number, recommended: number): number {
  if (recommended <= 0) return current > 0 ? 100 : 0;
  return Math.min(100, (current / (recommended * 0.7)) * 100);
}

/**
 * Pure Return Checklist compute — all I/O must be resolved into `sources` first.
 */
export function computeReturnChecklist(sources: ReturnChecklistSources): ReturnChecklistItem[] {
  const {
    emergencyCashReserveNpr,
    emergencyMonthlyBurnNpr,
    emergencyMonthsTarget,
    monthlySsfContributionNpr,
    ssfContributionTargetNpr,
    totalInvestmentNpr,
    investmentGoalTargetNpr,
    modeledPassiveMonthlyNpr,
    actualPassiveMonthlyNpr,
    passiveTargetMonthlyNpr,
    insurancePolicies,
    insuranceInputs,
    houseProgressPct,
    houseGoalConfigured,
    adults,
    children,
    householdConfigured,
    schoolFeesMonthlyNpr,
    healthcareMonthlyNpr,
    familyCostSignalsConfigured,
    settlementChecklistLength,
    businessCapitalNpr,
    businessGoalConfigured,
    businessCapitalTargetNpr,
    liabilitiesNpr,
    liabilitiesConfigured,
  } = sources;

  const emergencyTarget = emergencyMonthsTarget > 0 ? emergencyMonthsTarget : RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS;
  const emergencyConfigured =
    emergencyCashReserveNpr != null && Number.isFinite(emergencyCashReserveNpr);
  const emergencyReserve = emergencyConfigured ? Math.max(0, emergencyCashReserveNpr) : 0;
  const burn = Math.max(0, emergencyMonthlyBurnNpr);
  const emergencyRunwayMonths = burn > 0 ? emergencyReserve / burn : emergencyConfigured ? emergencyTarget * 2 : 0;
  const emergencyPct = emergencyConfigured ? (emergencyRunwayMonths / emergencyTarget) * 100 : 0;

  const ssfTarget = Math.max(1, ssfContributionTargetNpr);
  const ssfPct = (Math.max(0, monthlySsfContributionNpr) / ssfTarget) * 100;

  const investmentTarget =
    investmentGoalTargetNpr != null && investmentGoalTargetNpr > 0
      ? investmentGoalTargetNpr
      : RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR;
  const investmentPct = (Math.max(0, totalInvestmentNpr) / investmentTarget) * 100;

  const passiveTarget = Math.max(passiveTargetMonthlyNpr, RETURN_CHECKLIST_FALLBACK_PASSIVE_FLOOR_NPR);
  const passivePct = (Math.max(0, modeledPassiveMonthlyNpr) / passiveTarget) * 100;

  const recommendation = computeInsuranceRecommendation(insurancePolicies, insuranceInputs);
  const healthOk = hasAdequateHealthInsurance(insurancePolicies, recommendation.recommendedHealthCoverageNpr);
  const lifeOk = hasAdequateLifeInsurance(insurancePolicies, recommendation.recommendedLifeCoverageNpr);
  const healthCoverage = sumCoverageByType(insurancePolicies, "health");
  const lifeCoverage = sumCoverageByType(insurancePolicies, "life");
  const healthPct = healthOk ? 100 : coverageProgressPct(healthCoverage, recommendation.recommendedHealthCoverageNpr);
  const lifePct = lifeOk ? 100 : coverageProgressPct(lifeCoverage, recommendation.recommendedLifeCoverageNpr);

  const housePct = houseGoalConfigured ? houseProgressPct : 0;

  const schoolOk =
    familyCostSignalsConfigured && (schoolFeesMonthlyNpr > 0 || (householdConfigured && children === 0));
  const healthCostOk = familyCostSignalsConfigured && healthcareMonthlyNpr > 0;
  const settlementOk = settlementChecklistLength >= 2;
  const familyPct =
    ((schoolOk ? 1 : 0) + (healthCostOk ? 1 : 0) + (settlementOk ? 1 : 0) + (householdConfigured ? 1 : 0)) / 4;

  const businessTarget =
    businessCapitalTargetNpr > 0 ? businessCapitalTargetNpr : RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR;
  const businessPct = businessGoalConfigured ? (businessCapitalNpr / businessTarget) * 100 : 0;

  let debtPct = 0;
  if (!liabilitiesConfigured) {
    debtPct = 0;
  } else if (liabilitiesNpr <= 0) {
    debtPct = 100;
  } else {
    debtPct = Math.max(0, 100 - Math.min(100, (liabilitiesNpr / Math.max(totalInvestmentNpr + liabilitiesNpr, 1)) * 100));
  }

  return [
    {
      id: "emergency",
      label: `Emergency Fund (${emergencyTarget} Months)`,
      status: deriveChecklistStatus(emergencyPct),
      detail: emergencyConfigured
        ? `${emergencyRunwayMonths.toFixed(1)} mo runway`
        : "Set emergency reserve in Emergency Fund",
    },
    {
      id: "ssf",
      label: "Nepal SSF Retirement",
      status: deriveChecklistStatus(ssfPct),
      detail:
        monthlySsfContributionNpr > 0
          ? `NPR ${Math.round(monthlySsfContributionNpr).toLocaleString("en-NP")}/mo`
          : "Set up in SSF workspace",
    },
    {
      id: "investment",
      label: "Investment Portfolio",
      status: deriveChecklistStatus(investmentPct),
      detail:
        totalInvestmentNpr > 0
          ? `NPR ${Math.round(totalInvestmentNpr).toLocaleString("en-NP")}`
          : "Add investments",
    },
    {
      id: "passive",
      label: "Passive Income Goal",
      status: deriveChecklistStatus(passivePct),
      detail: `NPR ${Math.round(modeledPassiveMonthlyNpr).toLocaleString("en-NP")}/mo modeled · NPR ${Math.round(actualPassiveMonthlyNpr).toLocaleString("en-NP")}/mo actual`,
    },
    {
      id: "health",
      label: "Health Insurance",
      status: healthOk ? "completed" : deriveChecklistStatus(healthPct),
      detail: healthOk
        ? "Coverage on track"
        : insurancePolicies.some((p) => p.type === "health")
          ? `NPR ${Math.round(healthCoverage).toLocaleString("en-NP")} coverage`
          : "Open Insurance workspace",
    },
    {
      id: "life",
      label: "Life Insurance",
      status: lifeOk ? "completed" : deriveChecklistStatus(lifePct),
      detail: lifeOk
        ? "Family protection locked"
        : insurancePolicies.some((p) => p.type === "life")
          ? `NPR ${Math.round(lifeCoverage).toLocaleString("en-NP")} coverage`
          : "Open Insurance workspace",
    },
    {
      id: "house",
      label: "House in Nepal",
      status: deriveChecklistStatus(housePct),
      detail: houseGoalConfigured ? `${houseProgressPct.toFixed(0)}% funded` : "Set house goal in Savings",
    },
    {
      id: "family",
      label: "Family & Education",
      status: deriveChecklistStatus(familyPct * 100),
      detail: householdConfigured
        ? `${adults} adults · ${children} children`
        : "Set household in Cost of Living",
    },
    {
      id: "business",
      label: "Business Capital",
      status: deriveChecklistStatus(businessPct),
      detail: businessGoalConfigured
        ? businessCapitalNpr > 0
          ? `NPR ${Math.round(businessCapitalNpr).toLocaleString("en-NP")}`
          : "Business goal set — add savings"
        : "Set capital goal",
    },
    {
      id: "debt",
      label: "Debt Free Status",
      status: deriveChecklistStatus(debtPct),
      detail: !liabilitiesConfigured
        ? "Confirm liabilities in Portfolio"
        : liabilitiesNpr > 0
          ? `NPR ${Math.round(liabilitiesNpr).toLocaleString("en-NP")} liabilities`
          : "No liabilities",
    },
  ];
}
