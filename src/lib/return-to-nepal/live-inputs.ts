import type { CashflowDashboardState } from "@/components/cashflow/types";
import { sumIncome } from "@/components/cashflow/cashflow-metrics";
import type { WealthTotals } from "@/components/portfolio/calculations";
import { passiveIncomeMonthlyNpr } from "@/components/portfolio/calculations";
import type { SimpleMoneyLine, WealthPortfolioStateV2 } from "@/components/portfolio/types";
import { computeCashflowLiveMetrics } from "@/lib/cashflow/cashflow-live-metrics";
import type { ColPlanState } from "@/lib/nepal-col-dashboard";
import { computeColSnapshot } from "@/lib/nepal-col-dashboard";
import { nprToKrw } from "@/lib/exchange-rate";
import type { ProductOnboardingState } from "@/lib/product-onboarding-storage";
import { computeDashboardSummary } from "@/lib/savings/savings-utils";
import type { SavingsGoal } from "@/lib/savings/savings-types";
import { computePensionProjection } from "@/lib/ssf-pension/projection";
import type { SsfPensionWorkspaceState } from "@/lib/ssf-pension/storage";
import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";
import type { LifestyleMode, NepalCityId, ReturnToNepalPlannerState } from "@/lib/return-to-nepal/types";

export type ReturnPlannerLiveBundle = {
  effectiveState: ReturnToNepalPlannerState;
  netWorthNpr: number;
  fireProgressPct: number | null;
  savingsRatePct: number | null;
  monthlyIncomeNpr: number;
  monthlyExpenseNpr: number;
  investableNpr: number;
  passiveMonthlyNpr: number;
  nepalColMonthlyNpr: number;
  dataSources: string[];
};

const COL_LIFESTYLE_TO_RETURN: Record<ColPlanState["lifestyle"], LifestyleMode> = {
  budget: "basic",
  standard: "comfortable",
  comfortable: "premium",
  luxury: "luxury",
};

const RETURN_CITY_IDS = new Set<NepalCityId>(["kathmandu", "pokhara", "chitwan", "dharan", "butwal", "village"]);

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function sumLinesByCurrency(lines: SimpleMoneyLine[], currency: "NPR" | "KRW" | "USD"): number {
  return lines.reduce((acc, line) => {
    if (line.currency !== currency) return acc;
    const amount = typeof line.amount === "number" && Number.isFinite(line.amount) ? line.amount : 0;
    return acc + Math.max(0, amount);
  }, 0);
}

function findGoal(goals: SavingsGoal[], patterns: RegExp[]): SavingsGoal | undefined {
  return goals.find((goal) => patterns.some((pattern) => pattern.test(goal.name) || pattern.test(goal.category)));
}

function mapCity(colCityId: string): NepalCityId {
  if (RETURN_CITY_IDS.has(colCityId as NepalCityId)) return colCityId as NepalCityId;
  if (colCityId.includes("pokhara")) return "pokhara";
  if (colCityId.includes("chitwan")) return "chitwan";
  return "kathmandu";
}

function mapLifestyle(col: ColPlanState): LifestyleMode {
  return COL_LIFESTYLE_TO_RETURN[col.lifestyle] ?? "comfortable";
}

/**
 * Merge live FIRE Nepal module data into planner state — no duplicate manual entry.
 * Stored preferences (target year, settlement checklist) are preserved when set.
 */
