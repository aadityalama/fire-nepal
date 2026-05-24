/** Future value of end-of-month contributions (same monthly amount, `n` months, monthly rate `i`). */
function fvGrowingContributions(i: number, n: number, pmt: number): number {
  if (n <= 0 || pmt <= 0) return 0;
  if (Math.abs(i) < 1e-14) return pmt * n;
  return pmt * ((Math.pow(1 + i, n) - 1) / i);
}

/**
 * Implied annual growth rate for a simple SIP ladder (equal monthly NPR flows, valued today).
 * Returns **percent points** (e.g. `8.2` = 8.2%/yr) or `null` when not identifiable.
 */
export function estimateSipIrrAnnualPct(args: {
  monthlyContributionNpr: number;
  months: number;
  currentValueNpr: number;
}): number | null {
  const { monthlyContributionNpr: pmt, months: n, currentValueNpr: fv } = args;
  if (n < 2 || pmt <= 0 || fv <= 0) return null;

  let lo = 0;
  let hi = 0.04;
  while (fvGrowingContributions(hi, n, pmt) < fv && hi < 0.6) hi += 0.005;
  if (fvGrowingContributions(hi, n, pmt) < fv) return null;

  for (let k = 0; k < 90; k++) {
    const mid = (lo + hi) / 2;
    const v = fvGrowingContributions(mid, n, pmt);
    if (Math.abs(v - fv) < Math.max(1, fv * 1e-6)) {
      const annualPct = (Math.pow(1 + mid, 12) - 1) * 100;
      return Number.isFinite(annualPct) ? annualPct : null;
    }
    if (v < fv) lo = mid;
    else hi = mid;
  }

  const mid = (lo + hi) / 2;
  const annualPct = (Math.pow(1 + mid, 12) - 1) * 100;
  return Number.isFinite(annualPct) ? annualPct : null;
}
