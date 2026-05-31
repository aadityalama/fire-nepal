import type { NepalRetireVerdict } from "@/lib/ssf-pension/types";

export type NepalRetireInput = {
  monthlyFamilySpendNpr: number;
  assumedInflationPct: number;
  otherMonthlyIncomeNpr: number;
  ssfMonthlyPensionNpr: number;
  savingsMonthlyNpr: number;
  investmentsIncomeMonthlyNpr: number;
  fireReadinessPct: number;
};

export type NepalRetireResult = {
  verdict: NepalRetireVerdict;
  headline: string;
  monthlyGapNpr: number;
  coverageRatio: number;
};

/**
 * Simple coverage model: (public pension tier + passive + other) vs inflated Nepal spend.
 */
export function analyzeRetireInNepal(input: NepalRetireInput): NepalRetireResult {
  const infl = 1 + input.assumedInflationPct / 100;
  const inflatedSpend = input.monthlyFamilySpendNpr * infl;
  const income =
    input.ssfMonthlyPensionNpr + input.otherMonthlyIncomeNpr + input.savingsMonthlyNpr + input.investmentsIncomeMonthlyNpr;
  const coverageRatio = inflatedSpend > 0 ? income / inflatedSpend : income > 0 ? 2 : 0;
  const monthlyGapNpr = Math.round(inflatedSpend - income);

  let verdict: NepalRetireVerdict = "SAFE";
  let headline =
    "Cash-flow cover looks adequate versus modeled Nepal spend — keep contributions current and maintain liquidity.";

  if (coverageRatio < 0.78 || input.fireReadinessPct < 42) {
    verdict = "HIGH RISK";
    headline =
      "Spend coverage is tight versus pension + portfolio income — extend runway or reduce Nepal burn before retiring.";
  } else if (coverageRatio < 0.92 || input.fireReadinessPct < 58) {
    verdict = "MODERATE RISK";
    headline =
      "Close to balance — small shocks (FX, school fees, medical) could stress cash flow; add buffer or defer drawdown.";
  }

  return { verdict, headline, monthlyGapNpr, coverageRatio };
}