export function buildEffectiveReturnPlannerState(
  stored: ReturnToNepalPlannerState,
  opts: {
    portfolio: WealthPortfolioStateV2;
    wealth: WealthTotals;
    cashflow: CashflowDashboardState;
    colPlan: ColPlanState;
    savingsGoals: SavingsGoal[];
    ssf: SsfPensionWorkspaceState;
    summary: UnifiedFireSummary;
    onboarding: ProductOnboardingState;
    krwPerNpr: number;
  },
): ReturnPlannerLiveBundle {
  const { portfolio, wealth, cashflow, colPlan, savingsGoals, ssf, summary, onboarding, krwPerNpr } = opts;
  const nprPerKrw = krwPerNpr > 0 ? 1 / krwPerNpr : stored.nprPerKrw;
  const live = computeCashflowLiveMetrics(cashflow);
  const colSnap = computeColSnapshot(colPlan);
  const savingsSummary = computeDashboardSummary(savingsGoals, []);

  const koreaLiquidKrw = sumLinesByCurrency(portfolio.liquidCash, "KRW");
  const retirementKrw = (portfolio.globalRetirementAssets ?? []).reduce((acc, row) => {
    if (row.currency !== "KRW") return acc;
    const bal = typeof row.currentBalance === "number" ? row.currentBalance : 0;
    return acc + Math.max(0, bal);
  }, 0);

  const nepalLiquidNpr =
    sumLinesByCurrency(portfolio.liquidCash, "NPR") + wealth.fixedDepositsPrincipalNpr * 0.35;

  const monthlyIncomeNpr =
    live.monthlyIncome > 0 ? live.monthlyIncome : Math.max(0, onboarding.salaryMonthlyNpr);
  const monthlyExpenseNpr = live.monthlyExpense > 0 ? live.monthlyExpense : summary.monthlyExpenses;
  const monthlySalaryKrw =
    monthlyIncomeNpr > 0 ? Math.round(nprToKrw(monthlyIncomeNpr, krwPerNpr)) : stored.monthlySalaryKrw;
  const monthlySavingsKrw =
    savingsSummary.monthlySavingNpr > 0
      ? Math.round(nprToKrw(savingsSummary.monthlySavingNpr, krwPerNpr))
      : monthlyIncomeNpr > monthlyExpenseNpr
        ? Math.round(nprToKrw(monthlyIncomeNpr - monthlyExpenseNpr, krwPerNpr))
        : stored.monthlySavingsKrw;

  const dividendMonthlyNpr = Math.max(0, cashflow.income.dividendIncome ?? 0);
  const rentalMonthlyNpr = Math.max(0, cashflow.income.rentalIncome ?? 0);
  const fdMonthlyNpr = wealth.fixedDepositsEstimatedMonthlyIncomeNpr;
  const passiveMonthlyNpr = passiveIncomeMonthlyNpr(wealth.investableNpr, {
    monthlyCashDividendNpr: dividendMonthlyNpr,
    monthlyFixedDepositInterestNpr: fdMonthlyNpr,
  });

  const ssfProjection = computePensionProjection({
    currentAge: ssf.projection.currentAge,
    monthlySalaryNpr: ssf.projection.monthlySalaryNpr || monthlyIncomeNpr,
    monthlySsfContributionNpr: ssf.projection.monthlySsfContributionNpr,
    retirementAge: ssf.projection.retirementAge,
    annualSalaryGrowthPct: ssf.projection.annualSalaryGrowthPct,
  });

  const emergencyGoal = findGoal(savingsGoals, [/emergency/i]);
  const houseGoal = findGoal(savingsGoals, [/house|land|property|nepal return/i]);
  const educationGoal = findGoal(savingsGoals, [/education|child|school/i]);
  const businessGoal = findGoal(savingsGoals, [/business|investment|startup/i]);
  const returnGoal = findGoal(savingsGoals, [/nepal return|return fund/i]);

  const houseTargetNpr = houseGoal?.targetAmountNpr ?? 0;
  const houseSavedNpr = houseGoal?.savedAmountNpr ?? 0;
  const houseProgressPct =
    houseTargetNpr > 0 ? clamp((houseSavedNpr / houseTargetNpr) * 100, 0, 100) : stored.houseProgressPct;

  const realEstateNepalNpr = wealth.realEstateNpr;
  const landBudgetNpr = houseTargetNpr > 0 ? Math.round(houseTargetNpr * 0.35) : Math.round(realEstateNepalNpr * 0.4);
  const constructionBudgetNpr = houseTargetNpr > 0 ? Math.round(houseTargetNpr * 0.45) : Math.round(realEstateNepalNpr * 0.45);
  const interiorBudgetNpr = houseTargetNpr > 0 ? Math.round(houseTargetNpr * 0.12) : Math.round(realEstateNepalNpr * 0.1);
  const furnitureBudgetNpr = houseTargetNpr > 0 ? Math.round(houseTargetNpr * 0.08) : Math.round(realEstateNepalNpr * 0.05);

  const liabilitiesNpr = wealth.liabilitiesNpr;
  const homeLoanPrincipalNpr = liabilitiesNpr > 0 ? liabilitiesNpr : stored.homeLoanPrincipalNpr;

  const emergencyMonthsTarget =
    stored.emergencyMonthsTarget > 0
      ? stored.emergencyMonthsTarget
      : onboarding.generated?.runwayMonthsSuggested
        ? clamp(onboarding.generated.runwayMonthsSuggested, 6, 18)
        : 12;

  const targetReturnYear =
    stored.targetReturnYear > new Date().getFullYear()
      ? stored.targetReturnYear
      : returnGoal?.targetDate
        ? new Date(returnGoal.targetDate).getFullYear()
        : savingsSummary.nearestTargetDate
          ? new Date(savingsSummary.nearestTargetDate).getFullYear()
          : stored.targetReturnYear;

  const dataSources: string[] = [];
  if (live.monthlyIncome > 0 || onboarding.salaryMonthlyNpr > 0) dataSources.push("Income");
  if (monthlyExpenseNpr > 0) dataSources.push("Expenses");
  if (savingsGoals.length > 0) dataSources.push("Savings Goals");
  if (wealth.netWorthNpr > 0) dataSources.push("Portfolio");
  if (colSnap.total > 0) dataSources.push("Nepal Cost of Living");
  if (ssf.projection.monthlySsfContributionNpr > 0) dataSources.push("SSF Pension");
  if (summary.emergencyFundCoverageMonths !== null) dataSources.push("Emergency Fund");

  const effectiveState: ReturnToNepalPlannerState = {
    ...stored,
    koreaSavingsKrw: koreaLiquidKrw + retirementKrw,
    nepalLiquidNpr: Math.round(nepalLiquidNpr),
    monthlySalaryKrw,
    monthlySavingsKrw,
    nprPerKrw,
    nepalInflationPct: stored.nepalInflationPct > 0 ? stored.nepalInflationPct : colPlan.family.parents > 0 ? 6.5 : 6,
    targetReturnYear,
    adults: Math.max(1, colPlan.family.adults || stored.adults),
    children: Math.max(0, colPlan.family.children || stored.children),
    city: mapCity(colPlan.cityId),
    lifestyle: mapLifestyle(colPlan),
    landBudgetNpr,
    constructionBudgetNpr,
    interiorBudgetNpr,
    furnitureBudgetNpr,
    homeLoanPrincipalNpr,
    houseProgressPct,
    pensionMonthlyNpr: Math.max(ssfProjection.estimatedMonthlyPensionNpr, ssf.projection.monthlySsfContributionNpr),
    dividendMonthlyNpr,
    fdMonthlyNpr,
    rentalMonthlyNpr,
    swpMonthlyNpr: stored.swpMonthlyNpr,
    schoolFeesMonthlyNpr: colPlan.expenses.education > 0 ? colPlan.expenses.education : educationGoal?.monthlyContributionNpr ?? stored.schoolFeesMonthlyNpr,
    parentSupportMonthlyNpr:
      colPlan.family.parents > 0 ? Math.round(colSnap.total * 0.08 * colPlan.family.parents) : stored.parentSupportMonthlyNpr,
    healthcareMonthlyNpr: colPlan.expenses.healthcare > 0 ? colPlan.expenses.healthcare : stored.healthcareMonthlyNpr,
    emergencyMonthsTarget,
    businessCapitalNpr: businessGoal?.savedAmountNpr ?? businessGoal?.targetAmountNpr ?? stored.businessCapitalNpr,
    relocationOneTimeNpr: returnGoal?.targetAmountNpr
      ? Math.round(returnGoal.targetAmountNpr * 0.15)
      : stored.relocationOneTimeNpr,
    salaryGrowthPct: stored.salaryGrowthPct > 0 ? stored.salaryGrowthPct : ssf.projection.annualSalaryGrowthPct || 4,
    plannedKoreaYearsRemaining: stored.plannedKoreaYearsRemaining > 0 ? stored.plannedKoreaYearsRemaining : clamp(targetReturnYear - new Date().getFullYear(), 1, 20),
  };

  return {
    effectiveState,
    netWorthNpr: wealth.netWorthNpr,
    fireProgressPct: summary.fireProgressPct,
    savingsRatePct: summary.savingsRatePct ?? live.savingsRatePct,
    monthlyIncomeNpr,
    monthlyExpenseNpr,
    investableNpr: wealth.investableNpr,
    passiveMonthlyNpr,
    nepalColMonthlyNpr: colSnap.total > 0 ? colSnap.total : 0,
    dataSources,
  };
}

/** Monthly income from cashflow for KPI deltas (used client-side). */
export function readCashflowIncomeNpr(cashflow: CashflowDashboardState): number {
  return sumIncome(cashflow);
}
