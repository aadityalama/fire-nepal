import type { SavingsGoal, SavingsGoalProgress, SavingsTransaction } from "@/lib/savings/savings-types";

export function formatRs(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatRsCompact(amount: number) {
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `Rs. ${(abs / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`;
  if (abs >= 1e5) return `Rs. ${(abs / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`;
  if (abs >= 1e3) return `Rs. ${Math.round(abs / 1e3)}k`;
  return formatRs(amount);
}

export function formatPct(n: number, digits = 1) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayDiff(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000);
}

export function addMonthsIso(iso: string, months: number) {
  const date = parseIsoDate(iso) ?? new Date();
  const next = new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
  return next.toISOString().slice(0, 10);
}

export function defaultTargetDate(monthsAhead: number) {
  return addMonthsIso(new Date().toISOString().slice(0, 10), monthsAhead);
}

export function remainingTimeLabel(daysRemaining: number, status: SavingsGoal["status"]) {
  if (status === "completed") return "Completed";
  if (daysRemaining < 0) return `Overdue by ${Math.abs(daysRemaining)} Day${Math.abs(daysRemaining) === 1 ? "" : "s"}`;
  if (daysRemaining === 0) return "Due Today";
  if (daysRemaining === 1) return "1 Day Left";
  if (daysRemaining < 30) return `${daysRemaining} Days Left`;
  if (daysRemaining < 365) {
    const months = Math.max(1, Math.round(daysRemaining / 30));
    return `${months} Month${months === 1 ? "" : "s"} Left`;
  }
  const years = Math.max(1, Math.round(daysRemaining / 365));
  return `${years} Year${years === 1 ? "" : "s"} Left`;
}

export function computeGoalProgress(goal: SavingsGoal, today = new Date()): SavingsGoalProgress {
  const target = Math.max(goal.targetAmountNpr, 0);
  const saved = Math.max(0, Math.min(goal.savedAmountNpr, target));
  const savedPct = target > 0 ? Math.round((saved / target) * 100) : 0;
  const remainingAmountNpr = Math.max(0, target - saved);
  const dueDate = parseIsoDate(goal.targetDate);
  const daysRemaining = dueDate ? dayDiff(today, dueDate) : 0;

  let expectedCompletionDate: string | null = null;
  if (goal.monthlyContributionNpr > 0 && remainingAmountNpr > 0) {
    const monthsNeeded = Math.ceil(remainingAmountNpr / goal.monthlyContributionNpr);
    expectedCompletionDate = addMonthsIso(today.toISOString().slice(0, 10), monthsNeeded);
  } else if (remainingAmountNpr <= 0) {
    expectedCompletionDate = today.toISOString().slice(0, 10);
  }

  let statusTone: SavingsGoalProgress["statusTone"] = "green";
  if (goal.status === "completed") statusTone = "green";
  else if (daysRemaining < 0 || daysRemaining <= 30) statusTone = "red";
  else if (daysRemaining <= 90) statusTone = "orange";

  return {
    savedPct,
    remainingAmountNpr,
    daysRemaining,
    remainingLabel: remainingTimeLabel(daysRemaining, goal.status),
    expectedCompletionDate,
    statusTone,
  };
}

export function sortGoalsStable<T extends { sortOrder: number; createdAt: string; name: string }>(goals: T[]) {
  return [...goals].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.name.localeCompare(b.name);
  });
}

export function computeDashboardSummary(goals: SavingsGoal[], transactions: SavingsTransaction[]) {
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const totalSavedNpr = goals.reduce((sum, goal) => sum + Math.max(0, goal.savedAmountNpr), 0);
  const monthlySavingNpr = activeGoals.reduce((sum, goal) => sum + Math.max(0, goal.monthlyContributionNpr), 0);
  const nearestTargetDate =
    activeGoals
      .map((goal) => goal.targetDate)
      .filter(Boolean)
      .sort()[0] ?? null;

  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthKey = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`;

  const currentMonthTotal = transactions
    .filter((txn) => txn.date.startsWith(currentMonthKey))
    .reduce((sum, txn) => sum + txn.amountNpr, 0);
  const previousMonthTotal = transactions
    .filter((txn) => txn.date.startsWith(previousMonthKey))
    .reduce((sum, txn) => sum + txn.amountNpr, 0);

  const growthPct =
    previousMonthTotal > 0
      ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
      : currentMonthTotal > 0
        ? 100
        : 0;

  return {
    totalSavingsNpr: totalSavedNpr,
    activeGoalsCount: activeGoals.length,
    totalSavedNpr,
    monthlySavingNpr,
    nearestTargetDate,
    growthPct,
  };
}

export function buildSavingsAiInsight(goals: SavingsGoal[]) {
  const candidate = sortGoalsStable(goals.filter((goal) => goal.status === "active" && goal.monthlyContributionNpr > 0))[0];
  if (!candidate) return null;

  const progress = computeGoalProgress(candidate);
  if (progress.remainingAmountNpr <= 0 || !progress.expectedCompletionDate) return null;

  const baselineMonths = Math.max(
    1,
    Math.ceil(progress.remainingAmountNpr / Math.max(candidate.monthlyContributionNpr * 0.85, 1)),
  );
  const acceleratedMonths = Math.max(
    1,
    Math.ceil(progress.remainingAmountNpr / candidate.monthlyContributionNpr),
  );
  const monthsSaved = Math.max(0, baselineMonths - acceleratedMonths);
  if (monthsSaved <= 0) return null;

  return `If you continue saving ${formatRs(candidate.monthlyContributionNpr)}/month, your ${candidate.name} will finish ${monthsSaved} month${monthsSaved === 1 ? "" : "s"} earlier.`;
}

export function formatDisplayDate(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const STATUS_TONE_STYLES = {
  green: "border-emerald-300/35 bg-emerald-500/12 text-emerald-100",
  orange: "border-amber-300/35 bg-amber-500/12 text-amber-100",
  red: "border-rose-300/35 bg-rose-500/12 text-rose-100",
} as const;

export const DEFAULT_REMINDER_TIMINGS = [
  "7 days before",
  "3 days before",
  "1 day before",
  "Goal completed",
  "Monthly reminder",
] as const;
