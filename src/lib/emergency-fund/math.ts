/**
 * Shared numeric helpers for Emergency Fund 3.0.
 * Avoid intermediate rounding; clamp invalid financial values.
 */

export function finiteNonNeg(n: number | null | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export function finiteOrNull(n: number | null | undefined): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

export function approxEqual(a: number, b: number, tolerance = 1): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

export function clampPct(n: number, max = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

export function visualProgressPct(rawPct: number): number {
  return clampPct(rawPct, 100);
}

export function ceilPositive(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.ceil(n);
}

export function roundMoney(n: number, decimals = 2): number {
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}

/** Approximate calendar days from fractional months (30-day months). */
export function approximateProtectionDays(runwayMonths: number | null): number | null {
  if (runwayMonths == null || !Number.isFinite(runwayMonths)) return null;
  return Math.max(0, Math.round(runwayMonths * 30));
}

export function formatEmergencyNpr(value: number, maximumFractionDigits = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits > 0 ? Math.min(2, maximumFractionDigits) : 0,
  }).format(maximumFractionDigits === 0 ? Math.round(safe) : safe);
}

/**
 * Display money with enough precision to reconcile non-integer monthly bases
 * (e.g. yearly amount / 12) without inventing rounded internal values.
 */
export function formatEmergencyNprPrecise(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const isWhole = Math.abs(safe - Math.round(safe)) < 1e-9;
  return formatEmergencyNpr(safe, isWhole ? 0 : 2);
}

export function formatMonthsLabel(value: number, singular = "month", plural = "months"): string {
  const rounded = Math.round(value * 100) / 100;
  const abs = Math.abs(rounded);
  const label = abs === 1 ? singular : plural;
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
  return `${display} ${label}`;
}

export function addMonthsToDate(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

export function formatMonthYear(date: Date, locale = "en-US"): string {
  return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
}
