/** Days from calendar day of `from` to ISO date string `ymd` (YYYY-MM-DD), inclusive-style. */
export function daysUntilIsoDate(ymd: string, from = new Date()): number {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
