/**
 * CAGR-style growth using earliest stored net-worth point vs a live terminal value.
 * Returns annualized % or null when history is too short / degenerate.
 */
export function estimateLiveCagrPct(
  history: { month: string; netWorthNpr: number }[],
  liveNetWorthNpr: number,
): number | null {
  if (history.length < 2) return null;
  const first = history[0]!;
  const start = Math.max(first.netWorthNpr, 1);
  const end = Math.max(liveNetWorthNpr, 0.01);
  const t0 = new Date(`${first.month}-01T00:00:00Z`).getTime();
  const years = (Date.now() - t0) / (1000 * 60 * 60 * 24 * 365.25);
  if (!Number.isFinite(years) || years < 0.5) return null;
  if (end / start <= 0) return null;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
}
