import type {
  InsurancePaymentFrequency,
  InsurancePolicy,
  InsurancePolicyStatus,
  InsuranceType,
} from "@/lib/insurance/insurance-types";
import { INSURANCE_TYPE_LABELS, PAYMENT_FREQUENCY_LABELS } from "@/lib/insurance/insurance-types";

export function formatRs(amount: number): string {
  if (!Number.isFinite(amount)) return "Rs. 0";
  const rounded = Math.round(amount);
  return `Rs. ${rounded.toLocaleString("en-NP")}`;
}

export function formatNprCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "NPR 0";
  if (amount >= 10_000_000) return `NPR ${(amount / 10_000_000).toFixed(amount % 10_000_000 === 0 ? 0 : 1)} Cr`;
  if (amount >= 100_000) return `NPR ${(amount / 100_000).toFixed(amount % 100_000 === 0 ? 0 : 1)} Lakh`;
  return `NPR ${Math.round(amount).toLocaleString("en-NP")}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysUntil(isoDate: string, now = new Date()): number {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const target = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function derivePolicyStatus(expiryDate: string, now = new Date()): InsurancePolicyStatus {
  const days = daysUntil(expiryDate, now);
  if (!Number.isFinite(days)) return "active";
  if (days < 0) return "expired";
  if (days <= 45) return "expiring";
  return "active";
}

export function monthlyPremiumNpr(premiumNpr: number, frequency: InsurancePaymentFrequency): number {
  const amount = Math.max(0, premiumNpr);
  switch (frequency) {
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "one_time":
      return amount / 12;
    default:
      return amount;
  }
}

export function sumCoverageByType(policies: InsurancePolicy[], type: InsuranceType): number {
  return policies
    .filter((p) => p.type === type && p.status !== "expired" && p.status !== "lapsed")
    .reduce((sum, p) => sum + Math.max(0, p.coverageAmountNpr), 0);
}

export function sumMonthlyPremiums(policies: InsurancePolicy[]): number {
  return policies
    .filter((p) => p.status !== "expired" && p.status !== "lapsed")
    .reduce((sum, p) => sum + monthlyPremiumNpr(p.premiumNpr, p.paymentFrequency), 0);
}

export function upcomingRenewals(policies: InsurancePolicy[], withinDays = 90, now = new Date()) {
  return policies
    .map((policy) => {
      const daysRemaining = daysUntil(policy.expiryDate, now);
      return { policy, daysRemaining };
    })
    .filter(({ daysRemaining }) => Number.isFinite(daysRemaining) && daysRemaining <= withinDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

export function typeLabel(type: InsuranceType) {
  return INSURANCE_TYPE_LABELS[type];
}

export function frequencyLabel(frequency: InsurancePaymentFrequency) {
  return PAYMENT_FREQUENCY_LABELS[frequency];
}

export function defaultExpiryDate(monthsAhead = 12): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function statusTone(status: InsurancePolicyStatus): "green" | "orange" | "red" | "slate" {
  if (status === "active") return "green";
  if (status === "expiring") return "orange";
  if (status === "expired" || status === "lapsed") return "red";
  return "slate";
}
