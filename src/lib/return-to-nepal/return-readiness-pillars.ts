import { computeInsuranceRecommendation, hasAdequateHealthInsurance, hasAdequateLifeInsurance } from "@/lib/insurance/insurance-engine";
import { loadInsuranceWorkspaceState } from "@/lib/insurance/insurance-storage";
import type { InsuranceEngineInputs } from "@/lib/insurance/insurance-types";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ReturnReadinessPillarId, ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { loadSsfPensionWorkspace } from "@/lib/ssf-pension/storage";

export type ReturnReadinessPillarStatus = {
  id: ReturnReadinessPillarId;
  label: string;
  done: boolean;
  detail: string;
};

/**
 * Live Return OS pillars — Insurance Health/Life auto-update from Insurance Workspace.
 */
export function computeReturnReadinessPillars(
  state: ReturnToNepalPlannerState,
  snapshot: PlannerSnapshot,
  insuranceInputs: InsuranceEngineInputs,
  investableNpr: number,
): ReturnReadinessPillarStatus[] {
  const policies = loadInsuranceWorkspaceState().policies;
  const recommendation = computeInsuranceRecommendation(policies, insuranceInputs);
  const healthOk = hasAdequateHealthInsurance(policies, recommendation.recommendedHealthCoverageNpr);
  const lifeOk = hasAdequateLifeInsurance(policies, recommendation.recommendedLifeCoverageNpr);
  const ssf = loadSsfPensionWorkspace();
  const emergencyOk =
    snapshot.emergencyStatusLabel === "solid" || snapshot.emergencyStatusLabel === "elite";
  const investmentOk = investableNpr >= 500_000;
  const passiveOk = snapshot.passiveMonthlyNpr >= 25_000;
  const houseOk = snapshot.houseTotalBudgetNpr > 0 && state.houseProgressPct >= 20;
  const businessOk = state.businessCapitalNpr >= 500_000;

  return [
    {
      id: "emergencyFund",
      label: "Emergency Fund",
      done: emergencyOk,
      detail: `${snapshot.emergencyReserveMonths.toFixed(1)} mo runway`,
    },
    {
      id: "nepalSsf",
      label: "Nepal SSF",
      done: ssf.projection.monthlySsfContributionNpr > 0,
      detail:
        ssf.projection.monthlySsfContributionNpr > 0
          ? `NPR ${Math.round(ssf.projection.monthlySsfContributionNpr).toLocaleString("en-NP")}/mo`
          : "Not contributing yet",
    },
    {
      id: "investment",
      label: "Investment",
      done: investmentOk,
      detail: investableNpr > 0 ? `NPR ${Math.round(investableNpr).toLocaleString("en-NP")} investable` : "Build investable assets",
    },
    {
      id: "healthInsurance",
      label: "Health Insurance",
      done: healthOk,
      detail: healthOk ? "Coverage on track" : "Open Insurance Workspace",
    },
    {
      id: "lifeInsurance",
      label: "Life Insurance",
      done: lifeOk,
      detail: lifeOk ? "Family protection locked" : "Open Insurance Workspace",
    },
    {
      id: "passiveIncome",
      label: "Passive Income",
      done: passiveOk,
      detail: `NPR ${Math.round(snapshot.passiveMonthlyNpr).toLocaleString("en-NP")}/mo`,
    },
    {
      id: "houseFund",
      label: "House Fund",
      done: houseOk,
      detail: `${state.houseProgressPct.toFixed(0)}% build progress`,
    },
    {
      id: "businessCapital",
      label: "Business Capital",
      done: businessOk,
      detail:
        state.businessCapitalNpr > 0
          ? `NPR ${Math.round(state.businessCapitalNpr).toLocaleString("en-NP")}`
          : "Set startup capital",
    },
  ];
}

/** Sync Insurance Workspace adequacy into Return settlement checklist. */
export function syncInsuranceSettlementFlags(
  checklist: ReturnToNepalPlannerState["settlementChecklist"],
  insuranceInputs: InsuranceEngineInputs,
): ReturnToNepalPlannerState["settlementChecklist"] {
  const policies = loadInsuranceWorkspaceState().policies;
  const recommendation = computeInsuranceRecommendation(policies, insuranceInputs);
  const healthOk = hasAdequateHealthInsurance(policies, recommendation.recommendedHealthCoverageNpr);
  const lifeOk = hasAdequateLifeInsurance(policies, recommendation.recommendedLifeCoverageNpr);

  let next = [...checklist];
  const setFlag = (id: "healthInsurance" | "lifeInsurance", on: boolean) => {
    const has = next.includes(id);
    if (on && !has) next = [...next, id];
    if (!on && has) next = next.filter((item) => item !== id);
  };
  setFlag("healthInsurance", healthOk);
  setFlag("lifeInsurance", lifeOk);
  return next;
}
