import type { CashflowDashboardState } from "@/components/cashflow/types";
import {
  coverageMonths,
  investableCashflow,
  monthlyBurn,
  savingsRatePct,
  sumIncome,
} from "@/components/cashflow/cashflow-metrics";
import { computePayslipTrendAnalytics } from "@/components/payslip-import/payslip-analytics";
import { loadPayslipHistoryState } from "@/components/payslip-import/payslip-history-storage";
import type { WealthTotals } from "@/components/portfolio/calculations";
import type { GlobalRetirementAssetRow, NetWorthHistoryPoint } from "@/components/portfolio/types";
import {
  buildFireSimulation,
  defaultMonthlySpendFromPortfolio,
  inferDefaultAgeFromPortfolio,
  marketCrashSimulation,
  scenarioDeltaYearsToFi,
  type WealthSimulationParams,
} from "@/components/portfolio/simulation/wealth-simulation-engine";
import type { FinancialCoachSnapshot } from "@/components/financial-coach/types";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function avgRecentNwDeltas(history: readonly NetWorthHistoryPoint[], maxLookback: number): number | null {
  if (history.length < 3) return null;
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i]!.netWorthNpr - sorted[i - 1]!.netWorthNpr;
    if (Number.isFinite(d)) deltas.push(d);
  }
  if (deltas.length < 2) return null;
  const tail = deltas.slice(-maxLookback);
  const sum = tail.reduce((a, b) => a + b, 0);
  return sum / tail.length;
}

function lastNwDelta(history: readonly NetWorthHistoryPoint[]): number | null {
  if (history.length < 2) return null;
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const a = sorted[sorted.length - 1]!.netWorthNpr;
  const b = sorted[sorted.length - 2]!.netWorthNpr;
  return a - b;
}

export type BuildFinancialCoachSnapshotArgs = {
  hydrated: boolean;
  totals: WealthTotals;
  cashflow: CashflowDashboardState;
  passiveMonthlyNpr: number;
  monthDeltaNpr: number | null;
  netWorthHistory: readonly NetWorthHistoryPoint[];
  fireScore: number;
  krwPerNpr: number;
  globalRetirementAssets: readonly GlobalRetirementAssetRow[];
  payslipGrossMoM_pct: number | null;
};

/** Shared desk FIRE parameters (portfolio + passive) for coach + AI coach pages. */
export function buildDeskWealthSimulationParams(
  args: Pick<BuildFinancialCoachSnapshotArgs, "totals" | "passiveMonthlyNpr" | "globalRetirementAssets">,
): WealthSimulationParams {
  const { totals, passiveMonthlyNpr, globalRetirementAssets } = args;
  const monthlySpendNpr = defaultMonthlySpendFromPortfolio(totals, passiveMonthlyNpr);
  const rawContribution = Math.round(totals.investableNpr * 0.004 + passiveMonthlyNpr * 0.25);
  const monthlyContributionNpr =
    rawContribution > 0 ? Math.max(25_000, Math.min(400_000, rawContribution)) : 0;
  return {
    currentAge: inferDefaultAgeFromPortfolio([...globalRetirementAssets]),
    monthlySpendNpr: Math.max(0, monthlySpendNpr),
    swrAnnual: 0.04,
    startingNetWorthNpr: Math.max(0, totals.netWorthNpr),
    monthlyContributionNpr: Math.max(0, monthlyContributionNpr),
    nominalReturnAnnual: 0.072,
    inflationAnnual: 0.055,
    salaryGrowthAnnual: 0.03,
    passiveMonthlyStartNpr: Math.max(0, passiveMonthlyNpr),
    passiveGrowthAnnual: 0.02,
  };
}

/**
 * Assembles a single coach snapshot from portfolio + cashflow + desk FIRE model (deterministic).
 */
