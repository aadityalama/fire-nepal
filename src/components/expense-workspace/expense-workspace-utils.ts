import type { ExpenseWorkspaceMeta, ExpenseWorkspaceNotification } from "@/lib/expense-workspace-ui";
import type { Expense } from "@/lib/expense-utils";

export type ExpenseFilter =
  | "All"
  | "Today"
  | "Tomorrow"
  | "Upcoming"
  | "This Week"
  | "This Month"
  | "Recurring"
  | "Completed"
  | "Overdue";

export type ExpenseStatusTone = "overdue" | "today" | "tomorrow" | "upcoming" | "completed" | "cancelled";

export type ExpenseStatus = {
  label: string;
  tone: ExpenseStatusTone;
  remainingDays: number;
  remainingLabel: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  "Food/Mart": "🍔",
  Rent: "🏠",
  Electricity: "⚡",
  Internet: "📶",
  Remittance: "💸",
  Other: "💼",
};

export function formatNpr(amount: number) {
  return `NPR ${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatDisplayDate(iso: string) {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function categoryIcon(category: string) {
  return CATEGORY_ICONS[category] ?? "💳";
}

export function getDueDate(expense: Expense, meta?: ExpenseWorkspaceMeta) {
  return meta?.dueDate ?? expense.date;
}

export function parseIsoDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayDiff(from: Date, to: Date) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function getExpenseStatus(expense: Expense, meta?: ExpenseWorkspaceMeta, today = new Date()): ExpenseStatus {
  if (meta?.cancelled) {
    return { label: "Cancelled", tone: "cancelled", remainingDays: 0, remainingLabel: "Cancelled" };
  }
  if (meta?.paidAt) {
    return { label: "Paid", tone: "completed", remainingDays: 0, remainingLabel: "Completed" };
  }

  const dueDate = parseIsoDate(getDueDate(expense, meta));
  if (!dueDate) {
    return { label: "Upcoming", tone: "upcoming", remainingDays: 0, remainingLabel: "—" };
  }

  const diff = dayDiff(today, dueDate);
  if (diff < 0) {
    const overdueDays = Math.abs(diff);
    return {
      label: "Overdue",
      tone: "overdue",
      remainingDays: diff,
      remainingLabel: `Overdue by ${overdueDays} Day${overdueDays === 1 ? "" : "s"}`,
    };
  }
  if (diff === 0) {
    return { label: "Today", tone: "today", remainingDays: 0, remainingLabel: "Due Today" };
  }
  if (diff === 1) {
    return { label: "Tomorrow", tone: "tomorrow", remainingDays: 1, remainingLabel: "Tomorrow" };
  }
  return {
    label: "Upcoming",
    tone: "upcoming",
    remainingDays: diff,
    remainingLabel: `${diff} Days Left`,
  };
}

export const STATUS_STYLES: Record<ExpenseStatusTone, string> = {
  overdue: "border-red-300/40 bg-red-500/15 text-red-100",
  today: "border-orange-300/40 bg-orange-500/15 text-orange-100",
  tomorrow: "border-amber-300/40 bg-amber-400/15 text-amber-100",
  upcoming: "border-sky-300/40 bg-sky-500/15 text-sky-100",
  completed: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100",
  cancelled: "border-white/15 bg-white/8 text-emerald-100/55",
};

export const NOTIFICATION_DOT: Record<ExpenseWorkspaceNotification["tone"], string> = {
  overdue: "🔴",
  today: "🔴",
  tomorrow: "🟠",
  upcoming: "🔵",
  completed: "🟢",
};

export function matchesFilter(
  expense: Expense,
  meta: ExpenseWorkspaceMeta | undefined,
  filter: ExpenseFilter,
  today = new Date(),
) {
  const dueDate = parseIsoDate(getDueDate(expense, meta));
  if (!dueDate) return filter === "All";

  const diff = dayDiff(today, dueDate);
  const isPaid = Boolean(meta?.paidAt);
  const isRecurring = meta?.repeat && meta.repeat !== "Never";

  switch (filter) {
    case "All":
      return true;
    case "Today":
      return diff === 0 && !isPaid;
    case "Tomorrow":
      return diff === 1 && !isPaid;
    case "Upcoming":
      return diff > 1 && !isPaid;
    case "This Week": {
      const end = new Date(today);
      end.setDate(end.getDate() + 7);
      return dueDate >= startOfDay(today) && dueDate <= end && !isPaid;
    }
    case "This Month":
      return dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
    case "Recurring":
      return Boolean(isRecurring);
    case "Completed":
      return isPaid;
    case "Overdue":
      return diff < 0 && !isPaid;
    default:
      return true;
  }
}

export function matchesSearch(expense: Expense, meta: ExpenseWorkspaceMeta | undefined, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    expense.title,
    expense.category,
    expense.notes ?? "",
    meta?.account ?? "",
    meta?.paymentMethod ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function sortByDueDate(expenses: Expense[], metaMap: Record<number, ExpenseWorkspaceMeta>) {
  return [...expenses].sort((a, b) => {
    const aDate = getDueDate(a, metaMap[a.id]);
    const bDate = getDueDate(b, metaMap[b.id]);
    return aDate.localeCompare(bDate);
  });
}

export type UpcomingBucket = {
  label: string;
  items: Array<{ expense: Expense; meta?: ExpenseWorkspaceMeta; status: ExpenseStatus }>;
};

export function buildUpcomingBuckets(
  expenses: Expense[],
  metaMap: Record<number, ExpenseWorkspaceMeta>,
  today = new Date(),
): UpcomingBucket[] {
  const buckets: UpcomingBucket[] = [
    { label: "Today", items: [] },
    { label: "Tomorrow", items: [] },
    { label: "In 3 Days", items: [] },
    { label: "In 7 Days", items: [] },
  ];

  for (const expense of expenses) {
    const meta = metaMap[expense.id];
    if (meta?.paidAt || meta?.cancelled) continue;
    const status = getExpenseStatus(expense, meta, today);
    const diff = status.remainingDays;
    const item = { expense, meta, status };
    if (status.tone === "today") buckets[0].items.push(item);
    else if (status.tone === "tomorrow") buckets[1].items.push(item);
    else if (diff === 3) buckets[2].items.push(item);
    else if (diff >= 4 && diff <= 7) buckets[3].items.push(item);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

export function buildNotifications(
  expenses: Expense[],
  metaMap: Record<number, ExpenseWorkspaceMeta>,
  today = new Date(),
): ExpenseWorkspaceNotification[] {
  const notifications: ExpenseWorkspaceNotification[] = [];

  for (const expense of expenses) {
    const meta = metaMap[expense.id];
    const status = getExpenseStatus(expense, meta, today);
    if (status.tone === "completed" || status.tone === "cancelled") {
      if (meta?.paidAt) {
        notifications.push({
          id: `paid-${expense.id}`,
          expenseId: expense.id,
          title: expense.title,
          message: `${expense.title} paid`,
          tone: "completed",
          amountNpr: expense.amount,
          dueDate: getDueDate(expense, meta),
        });
      }
      continue;
    }

    let message = "";
    if (status.tone === "overdue") message = `${expense.title} is overdue`;
    else if (status.tone === "today") message = `${expense.title} due today`;
    else if (status.tone === "tomorrow") message = `${expense.title} due tomorrow`;
    else message = `${expense.title} due in ${status.remainingDays} days`;

    notifications.push({
      id: `due-${expense.id}`,
      expenseId: expense.id,
      title: expense.title,
      message,
      tone: status.tone === "overdue" ? "overdue" : status.tone,
      amountNpr: expense.amount,
      dueDate: getDueDate(expense, meta),
    });
  }

  return notifications.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function monthSpending(expenses: Expense[], monthKey: string) {
  return expenses
    .filter((expense) => expense.date.startsWith(monthKey))
    .reduce((sum, expense) => sum + expense.amount, 0);
}

export function categoryBreakdown(expenses: Expense[]) {
  const map = new Map<string, number>();
  for (const expense of expenses) {
    map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function upcomingPaymentsTotal(
  expenses: Expense[],
  metaMap: Record<number, ExpenseWorkspaceMeta>,
  withinDays = 7,
  today = new Date(),
) {
  return expenses.reduce((sum, expense) => {
    const meta = metaMap[expense.id];
    if (meta?.paidAt || meta?.cancelled) return sum;
    const status = getExpenseStatus(expense, meta, today);
    if (status.remainingDays >= 0 && status.remainingDays <= withinDays) return sum + expense.amount;
    if (status.tone === "overdue") return sum + expense.amount;
    return sum;
  }, 0);
}

export function largestExpense(expenses: Expense[]) {
  return expenses.reduce<Expense | null>((max, expense) => {
    if (!max || expense.amount > max.amount) return expense;
    return max;
  }, null);
}

export function recurringExpenses(expenses: Expense[], metaMap: Record<number, ExpenseWorkspaceMeta>) {
  return expenses.filter((expense) => metaMap[expense.id]?.repeat && metaMap[expense.id]?.repeat !== "Never");
}
