import type { CurrencyCode } from "@/lib/fire-lending/types";

export function formatLendingMoney(amount: number, currency: CurrencyCode = "NPR"): string {
  const rounded = Math.round(amount);
  try {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(rounded);
  } catch {
    const prefix = currency === "KRW" ? "₩" : currency === "USD" ? "$" : "Rs ";
    return `${prefix}${rounded.toLocaleString("en-NP")}`;
  }
}

export function formatPct(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatCompactDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-NP", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addMonthsIso(iso: string, months: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function uid(prefix = "fl"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function agreementNumber(): string {
  const y = new Date().getFullYear();
  const n = Math.floor(100000 + Math.random() * 900000);
  return `FN-LN-${y}-${n}`;
}
