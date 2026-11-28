import {
  computeInsuranceRecommendation,
  hasAdequateHealthInsurance,
  hasAdequateLifeInsurance,
} from "@/lib/insurance/insurance-engine";
import type { InsuranceEngineInputs, InsurancePolicy } from "@/lib/insurance/insurance-types";
import { formatNprCompact, sumCoverageByType } from "@/lib/insurance/insurance-utils";
import {
  formatEmergencyRunwayDetail,
  type CanonicalEmergencyFundSnapshot,
  type CanonicalEmergencyFundStatus,
} from "@/lib/return-to-nepal/canonical-emergency-fund";
import type { PassiveIncomeBreakdownLine } from "@/lib/cashflow/passive-income-from-cashflow";
import {
  deriveFundingStatus,
  type ChecklistStatus,
} from "@/lib/return-to-nepal/checklist-status";
import { returnChecklistHref } from "@/lib/return-to-nepal/return-checklist-routes";
import { computePensionProjection } from "@/lib/ssf-pension/projection";
import type { SsfPensionWorkspaceState } from "@/lib/ssf-pension/storage";
import type { HousePlanStatus, ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

export type { ChecklistStatus } from "@/lib/return-to-nepal/checklist-status";

export type ReturnChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
  /** Real app route — whole card must navigate here. */
  href: string;
  /** Optional badge override (e.g. Not Needed). */
  badgeLabel?: string;
  /** Context-aware CTA shown on the card (e.g. Update Emergency Fund). */
  actionLabel: string;
  /** Optional coverage % (may exceed 100; UI bar caps at 100). */
  coveragePct?: number | null;
  /** Expandable income / funding breakdown lines. */
  breakdownLines?: Array<{ label: string; value: string; tone?: "passive" | "active" | "muted" }>;
};

/** Canonical inputs for Return Checklist — no localStorage reads inside the pure compute. */
export type ReturnChecklistSources = {
  state: ReturnToNepalPlannerState;
  /**
   * @deprecated Prefer `canonicalEmergencyFund`. Legacy reserve mirror.
   * Null/undefined = not configured when canonical snapshot is absent.
   */
  emergencyCashReserveNpr: number | null | undefined;
  /**
   * @deprecated Prefer `canonicalEmergencyFund.monthlyProtectionBasisNpr`.
   * Legacy monthly burn (cashflow / COL) — not used when canonical is ready.
   */
  emergencyMonthlyBurnNpr: number;
  /** Explicit months target; falsy → fallback 12. */
  emergencyMonthsTarget: number;
  /** Authoritative Emergency Fund 3.0 snapshot when loaded by the Return Planner. */
  canonicalEmergencyFund?: CanonicalEmergencyFundSnapshot | null;
  /** Live/cloud SSF monthly contribution. */
  monthlySsfContributionNpr: number;
  /** Target contribution for 100% SSF (e.g. ~10% of income). */
  ssfContributionTargetNpr: number;
  /** Full SSF workspace when available — never invent eligibility rules. */
  ssfWorkspace?: SsfPensionWorkspaceState | null;
  /**
   * Explicit opt-out. Until a planner control exists, remains false.
   * Reserved for NOT APPLICABLE when the user excludes SSF.
   */
  ssfNotApplicable?: boolean;
  /**
   * Listed investment current market value — same SoT as NEPSE Portfolio
   * Current Value when live marks are applied (`wealth.totalInvestmentNpr`).
   */
  totalInvestmentNpr: number;
  /** Listed cost basis (NEPSE "Total Investment"). Optional for detail. */
  investmentCostNpr?: number | null;
  /**
   * Expense-based FIRE corpus target (monthly eligible living × 12 × 25).
   * Null = Expense Tracking and Budget Tracking both lack a valid basis.
   */
  investmentGoalTargetNpr: number | null;
  /** Where investmentGoalTargetNpr came from (for transparent UI). */
  investmentTargetSource?: "expense_tracking" | "budget_tracking" | null;
  /** Monthly eligible living expenses used for the 25× corpus (when known). */
  investmentMonthlyExpenseBasisNpr?: number | null;
  /**
   * Modeled investment income (4% investable/12 + portfolio FD) — never qualifies COMPLETED alone.
   */
  modeledPassiveMonthlyNpr: number;
  /** Recurring eligible Cashflow passive (rental, dividends, classified passive, + SWP). */
  actualPassiveMonthlyNpr: number;
  /** Passive cash received in the reporting month (Cashflow). */
  periodActualPassiveNpr?: number;
  /** Income breakdown lines for expandable UI. */
  passiveIncomeBreakdown?: PassiveIncomeBreakdownLine[];
  /** True when Cashflow confirmed income records exist (any class). */
  cashflowHasIncomeRecords?: boolean;
  /** Authenticated cashflow still hydrating. */
  cashflowLoading?: boolean;
  /** Authenticated cashflow retrieval failed. */
  cashflowUnavailable?: boolean;
  /** Passive goal target (expense-based monthly living when available). Null = not configured. */
  passiveTargetMonthlyNpr: number | null;
  insurancePolicies: InsurancePolicy[];
  insuranceInputs: InsuranceEngineInputs;
  /** True while insurance policies are still hydrating. */
  insuranceLoading?: boolean;
  /** True when insurance hydrate failed. */
  insuranceUnavailable?: boolean;
  /** Single canonical house funded % (0–100). */
  houseProgressPct: number;
  /** Whether a house savings goal (or progress source) exists. */
  houseGoalConfigured: boolean;
  housePlanStatus: HousePlanStatus;
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
  /**
   * Explicit opt-out for business capital. Reserved; false until planner control exists.
   */
  businessNotApplicable?: boolean;
  liabilitiesNpr: number;
  /** True once the user has added liability rows or acknowledged debt status. */
  liabilitiesConfigured: boolean;
  /** True while portfolio/wealth liabilities are still hydrating. */
  liabilitiesLoading?: boolean;
  liabilitiesUnavailable?: boolean;
};

