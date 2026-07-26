import { formatCompactNpr } from "@/lib/market/nepse-hub";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";

/** Display helper — never invents numbers; null/NaN → "Data unavailable". */
export function formatFundamentalValue(
  value: number | null | undefined,
  opts?: { style?: "number" | "npr" | "compactNpr" | "pct" | "shares"; digits?: number },
): string {
  if (value == null || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  const digits = opts?.digits ?? 2;
  switch (opts?.style) {
    case "npr":
      return `रु ${value.toLocaleString("en-IN", { maximumFractionDigits: digits })}`;
    case "compactNpr":
      return formatCompactNpr(value) === "—" ? DATA_UNAVAILABLE : formatCompactNpr(value);
    case "pct":
      return `${value.toLocaleString("en-IN", { maximumFractionDigits: digits })}%`;
    case "shares":
      return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
    default:
      return value.toLocaleString("en-IN", { maximumFractionDigits: digits });
  }
}

export function formatFundamentalText(value: string | null | undefined): string {
  if (!value || !value.trim()) return DATA_UNAVAILABLE;
  return value.trim();
}

export function formatFundamentalDate(value: string | null | undefined): string {
  if (!value) return DATA_UNAVAILABLE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NP", { year: "numeric", month: "short", day: "numeric" });
}

/** Graham Number = √(22.5 × EPS × Book Value). Only when both inputs are positive. */
export function computeGrahamNumber(eps: number | null | undefined, bookValueNpr: number | null | undefined): number | null {
  if (eps == null || bookValueNpr == null || eps <= 0 || bookValueNpr <= 0) return null;
  return Math.sqrt(22.5 * eps * bookValueNpr);
}

/** PE = price / EPS when EPS > 0. */
export function computePe(priceNpr: number | null | undefined, eps: number | null | undefined): number | null {
  if (priceNpr == null || eps == null || priceNpr <= 0 || eps <= 0) return null;
  return priceNpr / eps;
}

/** PB = price / book value when book value > 0. */
export function computePb(priceNpr: number | null | undefined, bookValueNpr: number | null | undefined): number | null {
  if (priceNpr == null || bookValueNpr == null || priceNpr <= 0 || bookValueNpr <= 0) return null;
  return priceNpr / bookValueNpr;
}

export function sharePct(part: number | null | undefined, total: number | null | undefined): number | null {
  if (part == null || total == null || total <= 0 || part < 0) return null;
  return (part / total) * 100;
}
