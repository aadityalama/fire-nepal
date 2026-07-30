import type {
  InsurancePaymentFrequency,
  InsurancePolicy,
  InsurancePolicyStatus,
  InsuranceType,
  PremiumHistoryEntry,
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
    if (daysRemaining === 30) return { urgency, emoji: "🟡", label: "Due in 30 Days" };
    if (daysRemaining === 1) return { urgency, emoji: "🟡", label: "Due Tomorrow" };
    return { urgency, emoji: "🟡", label: `Due in ${daysRemaining} Days` };
  }
  return { urgency: "green", emoji: "🟢", label: "On Track" };
}

export function buildPremiumDueInfo(policy: InsurancePolicy, now = new Date()): PremiumDueInfo {
  const tracker = buildPremiumTracker(policy, now);
  const frequency = policy.paymentFrequency || "yearly";

  if (!tracker.nextPremiumDate && tracker.totalInstallments > 0 && tracker.installmentsRemaining === 0) {
    return {
      hasSchedule: true,
      dueDate: null,
      daysRemaining: Number.POSITIVE_INFINITY,
      overdue: false,
      urgency: "green",
      emoji: "🟢",
      headline: "Next Premium",
      detail: "All installments paid",
      cycleProgressPct: 100,
      lastPremiumPaidDate: tracker.history.filter((h) => h.status === "paid").at(-1)?.dueDate ?? null,
      upcomingDates: [],
      frequency,
    };
  }

  if (!tracker.nextPremiumDate) {
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

  const daysRemaining = daysUntil(tracker.nextPremiumDate, now);
  const overdue = daysRemaining < 0;
  const smart = tracker.smartStatus;
  const lastPaid = tracker.history.filter((h) => h.status === "paid").at(-1)?.dueDate ?? null;
  const upcomingDates = tracker.history.filter((h) => h.status !== "paid").map((h) => h.dueDate).slice(0, 6);

  return {
    hasSchedule: true,
    dueDate: tracker.nextPremiumDate,
    daysRemaining,
    overdue,
    urgency: smart.urgency,
    emoji: smart.emoji,
    headline: "Next Premium",
    detail: overdue
      ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"}`
      : smart.label,
    cycleProgressPct: overdue
      ? 100
      : Math.max(0, Math.min(100, Math.round((tracker.installmentsPaid / Math.max(1, tracker.totalInstallments)) * 100))),
    lastPremiumPaidDate: lastPaid,
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

export function resolvePolicyEndDate(
  policy: Pick<InsurancePolicy, "startDate" | "expiryDate" | "policyTermYears">,
): string | null {
  const termYears = Number(policy.policyTermYears);
  if (policy.startDate && Number.isFinite(termYears) && termYears > 0) {
    const start = parseLocalDate(policy.startDate);
    if (!start) return policy.expiryDate || null;
    return toIsoDate(addMonthsClamped(start, termYears * 12));
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
  paidAt?: string | null;
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

  const explicitTerm = Number(policy.policyTermYears);
  const termYears =
    Number.isFinite(explicitTerm) && explicitTerm > 0
      ? explicitTerm
      : (() => {
          const end = resolvePolicyEndDate(policy);
          if (!policy.startDate || !end) return 0;
          const parts = diffYearsMonths(policy.startDate, end);
          return Math.max(1, parts.years + (parts.months > 0 ? 1 : 0));
        })();

  if (termYears <= 0) return 0;
  return Math.round((termYears * 12) / perYear);
}

function emptyPremiumTracker(
  amount: number,
  termYears: number,
  smartStatus: SmartPremiumStatus,
): PremiumTrackerSummary {
  return {
    policyTermYears: termYears,
    totalInstallments: 0,
    installmentsPaid: 0,
    installmentsRemaining: 0,
    premiumPaidSoFarNpr: 0,
    remainingPremiumNpr: 0,
    nextPremiumDate: null,
    nextPremiumAmountNpr: Math.max(0, amount),
    history: [],
    smartStatus,
  };
}

function paidDueDateSet(history: PremiumHistoryEntry[] | undefined | null): Set<string> {
  const set = new Set<string>();
  if (!Array.isArray(history)) return set;
  for (const entry of history) {
    if (!entry || typeof entry.dueDate !== "string") continue;
    if (entry.status === "paid" || entry.paidAt) set.add(entry.dueDate);
  }
  return set;
}

/** Build / refresh the installment timeline from start date, frequency, term, and explicit paid marks. */
export function buildPremiumTracker(policy: InsurancePolicy, now = new Date()): PremiumTrackerSummary {
  try {
    const safePolicy: InsurancePolicy = {
      ...policy,
      startDate: typeof policy.startDate === "string" ? policy.startDate : "",
      expiryDate: typeof policy.expiryDate === "string" ? policy.expiryDate : "",
      policyTermYears: Number.isFinite(Number(policy.policyTermYears))
        ? Math.max(0, Math.round(Number(policy.policyTermYears)))
        : 0,
      premiumNpr: Number.isFinite(Number(policy.premiumNpr)) ? Math.max(0, Number(policy.premiumNpr)) : 0,
      paymentFrequency: policy.paymentFrequency || "yearly",
      documents: Array.isArray(policy.documents) ? policy.documents : [],
      familyMembersCovered: Array.isArray(policy.familyMembersCovered) ? policy.familyMembersCovered : [],
      premiumHistory: Array.isArray(policy.premiumHistory) ? policy.premiumHistory : [],
    };

    const interval = premiumIntervalMonths(safePolicy.paymentFrequency);
    const amount = Math.max(0, safePolicy.premiumNpr);
    const endDate = resolvePolicyEndDate(safePolicy);
    const explicitTerm = Number(safePolicy.policyTermYears) || 0;
    const termYears: number =
      explicitTerm > 0
        ? explicitTerm
        : safePolicy.startDate && endDate
          ? Math.max(1, Math.round(diffYearsMonths(safePolicy.startDate, endDate).totalMonths / 12))
          : 0;

    const hasExplicitPaidMarks = (safePolicy.premiumHistory ?? []).some(
      (entry) => entry && (entry.status === "paid" || Boolean(entry.paidAt)),
    );
    const paidSet = paidDueDateSet(safePolicy.premiumHistory);
    const todayIsoValue = toIsoDate(startOfLocalDay(now));

    if (safePolicy.paymentFrequency === "one_time") {
      const dueDate = safePolicy.startDate || todayIsoValue;
      const explicitlyPaid = paidSet.has(dueDate);
      const autoPaid = !hasExplicitPaidMarks && safePolicy.startDate && daysUntil(safePolicy.startDate, now) <= 0;
      const paid = explicitlyPaid || Boolean(autoPaid);
      const status: PremiumHistoryEntry["status"] = paid
        ? "paid"
        : dueDate === todayIsoValue
          ? "due"
          : dueDate < todayIsoValue
            ? "overdue"
            : "upcoming";
      const history: PremiumInstallmentEntry[] = dueDate
        ? [{ dueDate, amountNpr: amount, status, paidAt: paid ? safePolicy.premiumHistory?.find((e) => e.dueDate === dueDate)?.paidAt ?? (paid ? now.toISOString() : null) : null }]
        : [];
      const daysRemaining = dueDate ? daysUntil(dueDate, now) : Number.POSITIVE_INFINITY;
      const smartStatus = smartPremiumStatus(paid ? Number.POSITIVE_INFINITY : daysRemaining, Boolean(dueDate));
      return {
        policyTermYears: termYears,
        totalInstallments: 1,
        installmentsPaid: paid ? 1 : 0,
        installmentsRemaining: paid ? 0 : 1,
        premiumPaidSoFarNpr: paid ? amount : 0,
        remainingPremiumNpr: paid ? 0 : amount,
        nextPremiumDate: paid ? null : dueDate || null,
        nextPremiumAmountNpr: paid ? 0 : amount,
        history,
        smartStatus: paid ? { urgency: "green", emoji: "🟢", label: "On Track" } : smartStatus,
      };
    }

    const start = parseLocalDate(safePolicy.startDate);
    if (!interval || !safePolicy.startDate || !start) {
      return emptyPremiumTracker(amount, termYears, { urgency: "neutral", emoji: "📅", label: "No schedule" });
    }

    const totalFromTerm = computeTotalInstallments({ ...safePolicy, policyTermYears: termYears });
    const untilIso = endDate || toIsoDate(addMonthsClamped(start, Math.max(termYears, 1) * 12));
    const allDates = generatePremiumDueDates(safePolicy.startDate, safePolicy.paymentFrequency, {
      untilIso,
      maxCount: Math.max(totalFromTerm || 48, 48),
    }).filter((iso) => {
      if (!endDate) return true;
      return iso <= endDate;
    });

    const boundedDates = totalFromTerm > 0 ? allDates.slice(0, totalFromTerm) : allDates;
    const totalInstallments = totalFromTerm > 0 ? totalFromTerm : boundedDates.length;

    const history: PremiumInstallmentEntry[] = boundedDates.map((dueDate) => {
      const explicitlyPaid = paidSet.has(dueDate);
      const autoPaid = !hasExplicitPaidMarks && dueDate < todayIsoValue;
      const paid = explicitlyPaid || autoPaid;
      let status: PremiumHistoryEntry["status"];
      if (paid) status = "paid";
      else if (dueDate < todayIsoValue) status = "overdue";
      else if (dueDate === todayIsoValue) status = "due";
      else status = "upcoming";
      const prior = (safePolicy.premiumHistory ?? []).find((entry) => entry.dueDate === dueDate);
      return {
        dueDate,
        amountNpr: amount,
        status,
        paidAt: paid ? prior?.paidAt ?? (autoPaid ? `${dueDate}T00:00:00.000Z` : null) : null,
      };
    });

    const installmentsPaid = history.filter((item) => item.status === "paid").length;
    const installmentsRemaining = Math.max(0, totalInstallments - installmentsPaid);
    const nextUnpaid = history.find((item) => item.status !== "paid") ?? null;
    const daysRemaining = nextUnpaid ? daysUntil(nextUnpaid.dueDate, now) : Number.POSITIVE_INFINITY;
    const smartStatus = nextUnpaid
      ? smartPremiumStatus(daysRemaining, true)
      : { urgency: "green" as const, emoji: "🟢", label: "On Track" };

    return {
      policyTermYears: termYears,
      totalInstallments,
      installmentsPaid,
      installmentsRemaining,
      premiumPaidSoFarNpr: installmentsPaid * amount,
      remainingPremiumNpr: installmentsRemaining * amount,
      nextPremiumDate: nextUnpaid?.dueDate ?? null,
      nextPremiumAmountNpr: nextUnpaid ? amount : 0,
      history,
      smartStatus,
    };
  } catch {
    return emptyPremiumTracker(
      Number.isFinite(Number(policy?.premiumNpr)) ? Math.max(0, Number(policy.premiumNpr)) : 0,
      0,
      { urgency: "neutral", emoji: "📅", label: "No schedule" },
    );
  }
}

/** Snapshot tracker fields onto a policy / form payload for persistence. */
export function applyTrackerSnapshot<T extends Partial<InsurancePolicy> | InsurancePolicy>(
  policy: T,
  now = new Date(),
): T & {
  premiumHistory: PremiumHistoryEntry[];
  totalInstallments: number;
  installmentsPaid: number;
  installmentsRemaining: number;
  totalPremiumPaid: number;
  remainingPremium: number;
  nextPremiumDate: string | null;
  nextPremiumAmount: number;
} {
  const tracker = buildPremiumTracker(policy as InsurancePolicy, now);
  return {
    ...policy,
    premiumHistory: tracker.history.map((item) => ({
      dueDate: item.dueDate,
      amountNpr: item.amountNpr,
      status: item.status,
      paidAt: item.paidAt ?? null,
    })),
    totalInstallments: tracker.totalInstallments,
    installmentsPaid: tracker.installmentsPaid,
    installmentsRemaining: tracker.installmentsRemaining,
    totalPremiumPaid: tracker.premiumPaidSoFarNpr,
    remainingPremium: tracker.remainingPremiumNpr,
    nextPremiumDate: tracker.nextPremiumDate,
    nextPremiumAmount: tracker.nextPremiumAmountNpr,
  };
}

/** Mark a due-date installment as paid and return updated policy fields. */
export function markInstallmentPaid(policy: InsurancePolicy, dueDate: string, paidAt = new Date()): InsurancePolicy {
  const tracker = buildPremiumTracker(policy, paidAt);
  const history = tracker.history.map((item) => {
    if (item.dueDate !== dueDate) return item;
    return {
      ...item,
      status: "paid" as const,
      paidAt: paidAt.toISOString(),
    };
  });
  const withPaid: InsurancePolicy = {
    ...policy,
    premiumHistory: history,
  };
  return applyTrackerSnapshot(withPaid, paidAt);
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
  policyAgeLabel: string;
  remainingTermLabel: string;
};

export function buildPolicyQuickSummary(policy: InsurancePolicy, now = new Date()): PolicyQuickSummary {
  const tracker = buildPremiumTracker(policy, now);
  const timeline = buildPolicyTimeline(policy, now);
  return {
    policyValueNpr: Math.max(0, policy.coverageAmountNpr),
    coverageNpr: Math.max(0, policy.coverageAmountNpr),
    totalPremiumPaidNpr: tracker.premiumPaidSoFarNpr,
    remainingPremiumNpr: tracker.remainingPremiumNpr,
    installmentsPaid: tracker.installmentsPaid,
    installmentsRemaining: tracker.installmentsRemaining,
    nextPremiumDate: tracker.nextPremiumDate,
    nextPremiumAmountNpr: tracker.nextPremiumAmountNpr,
    policyAgeLabel: timeline.runningForLabel,
    remainingTermLabel: timeline.remainingLabel,
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