export const RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS = 12;
/** Display-only reference — never used alone to invent COMPLETED/MISSING status. */
export const RETURN_CHECKLIST_FALLBACK_INVESTMENT_TARGET_NPR = 2_000_000;
export const RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR = 1_000_000;
export const RETURN_CHECKLIST_FALLBACK_PASSIVE_FLOOR_NPR = 25_000;

/** @deprecated Use deriveFundingStatus — kept for older call sites/tests. */
export function deriveChecklistStatus(pct: number): ChecklistStatus {
  if (pct >= 100) return "completed";
  if (pct >= 75) return "on_track";
  if (pct > 0) return "in_progress";
  return "missing";
}

function checklistStatusFromCanonical(
  status: CanonicalEmergencyFundStatus,
): ChecklistStatus {
  if (status === "data_unavailable") return "data_unavailable";
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return "missing";
}

function formatNpr(amount: number): string {
  return Math.round(amount).toLocaleString("en-NP");
}

function buildEmergencyChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel"
> {
  const canonical = sources.canonicalEmergencyFund;
  const emergencyTarget =
    sources.emergencyMonthsTarget > 0
      ? sources.emergencyMonthsTarget
      : RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS;

  if (canonical && canonical.loadState === "loading") {
    return {
      status: "loading",
      detail: "Verifying Emergency Fund…",
      badgeLabel: "Loading",
    };
  }

  if (canonical && canonical.loadState === "unavailable") {
    return {
      status: "data_unavailable",
      detail: "Could not verify Emergency Fund",
      badgeLabel: "Data Unavailable",
    };
  }

  if (canonical && canonical.loadState === "ready") {
    if (canonical.completionStatus === "data_unavailable") {
      return {
        status: "data_unavailable",
        detail:
          !canonical.hasBudgetProtectionBasis || canonical.emergencyFundTargetNpr == null
            ? "Budget protection basis unavailable"
            : "Could not verify Emergency Fund",
        badgeLabel: "Data Unavailable",
      };
    }
    return {
      status: checklistStatusFromCanonical(canonical.completionStatus),
      detail:
        canonical.completionStatus === "missing"
          ? "Set emergency reserve in Emergency Fund"
          : formatEmergencyRunwayDetail(canonical.safetyRunwayMonths),
      badgeLabel: undefined,
    };
  }

  // Legacy path (tests / callers without canonical snapshot).
  const emergencyConfigured =
    sources.emergencyCashReserveNpr != null && Number.isFinite(sources.emergencyCashReserveNpr);
  const emergencyReserve = emergencyConfigured ? Math.max(0, sources.emergencyCashReserveNpr!) : 0;
  const burn = Math.max(0, sources.emergencyMonthlyBurnNpr);
  const emergencyRunwayMonths =
    burn > 0 ? emergencyReserve / burn : emergencyConfigured ? emergencyTarget * 2 : 0;
  const emergencyPct = emergencyConfigured ? (emergencyRunwayMonths / emergencyTarget) * 100 : 0;

  if (!emergencyConfigured) {
    return {
      status: "missing",
      detail: "Set emergency reserve in Emergency Fund",
    };
  }

  let status: ChecklistStatus = "missing";
  if (emergencyReserve > 0 && emergencyPct >= 100) status = "completed";
  else if (emergencyReserve > 0) status = "in_progress";

  return {
    status,
    detail: `${emergencyRunwayMonths.toFixed(1)} mo runway`,
  };
}