export function buildFinancialCoachSnapshot(args: BuildFinancialCoachSnapshotArgs): FinancialCoachSnapshot {
  const {
    hydrated,
    totals,
    cashflow,
    passiveMonthlyNpr,
    monthDeltaNpr,
    netWorthHistory,
    fireScore,
    krwPerNpr,
    payslipGrossMoM_pct,
    globalRetirementAssets,
  } = args;

  const totalIncomeNpr = sumIncome(cashflow);
  const monthlyBurnNpr = monthlyBurn(cashflow);
  const sr = savingsRatePct(cashflow);
  const icf = investableCashflow(cashflow);
  const cov = coverageMonths(cashflow);
  const emergencyReserveNpr = cashflow.emergencyCashReserve ?? null;

  const debtRatio = totals.totalAssetsNpr > 0 ? totals.liabilitiesNpr / totals.totalAssetsNpr : 0;
  const investableShare = totals.totalAssetsNpr > 0 ? totals.investableNpr / totals.totalAssetsNpr : 0;

  const baseParams = buildDeskWealthSimulationParams({ totals, passiveMonthlyNpr, globalRetirementAssets });
  const monthlySpendNpr = baseParams.monthlySpendNpr;
  const monthlyContributionNpr = baseParams.monthlyContributionNpr;

  const sim = buildFireSimulation(baseParams, {
    maxYears: 45,
    fireReadinessScore: fireScore,
    debtRatio,
  });

  const investDelta = scenarioDeltaYearsToFi(baseParams, "invest_krw_800k", krwPerNpr, {
    fireReadinessScore: fireScore,
    debtRatio,
  });
  const yearsSavedByInvestKrw800k =
    investDelta.deltaYears != null && investDelta.deltaYears < 0 ? -investDelta.deltaYears : null;

  const crash = marketCrashSimulation({
    netWorthNpr: totals.netWorthNpr,
    monthlySpendNpr: Math.max(1, monthlySpendNpr),
    investableShare: clamp(investableShare, 0, 1),
    liquidMonthlyNpr: totals.liquidNpr + passiveMonthlyNpr * 2,
    monthlyContributionNpr,
    nominalReturnAnnual: 0.072,
    inflationAnnual: 0.055,
    crashDrawdownPct: 0.35,
  });

  const lastD = lastNwDelta(netWorthHistory);
  const avgD = avgRecentNwDeltas(netWorthHistory, 12);

  return {
    hydrated,
    netWorthNpr: totals.netWorthNpr,
    monthDeltaNpr,
    netWorthHistoryLen: netWorthHistory.length,
    fireScore,
    passiveMonthlyNpr,
    investableNpr: totals.investableNpr,
    liquidNpr: totals.liquidNpr,
    liabilitiesNpr: totals.liabilitiesNpr,
    totalAssetsNpr: totals.totalAssetsNpr,
    savingsRatePct: sr,
    totalIncomeNpr,
    monthlyBurnNpr,
    investableCashflowNpr: icf,
    coverageMonths: cov,
    emergencyReserveNpr,
    foodExpenseNpr: cashflow.expenses.food ?? 0,
    rentExpenseNpr: cashflow.expenses.rent ?? 0,
    entertainmentExpenseNpr: cashflow.expenses.entertainment ?? 0,
    insuranceExpenseNpr: cashflow.expenses.insurance ?? 0,
    salaryNpr: cashflow.income.salary ?? 0,
    overtimeNpr: cashflow.income.overtime ?? 0,
    dividendNpr: cashflow.income.dividendIncome ?? 0,
    krwPerNpr,
    payslipGrossMoM_pct,
    fireYearsToFi: sim.yearsToFi,
    fireAge: sim.fireAge,
    monthsToFi: sim.monthsToFi,
    yearsSavedByInvestKrw800k,
    portfolioResilienceScore: crash.resilienceScore,
    avgNwDeltaNpr: avgD,
    lastNwDeltaNpr: lastD,
  };
}

/**
 * Cashflow-page snapshot when portfolio totals are unavailable — desk FIRE fields are muted.
 */
export function buildCashflowOnlyFinancialCoachSnapshot(cashflow: CashflowDashboardState): FinancialCoachSnapshot {
  const payslip = computePayslipTrendAnalytics(loadPayslipHistoryState().entries);
  const totalIncomeNpr = sumIncome(cashflow);
  const monthlyBurnNpr = monthlyBurn(cashflow);
  const sr = savingsRatePct(cashflow);
  return {
    hydrated: true,
    netWorthNpr: 0,
    monthDeltaNpr: null,
    netWorthHistoryLen: 0,
    fireScore: 0,
    passiveMonthlyNpr: 0,
    investableNpr: 0,
    liquidNpr: 0,
    liabilitiesNpr: 0,
    totalAssetsNpr: 0,
    savingsRatePct: sr,
    totalIncomeNpr,
    monthlyBurnNpr,
    investableCashflowNpr: investableCashflow(cashflow),
    coverageMonths: coverageMonths(cashflow),
    emergencyReserveNpr: cashflow.emergencyCashReserve ?? null,
    foodExpenseNpr: cashflow.expenses.food ?? 0,
    rentExpenseNpr: cashflow.expenses.rent ?? 0,
    entertainmentExpenseNpr: cashflow.expenses.entertainment ?? 0,
    insuranceExpenseNpr: cashflow.expenses.insurance ?? 0,
    salaryNpr: cashflow.income.salary ?? 0,
    overtimeNpr: cashflow.income.overtime ?? 0,
    dividendNpr: cashflow.income.dividendIncome ?? 0,
    krwPerNpr: FALLBACK_KRW_PER_NPR,
    payslipGrossMoM_pct: payslip.grossSalaryMoM_pct,
    fireYearsToFi: null,
    fireAge: null,
    monthsToFi: null,
    yearsSavedByInvestKrw800k: null,
    portfolioResilienceScore: 62,
    avgNwDeltaNpr: null,
    lastNwDeltaNpr: null,
  };
}
