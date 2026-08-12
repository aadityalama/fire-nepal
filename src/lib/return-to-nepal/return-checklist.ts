import { computeInsuranceRecommendation, hasAdequateHealthInsurance, hasAdequateLifeInsurance } from "@/lib/insurance/insurance-engine";
import { loadInsuranceWorkspaceState } from "@/lib/insurance/insurance-storage";
import type { InsuranceEngineInputs } from "@/lib/insurance/insurance-types";
import {
  checklistItemHref,
  ctaForChecklistStatus,
  type ReturnChecklistItemId,
} from "@/lib/return-to-nepal/checklist-nav";
import { houseFundingNotRequired, resolveEffectiveHouseDecision } from "@/lib/return-to-nepal/house-plan";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";
import type { ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";
import { loadSsfPensionWorkspace } from "@/lib/ssf-pension/storage";

export type ChecklistStatus = "completed" | "on_track" | "in_progress" | "missing";

export type ReturnChecklistItem = {
  id: ReturnChecklistItemId;
  label: string;
  status: ChecklistStatus;
  detail: string;
  /** Short subtitle under the title (target / context). */
  subtitle: string;
  /** Primary progress / current value line. */
  progressLabel: string;
  /** Actionable status copy: Needs your input / Almost there / All set / Not needed. */
  statusHint: string;
  ctaLabel: string;
  href: string;
};

function deriveStatus(pct: number): ChecklistStatus {
  if (pct >= 100) return "completed";
  if (pct >= 75) return "on_track";
  if (pct >= 35) return "in_progress";
  return "missing";
}

function withAction(
  item: Omit<ReturnChecklistItem, "statusHint" | "ctaLabel" | "href"> & { notNeeded?: boolean },
): ReturnChecklistItem {
  const { notNeeded, ...rest } = item;
  const { statusHint, ctaLabel } = ctaForChecklistStatus(rest.status, { notNeeded });
  return {
    ...rest,
    statusHint,
    ctaLabel,
    href: checklistItemHref(rest.id),
  };
}

export type ComputeReturnChecklistOptions = {
  /** When true, a House/Land savings goal exists — used only to resolve unknown → plan_to_buy_build display. */
  hasHouseSavingsGoal?: boolean;
};

export function computeReturnChecklist(
  state: ReturnToNepalPlannerState,
  snapshot: PlannerSnapshot,
  insuranceInputs: InsuranceEngineInputs,
  investableNpr: number,
  liabilitiesNpr: number,
  options: ComputeReturnChecklistOptions = {},
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

  const houseDecision = resolveEffectiveHouseDecision(state, Boolean(options.hasHouseSavingsGoal));
  let houseStatus: ChecklistStatus;
  let houseDetail: string;
  let houseSubtitle: string;
  let houseProgressLabel: string;
  let houseNotNeeded = false;

  if (houseDecision === "already_own") {
    houseStatus = "completed";
    houseSubtitle = "Already own a house";
    houseProgressLabel = "No funding required";
    houseDetail = "Already own a house";
  } else if (houseDecision === "not_needed") {
    houseStatus = "completed";
    houseNotNeeded = true;
    houseSubtitle = "No house needed";
    houseProgressLabel = "Excluded from funding plan";
    houseDetail = "Not needed";
  } else if (houseDecision === "plan_to_buy_build") {
    const houseTarget = Math.max(snapshot.houseTotalBudgetNpr, 1);
    const housePct =
      snapshot.houseTotalBudgetNpr > 0
        ? (state.houseProgressPct / 100) * 100
        : 0;
    // Prefer explicit saved/target progress; fall back to legacy fund-vs-budget when budget exists but progress is 0.
    const legacyFundPct =
      snapshot.houseTotalBudgetNpr > 0
        ? ((snapshot.totalReturnFundNpr + state.houseProgressPct * houseTarget * 0.01) / houseTarget) * 100
        : 0;
    const effectivePct = state.houseProgressPct > 0 ? housePct : legacyFundPct;
    houseStatus = deriveStatus(effectivePct);
    const modeLabel =
      state.houseAcquireMode === "build" ? "Plan to build" : state.houseAcquireMode === "buy" ? "Plan to buy" : "Plan to buy/build";
    houseSubtitle = modeLabel;
    houseProgressLabel =
      snapshot.houseTotalBudgetNpr > 0
        ? `${state.houseProgressPct.toFixed(0)}% funded · NPR ${Math.round(snapshot.houseTotalBudgetNpr).toLocaleString("en-NP")} target`
        : "Set target budget & savings";
    houseDetail = houseProgressLabel;
  } else {
    houseStatus = "missing";
    houseSubtitle = "Choose ownership plan";
    houseProgressLabel = "Not configured yet";
    houseDetail = "Tell us if you own, plan to buy/build, or don’t need a house";
  }

  const investmentPct = (investableNpr / 2_000_000) * 100;
  const ssfPct = ssf.projection.monthlySsfContributionNpr > 0 ? 80 : 0;
  const debtPct = liabilitiesNpr <= 0 ? 100 : Math.max(0, 100 - (liabilitiesNpr / Math.max(snapshot.totalReturnFundNpr, 1)) * 100);

  const familyPct =
    ((state.schoolFeesMonthlyNpr > 0 || state.children === 0 ? 1 : 0) +
      (state.healthcareMonthlyNpr > 0 ? 1 : 0) +
      (state.settlementChecklist.length >= 2 ? 1 : 0)) /
    3;

  const businessPct = (state.businessCapitalNpr / 1_000_000) * 100;

  const emergencyStatus = deriveStatus(emergencyPct);
  const ssfStatus = deriveStatus(ssfPct);
  const investmentStatus = deriveStatus(investmentPct);
  const passiveStatus = deriveStatus(passivePct);
  const familyStatus = deriveStatus(familyPct * 100);
  const businessStatus = deriveStatus(businessPct);
  const debtStatus = deriveStatus(debtPct);

  return [
    withAction({
      id: "emergency",
      label: "Emergency Fund",
      subtitle: `${emergencyTarget}-month target`,
      progressLabel: `${snapshot.emergencyReserveMonths.toFixed(1)} / ${emergencyTarget} months`,
      detail: `${snapshot.emergencyReserveMonths.toFixed(1)} mo runway`,
      status: emergencyStatus,
    }),
    withAction({
      id: "ssf",
      label: "Nepal SSF Retirement",
      subtitle: "Monthly SSF contribution",
      progressLabel:
        ssf.projection.monthlySsfContributionNpr > 0
          ? `NPR ${Math.round(ssf.projection.monthlySsfContributionNpr).toLocaleString("en-NP")}/mo`
          : "Not contributing yet",
      detail: ssf.projection.monthlySsfContributionNpr > 0 ? "Contributing" : "Set up in SSF workspace",
      status: ssfStatus,
    }),
    withAction({
      id: "investment",
      label: "Investment Portfolio",
      subtitle: investableNpr >= 2_000_000 ? "Goal reached" : "Toward NPR 20L investable",
      progressLabel:
        investableNpr > 0 ? `NPR ${Math.round(investableNpr).toLocaleString("en-NP")}` : "Add investments",
      detail: investableNpr > 0 ? `NPR ${Math.round(investableNpr).toLocaleString("en-NP")}` : "Add investments",
      status: investmentStatus,
    }),
    withAction({
      id: "passive",
      label: "Passive Income Goal",
      subtitle: `Cover NPR ${Math.round(passiveTarget).toLocaleString("en-NP")}/mo living`,
      progressLabel: `NPR ${Math.round(snapshot.passiveMonthlyNpr).toLocaleString("en-NP")}/mo`,
      detail: `NPR ${Math.round(snapshot.passiveMonthlyNpr).toLocaleString("en-NP")}/mo`,
      status: passiveStatus,
    }),
    withAction({
      id: "health",
      label: "Health Insurance",
      subtitle: healthOk ? "Coverage on track" : "Add health cover",
      progressLabel: healthOk ? "Adequate coverage" : "Needs setup",
      detail: healthOk ? "Coverage on track" : "Open Insurance workspace",
      status: healthOk ? "completed" : deriveStatus(20),
    }),
    withAction({
      id: "life",
      label: "Life Insurance",
      subtitle: lifeOk ? "Family protection locked" : "Add life cover",
      progressLabel: lifeOk ? "Adequate coverage" : "Needs setup",
      detail: lifeOk ? "Family protection locked" : "Open Insurance workspace",
      status: lifeOk ? "completed" : deriveStatus(20),
    }),
    withAction({
      id: "house",
      label: "House in Nepal",
      subtitle: houseSubtitle,
      progressLabel: houseProgressLabel,
      detail: houseDetail,
      status: houseStatus,
      notNeeded: houseNotNeeded,
    }),
    withAction({
      id: "family",
      label: "Family & Education",
      subtitle: "Household assumptions",
      progressLabel: `${state.adults} adults · ${state.children} children`,
      detail: `${state.adults} adults · ${state.children} children`,
      status: familyStatus,
    }),
    withAction({
      id: "business",
      label: "Business Capital",
      subtitle: "Startup / business goal",
      progressLabel:
        state.businessCapitalNpr > 0
          ? `NPR ${Math.round(state.businessCapitalNpr).toLocaleString("en-NP")}`
          : "Set capital goal",
      detail:
        state.businessCapitalNpr > 0
          ? `NPR ${Math.round(state.businessCapitalNpr).toLocaleString("en-NP")}`
          : "Set capital goal",
      status: businessStatus,
    }),
    withAction({
      id: "debt",
      label: "Debt Free Status",
      subtitle: liabilitiesNpr > 0 ? "Review liabilities" : "No liabilities on file",
      progressLabel:
        liabilitiesNpr > 0
          ? `NPR ${Math.round(liabilitiesNpr).toLocaleString("en-NP")} liabilities`
          : "Debt free",
      detail:
        liabilitiesNpr > 0
          ? `NPR ${Math.round(liabilitiesNpr).toLocaleString("en-NP")} liabilities`
          : "No liabilities",
      status: debtStatus,
    }),
  ];
}

export { houseFundingNotRequired };