function ssfPlanConfigured(sources: ReturnChecklistSources): boolean {
  if (sources.monthlySsfContributionNpr > 0) return true;
  const ws = sources.ssfWorkspace;
  if (!ws) return false;
  const p = ws.projection;
  return (
    p.monthlySsfContributionNpr > 0 ||
    p.monthlySalaryNpr > 0 ||
    (p.currentAge > 0 && p.retirementAge > p.currentAge)
  );
}

function buildSsfChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel"
> {
  if (sources.ssfNotApplicable) {
    return {
      status: "not_applicable",
      detail: "SSF excluded from retirement plan",
      badgeLabel: "Not Applicable",
    };
  }

  const configured = ssfPlanConfigured(sources);
  const contrib = Math.max(0, sources.monthlySsfContributionNpr);
  const target =
    sources.ssfContributionTargetNpr > 0 ? sources.ssfContributionTargetNpr : null;

  if (!configured) {
    return {
      status: "missing",
      detail: "Set up in SSF workspace",
    };
  }

  const status = deriveFundingStatus({
    actual: contrib,
    target,
    requirementApplies: true,
  });

  let detail = `NPR ${formatNpr(contrib)}/mo`;
  const ws = sources.ssfWorkspace;
  if (ws && ws.projection.currentAge > 0 && ws.projection.retirementAge > ws.projection.currentAge) {
    const projection = computePensionProjection(ws.projection);
    if (projection.estimatedMonthlyPensionNpr > 0) {
      detail += ` · est. pension NPR ${formatNpr(projection.estimatedMonthlyPensionNpr)}/mo`;
    }
  } else if (target != null && contrib < target) {
    detail += ` · target NPR ${formatNpr(target)}/mo`;
  }

  return { status, detail };
}

function buildInvestmentChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel"
> {
  const market = Math.max(0, sources.totalInvestmentNpr);
  const cost =
    sources.investmentCostNpr != null && Number.isFinite(sources.investmentCostNpr)
      ? Math.max(0, sources.investmentCostNpr)
      : null;
  const target =
    sources.investmentGoalTargetNpr != null && sources.investmentGoalTargetNpr > 0
      ? sources.investmentGoalTargetNpr
      : null;

  const status = deriveFundingStatus({
    actual: market,
    target,
    requirementApplies: true,
  });

  const marketLabel = formatNprCompact(market);
  const costSuffix =
    cost != null && Math.abs(cost - market) > 1
      ? ` · cost ${formatNprCompact(cost).replace(/^NPR\s+/, "")}`
      : "";

  const sourceHint =
    sources.investmentTargetSource === "expense_tracking"
      ? " · 25× Expense Tracking"
      : sources.investmentTargetSource === "budget_tracking"
        ? " · 25× Budget Tracking"
        : "";
  const monthlyBasis =
    sources.investmentMonthlyExpenseBasisNpr != null && sources.investmentMonthlyExpenseBasisNpr > 0
      ? sources.investmentMonthlyExpenseBasisNpr
      : null;
  const monthlyHint =
    monthlyBasis != null ? ` · living ${formatNprCompact(monthlyBasis).replace(/^NPR\s+/, "")}/mo` : "";

  if (status === "target_not_set") {
    return {
      status,
      detail: `${marketLabel} market${costSuffix} · set expenses or budget for 25× FIRE target`,
      badgeLabel: "Target Not Set",
    };
  }
  if (status === "missing") {
    return { status, detail: "Add investments" };
  }
  if (status === "completed") {
    return {
      status,
      detail: `${marketLabel} market${costSuffix} · 25× FIRE met${sourceHint}${monthlyHint}`,
    };
  }
  const targetLabel = formatNprCompact(target!);
  const pct =
    target! > 0 ? Math.max(0, Math.min(100, Math.round((market / target!) * 10000) / 100)) : 0;
  const pctLabel = pct > 0 && pct < 1 ? pct.toFixed(2) : String(Math.round(pct));
  return {
    status,
    detail: `${marketLabel} / ${targetLabel.replace(/^NPR\s+/, "")}${costSuffix} · ${pctLabel}%${sourceHint}${monthlyHint}`,
  };
}

function buildPassiveChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel" | "coveragePct" | "breakdownLines"
> {
  if (sources.cashflowLoading) {
    return {
      status: "loading",
      detail: "Verifying Cashflow income…",
      badgeLabel: "Loading",
    };
  }
  if (sources.cashflowUnavailable) {
    return {
      status: "data_unavailable",
      detail: "Could not verify Cashflow income",
      badgeLabel: "Data Unavailable",
    };
  }

  const modeled = Math.max(0, sources.modeledPassiveMonthlyNpr);
  const recurring = Math.max(0, sources.actualPassiveMonthlyNpr);
  const period =
    sources.periodActualPassiveNpr != null && Number.isFinite(sources.periodActualPassiveNpr)
      ? Math.max(0, sources.periodActualPassiveNpr)
      : recurring;
  const rawTarget = sources.passiveTargetMonthlyNpr;
  const target = rawTarget != null && rawTarget > 0 ? rawTarget : null;

  // COMPLETED only from verified recurring Cashflow passive — never modeled alone / one-time.
  let status = deriveFundingStatus({
    actual: recurring,
    target,
    requirementApplies: true,
  });

  // Modeled-only progress: IN PROGRESS when cashflow has no recurring passive yet.
  if (status === "missing" && modeled > 0) {
    status = "in_progress";
  }

  const coveragePct =
    target != null && target > 0
      ? Math.round((recurring / target) * 10000) / 100
      : null;
  const coverageLabel =
    coveragePct == null
      ? ""
      : coveragePct > 0 && coveragePct < 1
        ? ` · ${coveragePct.toFixed(2)}%`
        : ` · ${Math.round(coveragePct)}%`;
  const gapNpr = target != null && target > recurring ? target - recurring : 0;
  const gap = gapNpr > 0 ? ` · gap NPR ${formatNpr(gapNpr)}` : "";

  const detail = `Actual NPR ${formatNpr(recurring)}/mo · period NPR ${formatNpr(period)} · modeled NPR ${formatNpr(modeled)}/mo${
    target != null ? ` · target NPR ${formatNpr(target)}/mo${coverageLabel}${gap}` : ""
  }`;

  const breakdownLines: NonNullable<ReturnChecklistItem["breakdownLines"]> = [
    {
      label: "Recurring passive",
      value: `NPR ${formatNpr(recurring)}/mo`,
      tone: "passive",
    },
    {
      label: "Period received",
      value: `NPR ${formatNpr(period)}`,
      tone: "passive",
    },
    {
      label: "Modeled investment",
      value: `NPR ${formatNpr(modeled)}/mo`,
      tone: "muted",
    },
  ];
  if (target != null) {
    breakdownLines.push({
      label: "Monthly expense target",
      value: `NPR ${formatNpr(target)}/mo`,
      tone: "muted",
    });
    if (coveragePct != null) {
      breakdownLines.push({
        label: "Coverage",
        value: `${coveragePct > 0 && coveragePct < 1 ? coveragePct.toFixed(2) : Math.round(coveragePct)}%`,
        tone: "passive",
      });
    }
    if (gapNpr > 0) {
      breakdownLines.push({
        label: "Remaining gap",
        value: `NPR ${formatNpr(gapNpr)}/mo`,
        tone: "active",
      });
    }
  }
  for (const line of sources.passiveIncomeBreakdown ?? []) {
    breakdownLines.push({
      label: `${line.name} (${line.streamClass})`,
      value:
        line.streamClass === "passive" && line.recurringMonthlyNpr > 0
          ? `NPR ${formatNpr(line.recurringMonthlyNpr)}/mo`
          : `NPR ${formatNpr(line.periodReceivedNpr)}`,
      tone:
        line.streamClass === "passive"
          ? "passive"
          : line.streamClass === "one_time"
            ? "muted"
            : "active",
    });
  }

  if (status === "target_not_set") {
    return { status, detail, badgeLabel: "Target Not Set", coveragePct, breakdownLines };
  }
  return { status, detail, coveragePct, breakdownLines };
}

