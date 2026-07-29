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
    case "half_yearly":
      return amount / 6;
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

/** Display label for premium based on saved payment frequency. */
export function premiumLabel(frequency: InsurancePaymentFrequency): string {
  switch (frequency) {
    case "monthly":
      return "Monthly Premium";
    case "quarterly":
      return "Quarterly Premium";
    case "half_yearly":
      return "Half-Yearly Premium";
    case "yearly":
      return "Yearly Premium";
    case "one_time":
      return "One-time Premium";
    default:
      return "Premium";
  }
}

function premiumPeriodSuffix(frequency: InsurancePaymentFrequency): string | null {
  switch (frequency) {
    case "monthly":
      return "/ month";
    case "quarterly":
      return "/ quarter";
    case "half_yearly":
      return "/ half-year";
    case "yearly":
      return "/ year";
    case "one_time":
      return null;
    default:
      return null;
  }
}

/** Format premium using the saved amount and payment frequency (not monthly-normalized). */
export function formatPremiumDisplay(premiumNpr: number, frequency: InsurancePaymentFrequency): string {
  const amount = formatRs(Math.max(0, premiumNpr));
  const suffix = premiumPeriodSuffix(frequency);
  return suffix ? `${amount} ${suffix}` : amount;
}

export type PremiumDisplay = {
  label: string;
  value: string;
};

export function buildPremiumDisplay(premiumNpr: number, frequency: InsurancePaymentFrequency): PremiumDisplay {
  return {
    label: premiumLabel(frequency),
    value: formatPremiumDisplay(premiumNpr, frequency),
  };
}

/** Summarize what the user is paying across active policies for dashboard hints. */
export function summarizePoliciesPremiumPaying(policies: InsurancePolicy[]): string {
  const active = policies.filter((p) => p.status !== "expired" && p.status !== "lapsed");
  if (active.length === 0) return "No active premiums";
  if (active.length === 1) {
    const policy = active[0];
    return formatPremiumDisplay(policy.premiumNpr, policy.paymentFrequency);
  }
  const monthlyEquivalent = sumMonthlyPremiums(active);
  return `${formatRs(monthlyEquivalent)} / month equivalent`;
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

export type PremiumUrgency = "green" | "yellow" | "orange" | "red" | "neutral";

export type PremiumDueInfo = {
  hasSchedule: boolean;
  dueDate: string | null;
  daysRemaining: number;
  overdue: boolean;
  urgency: PremiumUrgency;
  emoji: string;
  headline: string;
  detail: string;
  cycleProgressPct: number;
  lastPremiumPaidDate: string | null;
  upcomingDates: string[];
  frequency: InsurancePaymentFrequency;
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDate(iso: string): Date | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function premiumIntervalMonths(frequency: InsurancePaymentFrequency): number | null {
  switch (frequency) {
    case "monthly":
      return 1;
    case "quarterly":
      return 3;
    case "half_yearly":
      return 6;
    case "yearly":
      return 12;
    case "one_time":
      return null;
    default:
      return null;
  }
}

export function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInMonth));
  return result;
}

/** Generate premium due dates from policy start using payment frequency. */
export function generatePremiumDueDates(
  startDate: string,
  frequency: InsurancePaymentFrequency,
  options?: { untilIso?: string; maxCount?: number },
): string[] {
  const start = parseLocalDate(startDate);
  const interval = premiumIntervalMonths(frequency);
  if (!start || !interval) return [];

  const until = options?.untilIso ? parseLocalDate(options.untilIso) : null;
  const maxCount = options?.maxCount ?? 48;
  const dates: string[] = [];
  let cursor = start;

  for (let i = 0; i < maxCount; i += 1) {
    const iso = toIsoDate(cursor);
    dates.push(iso);
    if (until && cursor >= until && i > 0) break;
    cursor = addMonthsClamped(cursor, interval);
  }
  return dates;
}

export function premiumUrgencyFromDays(daysRemaining: number, hasSchedule: boolean): PremiumUrgency {
  if (!hasSchedule) return "neutral";
  if (daysRemaining < 0) return "red";
  if (daysRemaining <= 6) return "orange";
  if (daysRemaining <= 30) return "yellow";
  return "green";
}

