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
  if (daysRemaining === 0) return "orange";
  if (daysRemaining <= 30) return "yellow";
  return "green";
}

export type SmartPremiumStatus = {
  urgency: PremiumUrgency;
  emoji: string;
  label: string;
};

export function smartPremiumStatus(daysRemaining: number, hasSchedule: boolean): SmartPremiumStatus {
  const urgency = premiumUrgencyFromDays(daysRemaining, hasSchedule);
  if (!hasSchedule) {
    return { urgency: "neutral", emoji: "📅", label: "No schedule" };
  }
  if (urgency === "red") return { urgency, emoji: "🔴", label: "Overdue" };
  if (urgency === "orange") return { urgency, emoji: "🟠", label: "Due Today" };
  if (urgency === "yellow") {
    return {
      urgency,
      emoji: "🟡",
      label: daysRemaining === 1 ? "Due Tomorrow" : `Due in ${daysRemaining} days`,
    };
  }
  return { urgency: "green", emoji: "🟢", label: "On Track" };
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
  const nextIndex = allDates.findIndex((iso) => iso >= todayIsoValue);
  let dueDate: string;
  let overdue = false;
  let daysRemaining: number;

  if (nextIndex >= 0) {
    // Next premium is today or in the future — past due dates are treated as paid.
    dueDate = allDates[nextIndex];
    daysRemaining = daysUntil(dueDate, now);
  } else {
    // Every scheduled date is in the past — last premium is overdue / term complete.
    dueDate = allDates[allDates.length - 1];
    daysRemaining = daysUntil(dueDate, now);
    overdue = daysRemaining < 0;
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

  const smart = smartPremiumStatus(daysRemaining, true);
  let detail: string;
  if (overdue) {
    const days = Math.abs(daysRemaining);
    detail = `Overdue by ${days} day${days === 1 ? "" : "s"}`;
  } else {
    detail = smart.label;
  }

  return {
    hasSchedule: true,
    dueDate,
    daysRemaining,
    overdue,
    urgency,
    emoji: smart.emoji,
    headline: "Next Premium",
    detail,
    cycleProgressPct,
    lastPremiumPaidDate: previousDate,
    upcomingDates,
    frequency,
  };
}

export type DurationParts = {
  years: number;
  months: number;
  totalMonths: number;
};

export function diffYearsMonths(fromIso: string, toIso: string): DurationParts {
  const from = parseLocalDate(fromIso);
  const to = parseLocalDate(toIso);
  if (!from || !to) return { years: 0, months: 0, totalMonths: 0 };

  let years = to.getFullYear() - from.getFullYear();
  let months = to.getMonth() - from.getMonth();
  if (to.getDate() < from.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return { years: 0, months: 0, totalMonths: 0 };
  return { years, months, totalMonths: years * 12 + months };
}

export function formatDurationParts(parts: DurationParts): string {
  const bits: string[] = [];
  if (parts.years > 0) bits.push(`${parts.years} Year${parts.years === 1 ? "" : "s"}`);
  if (parts.months > 0) bits.push(`${parts.months} Month${parts.months === 1 ? "" : "s"}`);
  if (bits.length === 0) return "Less than 1 Month";
  return bits.join(" ");
}

export type PolicyTimeline = {
  startedOn: string | null;
  endsOn: string | null;
  runningFor: DurationParts;
  remaining: DurationParts;
  runningForLabel: string;
  remainingLabel: string;
};

export function resolvePolicyEndDate(policy: Pick<InsurancePolicy, "startDate" | "expiryDate" | "policyTermYears">): string | null {
  if (policy.startDate && policy.policyTermYears > 0) {
    return toIsoDate(addMonthsClamped(parseLocalDate(policy.startDate)!, policy.policyTermYears * 12));
  }
  return policy.expiryDate || null;
}

export function buildPolicyTimeline(policy: InsurancePolicy, now = new Date()): PolicyTimeline {
  const todayIsoValue = toIsoDate(startOfLocalDay(now));
  const startedOn = policy.startDate || null;
  const endsOn = resolvePolicyEndDate(policy);
  const runningFor = startedOn ? diffYearsMonths(startedOn, todayIsoValue) : { years: 0, months: 0, totalMonths: 0 };
  const remaining =
    endsOn && endsOn >= todayIsoValue
      ? diffYearsMonths(todayIsoValue, endsOn)
      : { years: 0, months: 0, totalMonths: 0 };

  return {
    startedOn,
    endsOn,
    runningFor,
    remaining,
    runningForLabel: startedOn ? formatDurationParts(runningFor) : "—",
    remainingLabel: endsOn ? (endsOn < todayIsoValue ? "Ended" : formatDurationParts(remaining)) : "—",
  };
}

export type PremiumInstallmentEntry = {
  dueDate: string;
  amountNpr: number;
  status: "paid" | "due" | "overdue" | "upcoming";
};

export type PremiumTrackerSummary = {
  policyTermYears: number;
  totalInstallments: number;
  installmentsPaid: number;
  installmentsRemaining: number;
  premiumPaidSoFarNpr: number;
  remainingPremiumNpr: number;
  nextPremiumDate: string | null;
  nextPremiumAmountNpr: number;
  history: PremiumInstallmentEntry[];
  smartStatus: SmartPremiumStatus;
};

function computeTotalInstallments(
  policy: Pick<InsurancePolicy, "paymentFrequency" | "policyTermYears" | "startDate" | "expiryDate">,
): number {
  if (policy.paymentFrequency === "one_time") return 1;
  const perYear = premiumIntervalMonths(policy.paymentFrequency);
  if (!perYear) return 0;

  const termYears =
    policy.policyTermYears > 0
      ? policy.policyTermYears
      : (() => {
          const end = resolvePolicyEndDate(policy);
          if (!policy.startDate || !end) return 0;
          const parts = diffYearsMonths(policy.startDate, end);
          return Math.max(1, parts.years + (parts.months > 0 ? 1 : 0));
        })();

  if (termYears <= 0) return 0;
  return Math.round((termYears * 12) / perYear);
}

export function buildPremiumTracker(policy: InsurancePolicy, now = new Date()): PremiumTrackerSummary {
  const dueInfo = buildPremiumDueInfo(policy, now);
  const smartStatus = smartPremiumStatus(dueInfo.daysRemaining, dueInfo.hasSchedule);
  const interval = premiumIntervalMonths(policy.paymentFrequency);
  const amount = Math.max(0, policy.premiumNpr);
  const endDate = resolvePolicyEndDate(policy);
  const termYears =
    policy.policyTermYears > 0
      ? policy.policyTermYears
      : policy.startDate && endDate
        ? Math.max(1, Math.round(diffYearsMonths(policy.startDate, endDate).totalMonths / 12))
        : 0;

  if (policy.paymentFrequency === "one_time") {
    const paid = policy.startDate && daysUntil(policy.startDate, now) <= 0 ? 1 : 0;
    return {
      policyTermYears: termYears,
      totalInstallments: 1,
      installmentsPaid: paid,
      installmentsRemaining: 1 - paid,
      premiumPaidSoFarNpr: paid * amount,
      remainingPremiumNpr: (1 - paid) * amount,
      nextPremiumDate: paid ? null : policy.startDate || null,
      nextPremiumAmountNpr: paid ? 0 : amount,
      history: policy.startDate
        ? [
            {
              dueDate: policy.startDate,
              amountNpr: amount,
              status: paid ? "paid" : daysUntil(policy.startDate, now) === 0 ? "due" : "upcoming",
            },
          ]
        : [],
      smartStatus,
    };
  }

  if (!interval || !policy.startDate) {
    return {
      policyTermYears: termYears,
      totalInstallments: 0,
      installmentsPaid: 0,
      installmentsRemaining: 0,
      premiumPaidSoFarNpr: 0,
      remainingPremiumNpr: 0,
      nextPremiumDate: null,
      nextPremiumAmountNpr: amount,
      history: [],
      smartStatus,
    };
  }

  const totalFromTerm = computeTotalInstallments({ ...policy, policyTermYears: termYears });
  const untilIso =
    endDate ||
    toIsoDate(addMonthsClamped(parseLocalDate(policy.startDate)!, Math.max(termYears, 1) * 12));

  const allDates = generatePremiumDueDates(policy.startDate, policy.paymentFrequency, {
    untilIso,
    maxCount: Math.max(totalFromTerm || 48, 48),
  }).filter((iso) => {
    if (!endDate) return true;
    return iso <= endDate;
  });

  const boundedDates =
    totalFromTerm > 0 ? allDates.slice(0, totalFromTerm) : allDates;
  const totalInstallments = totalFromTerm > 0 ? totalFromTerm : boundedDates.length;

  const todayIsoValue = toIsoDate(startOfLocalDay(now));
  let unpaidIndex = boundedDates.findIndex((iso) => iso >= todayIsoValue);
  if (unpaidIndex < 0) {
    unpaidIndex = dueInfo.overdue ? Math.max(0, boundedDates.length - 1) : boundedDates.length;
  }

  const installmentsPaid = Math.max(0, Math.min(totalInstallments, unpaidIndex));
  const installmentsRemaining = Math.max(0, totalInstallments - installmentsPaid);

  const history: PremiumInstallmentEntry[] = boundedDates.map((dueDate, index) => {
    let status: PremiumInstallmentEntry["status"];
    if (index < installmentsPaid) status = "paid";
    else if (dueInfo.overdue && dueDate === dueInfo.dueDate) status = "overdue";
    else if (dueDate === todayIsoValue) status = "due";
    else status = "upcoming";
    return { dueDate, amountNpr: amount, status };
  });

  return {
    policyTermYears: termYears,
    totalInstallments,
    installmentsPaid,
    installmentsRemaining,
    premiumPaidSoFarNpr: installmentsPaid * amount,
    remainingPremiumNpr: installmentsRemaining * amount,
    nextPremiumDate: dueInfo.dueDate,
    nextPremiumAmountNpr: amount,
    history,
    smartStatus,
  };
}

export type PolicyQuickSummary = {
  policyValueNpr: number;
  coverageNpr: number;
  totalPremiumPaidNpr: number;
  remainingPremiumNpr: number;
  installmentsPaid: number;
  installmentsRemaining: number;
  nextPremiumDate: string | null;
  nextPremiumAmountNpr: number;
};

export function buildPolicyQuickSummary(policy: InsurancePolicy, now = new Date()): PolicyQuickSummary {
  const tracker = buildPremiumTracker(policy, now);
  return {
    policyValueNpr: Math.max(0, policy.coverageAmountNpr),
    coverageNpr: Math.max(0, policy.coverageAmountNpr),
    totalPremiumPaidNpr: tracker.premiumPaidSoFarNpr,
    remainingPremiumNpr: tracker.remainingPremiumNpr,
    installmentsPaid: tracker.installmentsPaid,
    installmentsRemaining: tracker.installmentsRemaining,
    nextPremiumDate: tracker.nextPremiumDate,
    nextPremiumAmountNpr: tracker.nextPremiumAmountNpr,
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
