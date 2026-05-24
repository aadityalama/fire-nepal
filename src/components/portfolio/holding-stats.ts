/** ISO calendar date `YYYY-MM-DD` (local semantics for display math). */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidPurchaseIso(iso: string | undefined): iso is string {
  if (!iso || !ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function parsePurchaseIso(iso: string | undefined): Date | null {
  if (!isValidPurchaseIso(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from purchase date through `asOf` (inclusive span; same day = 0). */
export function calendarDaysInvested(purchase: Date, asOf: Date = new Date()): number {
  const start = Date.UTC(purchase.getFullYear(), purchase.getMonth(), purchase.getDate());
  const end = Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
  return Math.max(0, Math.floor((end - start) / 86400000));
}

/** Compact human duration (approximate mo/yr from day count). */
export function formatHoldingDurationApprox(days: number): string {
  if (days <= 0) return "0 d";
  const y = Math.floor(days / 365);
  let rem = days - y * 365;
  const mo = Math.floor(rem / 30);
  rem -= mo * 30;
  const parts: string[] = [];
  if (y) parts.push(`${y} yr`);
  if (mo) parts.push(`${mo} mo`);
  if (rem > 0 || parts.length === 0) parts.push(`${rem} d`);
  return parts.join(" ");
}

/**
 * Annualized geometric return over `days` calendar days (cost → value).
 * For optional analytics only; not used in core P/L paths.
 */
export function annualizedCagrFraction(cost: number, value: number, days: number): number | null {
  if (cost <= 0 || days < 1 || !Number.isFinite(value)) return null;
  const years = days / 365.25;
  if (years <= 0) return null;
  const mult = value / cost;
  if (mult <= 0 || !Number.isFinite(mult)) return null;
  return Math.pow(mult, 1 / years) - 1;
}

export function formatCagrPct(fraction: number | null, digits = 1): string {
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits })}% p.a.`;
}

export function todayIsoLocal(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