export function buildPremiumDueInfo(policy: InsurancePolicy, now = new Date()): PremiumDueInfo {
  const frequency = policy.paymentFrequency;
  const interval = premiumIntervalMonths(frequency);
  const today = startOfLocalDay(now);

  if (!interval || !policy.startDate) {
    return {
      hasSchedule: false,
      dueDate: null,
      daysRemaining: Number.POSITIVE_INFINITY,
      overdue: false,
      urgency: "neutral",
      emoji: "📅",
      headline: "Next Premium",
      detail: frequency === "one_time" ? "One-time premium · no recurring schedule" : "Add a start date to track premiums",
      cycleProgressPct: 0,
      lastPremiumPaidDate: null,
      upcomingDates: [],
      frequency,
    };
  }

  const horizon = addMonthsClamped(today, interval * 8);
  const allDates = generatePremiumDueDates(policy.startDate, frequency, {
    untilIso: toIsoDate(horizon),
    maxCount: 96,
  }).filter((iso) => {
    if (!policy.expiryDate) return true;
    return iso <= policy.expiryDate;
  });

  if (allDates.length === 0) {
    return {
      hasSchedule: false,
      dueDate: null,
      daysRemaining: Number.POSITIVE_INFINITY,
      overdue: false,
      urgency: "neutral",
      emoji: "📅",
      headline: "Next Premium",
      detail: "No premium dates in policy term",
      cycleProgressPct: 0,
      lastPremiumPaidDate: null,
      upcomingDates: [],
      frequency,
    };
  }

  const todayIsoValue = toIsoDate(today);
  let currentIndex = -1;
  for (let i = 0; i < allDates.length; i += 1) {
    if (allDates[i] <= todayIsoValue) currentIndex = i;
    else break;
  }

  let dueDate: string;
  let overdue = false;
  let daysRemaining: number;

  if (currentIndex < 0) {
    dueDate = allDates[0];
    daysRemaining = daysUntil(dueDate, now);
  } else {
    const currentDue = allDates[currentIndex];
    const daysToCurrent = daysUntil(currentDue, now);
    if (daysToCurrent < 0) {
      dueDate = currentDue;
      daysRemaining = daysToCurrent;
      overdue = true;
    } else {
      dueDate = currentDue;
      daysRemaining = daysToCurrent;
    }
  }

  const dueIndex = allDates.indexOf(dueDate);
  const previousDate = dueIndex > 0 ? allDates[dueIndex - 1] : null;
  const cycleEnd = parseLocalDate(dueDate)!;
  const cycleStart = previousDate
    ? parseLocalDate(previousDate)!
    : addMonthsClamped(cycleEnd, -interval);
  const totalMs = Math.max(1, cycleEnd.getTime() - cycleStart.getTime());
  const elapsedMs = Math.min(totalMs, Math.max(0, today.getTime() - cycleStart.getTime()));
  const cycleProgressPct = overdue ? 100 : Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));

  const upcomingDates = allDates.filter((iso) => iso >= dueDate).slice(0, 6);
  const urgency = premiumUrgencyFromDays(daysRemaining, true);

  let detail: string;
  if (overdue) {
    const days = Math.abs(daysRemaining);
    detail = `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  } else if (daysRemaining === 0) {
    detail = "Due today";
  } else if (daysRemaining === 1) {
    detail = "Due Tomorrow";
  } else {
    detail = `Due in ${daysRemaining} days`;
  }

  const emoji = urgency === "red" ? "🔴" : urgency === "orange" ? "🟠" : urgency === "yellow" ? "🟡" : "🟢";

  return {
    hasSchedule: true,
    dueDate,
    daysRemaining,
    overdue,
    urgency,
    emoji,
    headline: "Next Premium",
    detail,
    cycleProgressPct,
    lastPremiumPaidDate: previousDate,
    upcomingDates,
    frequency,
  };
}

export function sortPoliciesByPremiumDue(policies: InsurancePolicy[], now = new Date()): InsurancePolicy[] {
  return [...policies].sort((a, b) => {
    const aInfo = buildPremiumDueInfo(a, now);
    const bInfo = buildPremiumDueInfo(b, now);
    const aKey = aInfo.hasSchedule ? aInfo.daysRemaining : Number.POSITIVE_INFINITY;
    const bKey = bInfo.hasSchedule ? bInfo.daysRemaining : Number.POSITIVE_INFINITY;
    if (aKey !== bKey) return aKey - bKey;
    return a.provider.localeCompare(b.provider);
  });
}

export type PremiumReminderMark = 30 | 7 | 1 | 0;

export function premiumReminderMarksForDays(daysRemaining: number): PremiumReminderMark[] {
  const marks: PremiumReminderMark[] = [];
  if (daysRemaining === 30) marks.push(30);
  if (daysRemaining === 7) marks.push(7);
  if (daysRemaining === 1) marks.push(1);
  if (daysRemaining === 0) marks.push(0);
  return marks;
}

export function premiumReminderMessage(policy: InsurancePolicy, mark: PremiumReminderMark, dueDate: string) {
  const when =
    mark === 30
      ? "in 30 days"
      : mark === 7
        ? "in 7 days"
        : mark === 1
          ? "tomorrow"
          : "today";
  return `${policy.provider}: premium due ${when} (${formatDisplayDate(dueDate)}).`;
}
