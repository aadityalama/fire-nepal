/** Parse YYYY-MM-DD as local calendar date (no UTC shift). */
export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + months);
  // Handle month overflow (e.g. Jan 31 + 1 month)
  if (x.getDate() < day) x.setDate(0);
  return x;
}

export function addYears(d: Date, years: number): Date {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + years);
  return x;
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfLocalDay(b).getTime() - startOfLocalDay(a).getTime();
  return Math.round(ms / 86400000);
}
