export type PensionProjectionInput = {
  currentAge: number;
  monthlySalaryNpr: number;
  monthlySsfContributionNpr: number;
  retirementAge: number;
  annualSalaryGrowthPct: number;
};

export type PensionProjectionResult = {
  yearsToRetirement: number;
  retirementYear: number;
  estimatedMonthlyPensionNpr: number;
  lumpSumEstimateNpr: number;
  futureCorpusNpr: number;
  inflationAdjustedCorpusNpr: number;
  narrativeExample: string;
};

const INFLATION_ASSUMPTION = 0.055;

/**
 * Illustrative annuity-style desk model (not official SSF actuary math).
 * Uses contribution runway × growth to approximate corpus, then 4% style payout + bonus lump heuristic.
 */
export function computePensionProjection(input: PensionProjectionInput): PensionProjectionResult {
  const yearsToRetirement = Math.max(0, input.retirementAge - input.currentAge);
  const retirementYear = new Date().getFullYear() + yearsToRetirement;
  let salary = input.monthlySalaryNpr;
  let corpus = 0;
  const g = input.annualSalaryGrowthPct / 100;
  const months = yearsToRetirement * 12;
  for (let i = 0; i < months; i++) {
    if (i > 0 && i % 12 === 0) {
      salary *= 1 + g;
    }
    const contrib = Math.min(input.monthlySsfContributionNpr, salary * 0.2);
    corpus += contrib * 2;
    corpus *= 1 + 0.007;
  }
  const payoutFactor = 0.042;
  const estimatedMonthlyPensionNpr = Math.round(corpus * payoutFactor);
  const lumpSumEstimateNpr = Math.round(corpus * 0.18);
  const inflationAdjustedCorpusNpr = Math.round(corpus / Math.pow(1 + INFLATION_ASSUMPTION, yearsToRetirement));
  const narrativeExample = `If you continue current contribution for ${yearsToRetirement} year${yearsToRetirement === 1 ? "" : "s"}, estimated pension ≈ NPR ${(estimatedMonthlyPensionNpr / 1000).toFixed(0)},000/month (illustrative).`;

  return {
    yearsToRetirement,
    retirementYear,
    estimatedMonthlyPensionNpr,
    lumpSumEstimateNpr,
    futureCorpusNpr: Math.round(corpus),
    inflationAdjustedCorpusNpr,
    narrativeExample,
  };
}
