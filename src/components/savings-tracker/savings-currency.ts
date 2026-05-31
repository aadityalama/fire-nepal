import { NPR_PER_KRW } from "@/components/savings-tracker/savings-tracker-data";

export function krwToNpr(krw: number): number {
  return krw * NPR_PER_KRW;
}

export function formatKrwInteger(n: number): string {
  const rounded = Math.round(n);
  return `₩${new Intl.NumberFormat("en-KR", { maximumFractionDigits: 0 }).format(rounded)}`;
}

export function formatNprInteger(n: number): string {
  const rounded = Math.round(n);
  return `रु ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rounded)}`;
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