function buildInsuranceTypeFields(
  sources: ReturnChecklistSources,
  type: "health" | "life",
): Pick<ReturnChecklistItem, "status" | "detail" | "badgeLabel"> {
  if (sources.insuranceLoading) {
    return {
      status: "loading",
      detail: type === "health" ? "Verifying health cover…" : "Verifying life cover…",
      badgeLabel: "Loading",
    };
  }
  if (sources.insuranceUnavailable) {
    return {
      status: "data_unavailable",
      detail: "Could not verify Insurance workspace",
      badgeLabel: "Data Unavailable",
    };
  }

  const recommendation = computeInsuranceRecommendation(
    sources.insurancePolicies,
    sources.insuranceInputs,
  );
  const recommended =
    type === "health"
      ? recommendation.recommendedHealthCoverageNpr
      : recommendation.recommendedLifeCoverageNpr;
  const adequate =
    type === "health"
      ? hasAdequateHealthInsurance(sources.insurancePolicies, recommended)
      : hasAdequateLifeInsurance(sources.insurancePolicies, recommended);
  const coverage = sumCoverageByType(sources.insurancePolicies, type);
  const hasPolicy = sources.insurancePolicies.some(
    (p) => p.type === type && p.status !== "expired" && p.status !== "lapsed",
  );

  if (adequate) {
    return {
      status: "completed",
      detail:
        type === "health"
          ? `${formatNprCompact(coverage)} coverage · on track`
          : `${formatNprCompact(coverage)} coverage · family protection locked`,
    };
  }

  const status = deriveFundingStatus({
    actual: coverage,
    target: recommended > 0 ? recommended : null,
    requirementApplies: true,
  });

  if (!hasPolicy || coverage <= 0) {
    return {
      status: "missing",
      detail: "Open Insurance workspace",
    };
  }

  if (status === "target_not_set") {
    return {
      status,
      detail: `${formatNprCompact(coverage)} coverage · set coverage target`,
      badgeLabel: "Target Not Set",
    };
  }

  // Match Insurance workspace: actual / recommended + % covered (never MISSING for positive cover).
  const coveredPct =
    recommended > 0 ? Math.max(0, Math.min(100, Math.round((coverage / recommended) * 100))) : 0;
  const recommendedCompact = formatNprCompact(recommended).replace(/^NPR\s+/, "");
  return {
    status: status === "completed" ? "completed" : "in_progress",
    detail: `${formatNprCompact(coverage)} / ${recommendedCompact} · ${coveredPct}% covered`,
  };
}

function houseChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel"
> {
  const { housePlanStatus, houseGoalConfigured, houseProgressPct } = sources;
  if (housePlanStatus === "already_own") {
    return { status: "completed", detail: "Already own a house", badgeLabel: "Completed" };
  }
  if (housePlanStatus === "not_needed") {
    return {
      status: "not_applicable",
      detail: "House purchase not needed",
      badgeLabel: "Not Applicable",
    };
  }
  if (housePlanStatus === "plan_to_buy_build") {
    if (!houseGoalConfigured) {
      return {
        status: "target_not_set",
        detail: "Set house goal in Savings",
        badgeLabel: "Target Not Set",
      };
    }
    const status = deriveFundingStatus({
      actual: houseProgressPct,
      target: 100,
      requirementApplies: true,
    });
    return {
      status,
      detail: `${houseProgressPct.toFixed(0)}% funded`,
    };
  }
  return { status: "missing", detail: "Choose your house plan" };
}

function buildFamilyChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel"
> {
  const {
    adults,
    children,
    householdConfigured,
    schoolFeesMonthlyNpr,
    healthcareMonthlyNpr,
    familyCostSignalsConfigured,
    settlementChecklistLength,
  } = sources;

  if (!householdConfigured) {
    return {
      status: "missing",
      detail: "Set household in Cost of Living",
    };
  }

  // No dependents → education funding is not required (verified N/A signal).
  const schoolOk =
    children === 0
      ? true
      : familyCostSignalsConfigured && schoolFeesMonthlyNpr > 0;
  const healthCostOk = familyCostSignalsConfigured && healthcareMonthlyNpr > 0;
  const settlementOk = settlementChecklistLength >= 2;

  const signals = [schoolOk, healthCostOk, settlementOk];
  const met = signals.filter(Boolean).length;
  const detail =
    children === 0
      ? `${adults} adults · no dependents`
      : `${adults} adults · ${children} children`;

  if (met === signals.length) {
    return { status: "completed", detail };
  }
  if (met > 0 || familyCostSignalsConfigured) {
    return { status: "in_progress", detail };
  }
  return { status: "in_progress", detail: `${detail} · complete settlement plan` };
}

function buildBusinessChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel"
> {
  if (sources.businessNotApplicable) {
    return {
      status: "not_applicable",
      detail: "Business not part of return plan",
      badgeLabel: "Not Applicable",
    };
  }

  if (!sources.businessGoalConfigured) {
    return {
      status: "target_not_set",
      detail: "Set capital goal or mark not applicable",
      badgeLabel: "Target Not Set",
    };
  }

  const target =
    sources.businessCapitalTargetNpr > 0
      ? sources.businessCapitalTargetNpr
      : RETURN_CHECKLIST_FALLBACK_BUSINESS_TARGET_NPR;
  const actual = Math.max(0, sources.businessCapitalNpr);
  const status = deriveFundingStatus({
    actual,
    target,
    requirementApplies: true,
  });

  if (status === "missing") {
    return {
      status,
      detail: "Business goal set — add savings",
    };
  }
  return {
    status,
    detail: `NPR ${formatNpr(actual)} · target NPR ${formatNpr(target)}`,
  };
}

function buildDebtChecklistFields(sources: ReturnChecklistSources): Pick<
  ReturnChecklistItem,
  "status" | "detail" | "badgeLabel"
> {
  if (sources.liabilitiesLoading) {
    return {
      status: "loading",
      detail: "Verifying liabilities…",
      badgeLabel: "Loading",
    };
  }
  if (sources.liabilitiesUnavailable) {
    return {
      status: "data_unavailable",
      detail: "Could not verify liabilities",
      badgeLabel: "Data Unavailable",
    };
  }
  if (!sources.liabilitiesConfigured) {
    return {
      status: "target_not_set",
      detail: "Confirm liabilities in Portfolio",
      badgeLabel: "Target Not Set",
    };
  }
  const liabilities = Math.max(0, sources.liabilitiesNpr);
  if (liabilities <= 0) {
    return { status: "completed", detail: "No liabilities" };
  }
  return {
    status: "in_progress",
    detail: `NPR ${formatNpr(liabilities)} liabilities`,
  };
}

/** Context-aware CTA for checklist cards — must match real workspace destinations. */
export function checklistActionLabel(id: string, status: ChecklistStatus): string {
  switch (id) {
    case "emergency":
      return status === "missing" || status === "target_not_set"
        ? "Set Up Emergency Fund"
        : status === "data_unavailable"
          ? "Retry Emergency Fund"
          : "Update Emergency Fund";
    case "ssf":
      return status === "not_applicable"
        ? "View SSF"
        : status === "missing" || status === "target_not_set"
          ? "Set Up SSF"
          : "Update SSF";
    case "investment":
      return status === "missing" ? "Add Investments" : "View Portfolio";
    case "passive":
      return status === "missing" || status === "target_not_set"
        ? "Add Passive Income"
        : status === "data_unavailable"
          ? "Retry Passive Income"
          : "Manage Passive Income";
    case "health":
      return status === "completed" || status === "in_progress" || status === "on_track"
        ? "View Health Insurance"
        : "Add Health Insurance";
    case "life":
      return status === "missing" || status === "target_not_set"
        ? "Add Life Insurance"
        : "View Life Insurance";
    case "house":
      return status === "not_applicable" || status === "completed"
        ? "View Housing Plan"
        : "Update Housing Plan";
    case "family":
      return status === "completed" ? "View Household" : "Set Up Household";
    case "business":
      return status === "not_applicable"
        ? "View Business Capital"
        : status === "target_not_set" || status === "missing"
          ? "Set Business Capital"
          : "Update Business Capital";
    case "debt":
      return "Manage Liabilities";
    default:
      return "Open workspace";
  }
}

