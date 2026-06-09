/**
 * NPR display helpers for the savings workspace (Indian numbering: thousand / lakh / crore).
 * `formatKrwInteger` remains for other tools (e.g. Korea planner) that still surface won amounts.
 */

export function formatKrwInteger(n: number): string {
  const rounded = Math.round(n);
  return `₩${new Intl.NumberFormat("en-KR", { maximumFractionDigits: 0 }).format(rounded)}`;
}

/** Full NPR with ₹ and en-IN grouping (e.g. ₹10,00,000). */
export function formatNprInteger(n: number): string {
  const rounded = Math.round(n);
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rounded)}`;
}

/** Compact axis / tick labels in lakh (L) and crore (Cr). */
export function formatNprAxisShort(n: number): string {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  const sign = x < 0 ? "-" : "";
  const abs = Math.abs(x);
  if (abs >= 1e7) return `${sign}${(abs / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `${sign}${(abs / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `${sign}${Math.round(abs / 1e3)}k`;
  return `${sign}${Math.round(abs)}`;
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
