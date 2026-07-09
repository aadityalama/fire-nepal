import { computeInsuranceRecommendation, hasAdequateHealthInsurance, hasAdequateLifeInsurance } from "@/lib/insurance/insurance-engine";
import { loadInsuranceWorkspaceState } from "@/lib/insurance/insurance-storage";
import type { InsuranceEngineInputs } from "@/lib/insurance/insurance-types";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { loadSsfPensionWorkspace } from "@/lib/ssf-pension/storage";

export type ChecklistStatus = "completed" | "on_track" | "in_progress" | "missing";

export type ReturnChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
};

function deriveStatus(pct: number): ChecklistStatus {
  if (pct >= 100) return "completed";
  if (pct >= 75) return "on_track";
  if (pct >= 35) return "in_progress";
  return "missing";
}

export function computeReturnChecklist(
  state: ReturnToNepalPlannerState,
  snapshot: PlannerSnapshot,
  insuranceInputs: InsuranceEngineInputs,
  investableNpr: number,
  liabilitiesNpr: number,
): ReturnChecklistItem[] {
  const policies = loadInsuranceWorkspaceState().policies;
  const recommendation = computeInsuranceRecommendation(policies, insuranceInputs);
  const healthOk = hasAdequateHealthInsurance(policies, recommendation.recommendedHealthCoverageNpr);
  const lifeOk = hasAdequateLifeInsurance(policies, recommendation.recommendedLifeCoverageNpr);
  const ssf = loadSsfPensionWorkspace();

  const emergencyTarget = Math.max(1, state.emergencyMonthsTarget);
  const emergencyPct = (snapshot.emergencyReserveMonths / emergencyTarget) * 100;

  const passiveTarget = Math.max(snapshot.monthlyNepalLivingNpr, 25_000);
  const passivePct = (snapshot.passiveMonthlyNpr / passiveTarget) * 100;

  const houseTarget = Math.max(snapshot.houseTotalBudgetNpr, 1);
  const housePct = ((snapshot.totalReturnFundNpr + state.houseProgressPct * houseTarget * 0.01) / houseTarget) * 100;

  const investmentPct = (investableNpr / 2_000_000) * 100;
  const ssfPct = ssf.projection.monthlySsfContributionNpr > 0 ? 80 : 0;
  const debtPct = liabilitiesNpr <= 0 ? 100 : Math.max(0, 100 - (liabilitiesNpr / Math.max(snapshot.totalReturnFundNpr, 1)) * 100);

  const familyPct =
    ((state.schoolFeesMonthlyNpr > 0 || state.children === 0 ? 1 : 0) +
      (state.healthcareMonthlyNpr > 0 ? 1 : 0) +
      (state.settlementChecklist.length >= 2 ? 1 : 0)) /
    3;

  const businessPct = (state.businessCapitalNpr / 1_000_000) * 100;

  return [
    {
      id: "emergency",
      label: `Emergency Fund (${emergencyTarget} Months)`,
      status: deriveStatus(emergencyPct),
      detail: `${snapshot.emergencyReserveMonths.toFixed(1)} mo runway`,
    },
    {
      id: "ssf",
      label: "Nepal SSF Retirement",
      status: deriveStatus(ssfPct),
      detail: ssf.projection.monthlySsfContributionNpr > 0 ? "Contributing" : "Set up in SSF workspace",
    },
    {
      id: "investment",
      label: "Investment Portfolio",
      status: deriveStatus(investmentPct),
      detail: investableNpr > 0 ? `NPR ${Math.round(investableNpr).toLocaleString("en-NP")}` : "Add investments",
    },
    {
      id: "passive",
      label: "Passive Income Goal",
      status: deriveStatus(passivePct),
      detail: `NPR ${Math.round(snapshot.passiveMonthlyNpr).toLocaleString("en-NP")}/mo`,
    },
    {
      id: "health",
      label: "Health Insurance",
      status: healthOk ? "completed" : deriveStatus(healthOk ? 100 : 20),
      detail: healthOk ? "Coverage on track" : "Open Insurance workspace",
    },
    {
      id: "life",
      label: "Life Insurance",
      status: lifeOk ? "completed" : deriveStatus(lifeOk ? 100 : 20),
      detail: lifeOk ? "Family protection locked" : "Open Insurance workspace",
    },
    {
      id: "house",
      label: "House in Nepal",
      status: deriveStatus(housePct),
      detail: `${state.houseProgressPct.toFixed(0)}% funded`,
    },
    {
      id: "family",
      label: "Family & Education",
      status: deriveStatus(familyPct * 100),
      detail: `${state.adults} adults · ${state.children} children`,
    },
    {
      id: "business",
      label: "Business Capital",
      status: deriveStatus(businessPct),
      detail: state.businessCapitalNpr > 0 ? `NPR ${Math.round(state.businessCapitalNpr).toLocaleString("en-NP")}` : "Set capital goal",
    },
    {
      id: "debt",
      label: "Debt Free Status",
      status: deriveStatus(debtPct),
      detail: liabilitiesNpr > 0 ? `NPR ${Math.round(liabilitiesNpr).toLocaleString("en-NP")} liabilities` : "No liabilities",
    },
  ];
}