/**
 * Pure Return Checklist compute — all I/O must be resolved into `sources` first.
 */
export function computeReturnChecklist(sources: ReturnChecklistSources): ReturnChecklistItem[] {
  const emergencyTarget =
    sources.canonicalEmergencyFund?.requiredProtectionMonths &&
    sources.canonicalEmergencyFund.requiredProtectionMonths > 0
      ? sources.canonicalEmergencyFund.requiredProtectionMonths
      : sources.emergencyMonthsTarget > 0
        ? sources.emergencyMonthsTarget
        : RETURN_CHECKLIST_FALLBACK_EMERGENCY_MONTHS;

  const emergencyFields = buildEmergencyChecklistFields(sources);
  const ssfFields = buildSsfChecklistFields(sources);
  const investmentFields = buildInvestmentChecklistFields(sources);
  const passiveFields = buildPassiveChecklistFields(sources);
  const healthFields = buildInsuranceTypeFields(sources, "health");
  const lifeFields = buildInsuranceTypeFields(sources, "life");
  const house = houseChecklistFields(sources);
  const familyFields = buildFamilyChecklistFields(sources);
  const businessFields = buildBusinessChecklistFields(sources);
  const debtFields = buildDebtChecklistFields(sources);

  const items: Omit<ReturnChecklistItem, "href" | "actionLabel">[] = [
    {
      id: "emergency",
      label: `Emergency Fund (${emergencyTarget} Months)`,
      status: emergencyFields.status,
      detail: emergencyFields.detail,
      badgeLabel: emergencyFields.badgeLabel,
    },
    {
      id: "ssf",
      label: "Nepal SSF Retirement",
      status: ssfFields.status,
      detail: ssfFields.detail,
      badgeLabel: ssfFields.badgeLabel,
    },
    {
      id: "investment",
      label: "Investment Portfolio",
      status: investmentFields.status,
      detail: investmentFields.detail,
      badgeLabel: investmentFields.badgeLabel,
    },
    {
      id: "passive",
      label: "Passive Income Goal",
      status: passiveFields.status,
      detail: passiveFields.detail,
      badgeLabel: passiveFields.badgeLabel,
      coveragePct: passiveFields.coveragePct,
      breakdownLines: passiveFields.breakdownLines,
    },
    {
      id: "health",
      label: "Health Insurance",
      status: healthFields.status,
      detail: healthFields.detail,
      badgeLabel: healthFields.badgeLabel,
    },
    {
      id: "life",
      label: "Life Insurance",
      status: lifeFields.status,
      detail: lifeFields.detail,
      badgeLabel: lifeFields.badgeLabel,
    },
    {
      id: "house",
      label: "House in Nepal",
      status: house.status,
      detail: house.detail,
      badgeLabel: house.badgeLabel,
    },
    {
      id: "family",
      label: "Family & Education",
      status: familyFields.status,
      detail: familyFields.detail,
      badgeLabel: familyFields.badgeLabel,
    },
    {
      id: "business",
      label: "Business Capital",
      status: businessFields.status,
      detail: businessFields.detail,
      badgeLabel: businessFields.badgeLabel,
    },
    {
      id: "debt",
      label: "Debt Free Status",
      status: debtFields.status,
      detail: debtFields.detail,
      badgeLabel: debtFields.badgeLabel,
    },
  ];

  return items.map((item) => ({
    ...item,
    href: returnChecklistHref(item.id),
    actionLabel: checklistActionLabel(item.id, item.status),
  }));
}
