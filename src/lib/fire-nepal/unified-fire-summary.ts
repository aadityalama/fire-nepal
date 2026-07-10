import type { CashflowDashboardState } from "@/components/cashflow/types";
import { computeWealthTotals, type WealthTotals } from "@/components/portfolio/calculations";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import {
  coverageMonths,
  monthlyBurn,
  savingsRatePct as cashflowSavingsRatePct,
  sumIncome,
} from "@/components/cashflow/cashflow-metrics";

/** Single snapshot of cross-module FIRE Nepal KPIs (pure derived state). */
export type UnifiedFireSummary = {
  /** NPR-normalized balance sheet + cashflow bridge. */
  wealthTotals: WealthTotals;
  totalNetWorthNpr: number;
  totalInvestableAssetsNpr: number;
  retirementWealthNpr: number;
  investmentsLiveNpr: number;
  /** Same as listed investments total — matches Investment workspace. */
  totalInvestmentNpr: number;
  liabilitiesNpr: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRatePct: number | null;
  emergencyFundCoverageMonths: number | null;
  /** Progress toward 6 months of expenses in liquid emergency reserve (0–100). */
  emergencyFundSixMoProgressPct: number | null;
  /** Progress toward classic 25× annual spend rule on net worth (0–100, clamped). */
  fireProgressPct: number | null;
  annualExpensesFromCashflowNpr: number;
  fireNumber25xAnnualSpendNpr: number;
};

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Unified FIRE Nepal summary: composes portfolio `computeWealthTotals` with cashflow
 * income / burn / emergency fields. No I/O — safe for tests and SSR imports.
 */
export function computeUnifiedFireSummary(
  portfolio: WealthPortfolioStateV2,
  cashflow: CashflowDashboardState,
  krwPerNpr: number,
  usdPerNpr: number,
): UnifiedFireSummary {
  const wealthTotals = computeWealthTotals(portfolio, krwPerNpr, usdPerNpr);
  const monthlyIncome = sumIncome(cashflow);
  const monthlyExpenses = monthlyBurn(cashflow);
  const savingsRatePct = cashflowSavingsRatePct(cashflow);
  const emergencyFundCoverageMonths = coverageMonths(cashflow);

  const annualExpensesFromCashflowNpr = monthlyExpenses * 12;
  const fireNumber25xAnnualSpendNpr = 25 * annualExpensesFromCashflowNpr;

  const fireProgressPct =
    fireNumber25xAnnualSpendNpr > 1e-6
      ? clampPct((wealthTotals.netWorthNpr / fireNumber25xAnnualSpendNpr) * 100)
      : null;

  const emergencyFundSixMoProgressPct =
    emergencyFundCoverageMonths === null ? null : clampPct((emergencyFundCoverageMonths / 6) * 100);

  return {
    wealthTotals,
    totalNetWorthNpr: wealthTotals.netWorthNpr,
    totalInvestableAssetsNpr: wealthTotals.investableNpr,
    retirementWealthNpr: wealthTotals.retirementNpr,
    investmentsLiveNpr: wealthTotals.investmentsLiveNpr,
    totalInvestmentNpr: wealthTotals.totalInvestmentNpr,
    liabilitiesNpr: wealthTotals.liabilitiesNpr,
    monthlyIncome,
    monthlyExpenses,
    savingsRatePct,
    emergencyFundCoverageMonths,
    emergencyFundSixMoProgressPct,
    fireProgressPct,
    annualExpensesFromCashflowNpr,
    fireNumber25xAnnualSpendNpr,
  };
}
