"use client";

import {
  ArrowLeft,
  Bell,
  CalendarDays,
  Copy,
  FileText,
  Mail,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ExpenseWorkspaceCalendar } from "@/components/expense-workspace/ExpenseWorkspaceCalendar";
import { FinanceCategoryPicker } from "@/components/finance/FinanceCategoryPicker";
import {
  buildCommandCenterInsights,
  buildNotifications,
  buildUpcomingBuckets,
  categoryBreakdown,
  categoryIcon,
  formatDisplayDate,
  formatExpenseRepeatReminder,
  formatNpr,
  getDueDate,
  getExpenseStatus,
  matchesFilter,
  matchesSearch,
  monthSpending,
  NOTIFICATION_DOT,
  sortByDueDate,
  STATUS_STYLES,
  upcomingPaymentsTotal,
  type ExpenseFilter,
} from "@/components/expense-workspace/expense-workspace-utils";
import { fetchBudgetRecords } from "@/lib/budget/budget-api";
import { monthlyComparisonData } from "@/lib/expense-analytics";
import { DEFAULT_FINANCE_CATEGORY_ID, getFinanceCategoryLabel, normalizeFinanceCategory } from "@/lib/finance/categories";
import {
  loadExpenseWorkspaceUiState,
  saveExpenseWorkspaceUiState,
  type ExpenseReminderTiming,
  type ExpenseRepeat,
  type ExpenseWorkspaceMeta,
  type ExpenseWorkspaceNotification,
} from "@/lib/expense-workspace-ui";
import type { Expense, RoommateProfile } from "@/lib/expense-utils";
import { useFireTheme } from "@/contexts/FireThemeContext";

const ExpenseWorkspaceTrendChart = dynamic(
  () => import("@/components/expense-workspace/ExpenseWorkspaceTrendChart").then((mod) => mod.ExpenseWorkspaceTrendChart),
  { ssr: false, loading: () => null },
);

const FILTERS: ExpenseFilter[] = ["All", "Today", "This Week", "This Month", "Upcoming", "Recurring"];

const REPEAT_OPTIONS: Array<{ id: ExpenseRepeat; label: string }> = [
  { id: "Never", label: "None" },
  { id: "Daily", label: "Daily" },
  { id: "Weekly", label: "Weekly" },
  { id: "Monthly", label: "Monthly" },
  { id: "Yearly", label: "Yearly" },
];

const DONUT_COLORS = ["#bef264", "#34d399", "#2dd4bf", "#67e8f9", "#a3e635", "#4ade80", "#fde047", "#fb923c"];

const INSIGHT_TONE: Record<string, string> = {
  positive: "border-emerald-300/25 bg-emerald-500/12 text-emerald-50",
  warning: "border-amber-300/30 bg-amber-500/12 text-amber-50",
  neutral: "border-white/10 bg-white/[0.05] text-emerald-50",
  info: "border-sky-300/25 bg-sky-500/12 text-sky-50",
};

const PRIORITY_STYLES = {
  high: "border-red-300/35 bg-red-500/15 text-red-100",
  medium: "border-amber-300/35 bg-amber-400/15 text-amber-100",
  low: "border-sky-300/30 bg-sky-500/12 text-sky-100",
} as const;

type WorkspaceForm = {
  title: string;
  amount: string;
  category: string;
  expenseDate: string;
  repeat: ExpenseRepeat;
  notes: string;
};

function emptyForm(today: string): WorkspaceForm {
  return {
    title: "",
    amount: "",
    category: DEFAULT_FINANCE_CATEGORY_ID,
    expenseDate: today,
    repeat: "Never",
    notes: "",
  };
}

/** Silent defaults when Account / Due Date / advanced reminder timing are not collected in the UI. */
const DEFAULT_WORKSPACE_ACCOUNT = "Personal";
const DEFAULT_PAYMENT_METHOD = "Bank Transfer";
const DEFAULT_REMINDER_TIMING: ExpenseReminderTiming = "On Due Date";
const DEFAULT_REMINDER_TIME = "09:00";

export type ExpenseWorkspaceDashboardProps = {
  expenses: Expense[];
  members: string[];
  profiles: Record<string, RoommateProfile>;
  selectedMonthKey: string;
  hydrated: boolean;
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onDuplicateExpense: (expense: Expense) => void;
  onSaveWorkspaceMeta: (expenseId: number, meta: ExpenseWorkspaceMeta) => void;
  onMarkPaid: (expenseId: number, paidAt: string) => void;
  onOpenLegacyAnalytics: () => void;
  onOpenLegacyHistory: () => void;
  onSubmitWorkspaceExpense: (payload: {
    title: string;
    amountNpr: number;
    category: string;
    expenseDate: string;
    dueDate: string;
    account: string;
    paymentMethod: string;
    repeat: ExpenseRepeat;
    notes: string;
    reminderEnabled: boolean;
    reminderTiming: ExpenseReminderTiming;
    reminderTime: string;
    reminderEmail: boolean;
  }) => void | Promise<void>;
};

export function ExpenseWorkspaceDashboard({
  expenses,
  members,
  profiles,
  selectedMonthKey,
  hydrated,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onDuplicateExpense,
  onSaveWorkspaceMeta,
  onMarkPaid,
  onOpenLegacyAnalytics,
  onOpenLegacyHistory,
  onSubmitWorkspaceExpense,
}: ExpenseWorkspaceDashboardProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const todayIso = new Date().toISOString().slice(0, 10);

  const [uiState, setUiState] = useState(() => loadExpenseWorkspaceUiState());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ExpenseFilter>("All");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<WorkspaceForm>(() => emptyForm(todayIso));
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayIso);
  const [chartsReady, setChartsReady] = useState(false);
  const [monthlyBudgetTotal, setMonthlyBudgetTotal] = useState<number | null>(null);
  const [budgetLoaded, setBudgetLoaded] = useState(false);

  useEffect(() => {
    saveExpenseWorkspaceUiState(uiState);
  }, [uiState]);

  useEffect(() => {
    setUiState(loadExpenseWorkspaceUiState());
  }, [expenses]);

  useEffect(() => {
    const id = window.setTimeout(() => setChartsReady(true), 480);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let alive = true;
    void fetchBudgetRecords()
      .then((records) => {
        if (!alive) return;
        const total = records.reduce((sum, item) => sum + Math.max(0, item.monthlyBudgetNpr), 0);
        setMonthlyBudgetTotal(records.length > 0 ? total : null);
        setBudgetLoaded(true);
      })
      .catch(() => {
        if (!alive) return;
        setMonthlyBudgetTotal(null);
        setBudgetLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [expenses.length]);

  const metaMap = uiState.meta;
  const notifications = useMemo(() => buildNotifications(expenses, metaMap), [expenses, metaMap]);
  const unreadCount = notifications.filter((item) => !uiState.readNotificationIds.includes(item.id)).length;

  const filteredExpenses = useMemo(() => {
    return sortByDueDate(expenses, metaMap).filter(
      (expense) => matchesFilter(expense, metaMap[expense.id], filter) && matchesSearch(expense, metaMap[expense.id], search),
    );
  }, [expenses, metaMap, filter, search]);

  const upcomingBuckets = useMemo(() => buildUpcomingBuckets(expenses, metaMap), [expenses, metaMap]);
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(selectedMonthKey)),
    [expenses, selectedMonthKey],
  );
  const monthTotal = useMemo(() => monthSpending(expenses, selectedMonthKey), [expenses, selectedMonthKey]);
  const categories = useMemo(() => categoryBreakdown(monthExpenses), [monthExpenses]);
  const dueNext7 = useMemo(() => upcomingPaymentsTotal(expenses, metaMap, 7), [expenses, metaMap]);
  const dayOfMonth = Math.max(1, new Date().getDate());
  const dailyAverage = monthTotal > 0 ? Math.round(monthTotal / dayOfMonth) : 0;
  const remainingBudget =
    monthlyBudgetTotal != null && monthlyBudgetTotal > 0 ? Math.max(0, monthlyBudgetTotal - monthTotal) : null;

  const upcomingThisWeekCount = useMemo(() => {
    return expenses.filter((expense) => {
      const meta = metaMap[expense.id];
      if (meta?.paidAt || meta?.cancelled) return false;
      const status = getExpenseStatus(expense, meta);
      return status.remainingDays >= 0 && status.remainingDays <= 7;
    }).length;
  }, [expenses, metaMap]);

  const commandInsights = useMemo(
    () =>
      buildCommandCenterInsights({
        expenses,
        metaMap,
        selectedMonthKey,
        monthTotal,
        categories,
        budgetTotalMonthly: monthlyBudgetTotal,
        upcomingThisWeekCount,
      }),
    [expenses, metaMap, selectedMonthKey, monthTotal, categories, monthlyBudgetTotal, upcomingThisWeekCount],
  );

  const trendData = useMemo(() => {
    const comparison = monthlyComparisonData(expenses, "NPR", 6);
    return comparison.labels.map((month, index) => ({
      month,
      spent: comparison.data[index] ?? 0,
    }));
  }, [expenses]);

  const categoryDonutStops = useMemo(() => {
    if (monthTotal <= 0 || categories.length === 0) return "rgba(255,255,255,0.12) 0% 100%";
    let cursor = 0;
    const stops: string[] = [];
    for (let i = 0; i < categories.length; i += 1) {
      const item = categories[i];
      const start = (cursor / monthTotal) * 100;
      cursor += item.total;
      const end = (cursor / monthTotal) * 100;
      stops.push(`${DONUT_COLORS[i % DONUT_COLORS.length]} ${start}% ${end}%`);
    }
    return stops.join(", ");
  }, [categories, monthTotal]);

  function markNotificationRead(id: string) {
    setUiState((current) => ({
      ...current,
      readNotificationIds: current.readNotificationIds.includes(id)
        ? current.readNotificationIds
        : [...current.readNotificationIds, id],
    }));
  }

  function openDetail(expense: Expense) {
    setDetailExpense(expense);
  }

  function handleMarkPaid(expense: Expense) {
    const paidAt = new Date().toISOString().slice(0, 10);
    onMarkPaid(expense.id, paidAt);
    setDetailExpense(null);
  }

  function openAdd() {
    setForm(emptyForm(todayIso));
    setAddOpen(true);
  }

  const overviewCards = [
    { emoji: "💸", label: "Total Spent", value: formatNpr(monthTotal) },
    { emoji: "📊", label: "Daily Average", value: formatNpr(dailyAverage) },
    { emoji: "🧾", label: "Transactions", value: String(monthExpenses.length) },
    {
      emoji: "💰",
      label: "Remaining Budget",
      value: !budgetLoaded ? "…" : remainingBudget == null ? "No budget linked" : formatNpr(remainingBudget),
      muted: remainingBudget == null && budgetLoaded,
    },
  ] as const;

  return (
    <main
      className={`min-h-screen max-w-[100vw] overflow-x-clip px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.85rem+env(safe-area-inset-top,0px))] text-white sm:px-6 lg:px-8 ${
        light ? "bg-[#06291f]" : "bg-[#020806]"
      }`}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
        <div className="absolute -right-24 top-52 h-80 w-80 rounded-full bg-lime-300/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-3.5 lg:max-w-6xl lg:gap-4">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/finance"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50 backdrop-blur-xl"
          >
            <ArrowLeft size={15} /> Finance
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              className="relative grid min-h-[48px] min-w-[48px] place-items-center rounded-full border border-white/10 bg-white/[0.06] text-emerald-50 backdrop-blur-xl"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus size={18} /> Add Expense
            </button>
          </div>
        </header>

        <section className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/45">FIRE Nepal</p>
          <h1 className="mt-1 text-[1.85rem] font-black tracking-[-0.05em] text-white sm:text-[2.2rem]">
            Expense Command Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-emerald-100/58">
            Track spending, bills, subscriptions and upcoming payments.
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          {overviewCards.map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur-xl sm:p-4"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-100/50">
                <span className="mr-1" aria-hidden>
                  {card.emoji}
                </span>
                {card.label}
              </p>
              <p
                className={`mt-2 text-base font-black tracking-tight sm:text-lg ${
                  "muted" in card && card.muted ? "text-emerald-100/55" : "text-white"
                }`}
              >
                {card.value}
              </p>
            </motion.div>
          ))}
        </section>

        <section className="rounded-[1.65rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">Spending by Category</h2>
              <p className="mt-1 text-xs font-semibold text-emerald-100/45">This month · NPR only</p>
            </div>
            <button type="button" onClick={onOpenLegacyAnalytics} className="text-xs font-black text-lime-200">
              Full analytics
            </button>
          </div>
          {categories.length === 0 ? (
            <p className="py-6 text-center text-sm font-semibold text-emerald-100/55">No spending recorded this month.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div
                className="relative mx-auto grid h-36 w-36 place-items-center rounded-full sm:mx-0 sm:h-40 sm:w-40"
                style={{ background: `conic-gradient(${categoryDonutStops})` }}
                aria-label="Spending by category chart"
              >
                <div className="grid h-[6.6rem] w-[6.6rem] place-items-center rounded-full bg-[#063326] shadow-[inset_0_0_28px_rgba(0,0,0,0.35)] sm:h-[7.35rem] sm:w-[7.35rem]">
                  <div className="text-center">
                    <p className="text-lg font-black tracking-tight text-white sm:text-xl">{formatNpr(monthTotal)}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/55">Spent</p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 space-y-2.5">
                {categories.slice(0, 6).map((item, index) => {
                  const share = monthTotal > 0 ? Math.round((item.total / monthTotal) * 100) : 0;
                  return (
                    <div key={item.category} className="flex min-w-0 items-center gap-3">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg"
                        style={{ backgroundColor: `${DONUT_COLORS[index % DONUT_COLORS.length]}22` }}
                      >
                        {categoryIcon(item.category)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <p className="truncate text-sm font-black text-white">{getFinanceCategoryLabel(item.category)}</p>
                          <p className="shrink-0 text-xs font-black text-lime-100">{share}%</p>
                        </div>
                        <p className="mt-0.5 text-xs font-bold tabular-nums text-emerald-100/60">{formatNpr(item.total)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {upcomingBuckets.length > 0 ? (
          <section className="rounded-[1.65rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-500/20 via-emerald-950/85 to-[#03110d] p-4 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.55)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Upcoming Payments</p>
                <p className="mt-1 text-sm font-semibold text-emerald-100/65">Bills, subscriptions and due items</p>
              </div>
              <span className="rounded-full bg-lime-300/14 px-3 py-1 text-xs font-black text-lime-100">{formatNpr(dueNext7)}</span>
            </div>
            <div className="space-y-3">
              {upcomingBuckets.map((bucket) => (
                <div key={bucket.label}>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100/50">{bucket.label}</p>
                  <div className="space-y-2">
                    {bucket.items.map(({ expense, meta, status }) => {
                      const isRecurring = Boolean(meta?.repeat && meta.repeat !== "Never");
                      const priority =
                        status.tone === "overdue" || status.tone === "today"
                          ? "high"
                          : status.tone === "tomorrow"
                            ? "medium"
                            : "low";
                      return (
                        <button
                          key={expense.id}
                          type="button"
                          onClick={() => openDetail(expense)}
                          className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 text-left transition active:scale-[0.99] sm:px-4"
                        >
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/90 to-lime-300 text-xl">
                            {categoryIcon(expense.category)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-2">
                              <p className="truncate text-sm font-black text-white">{expense.title}</p>
                              <p className="shrink-0 text-sm font-black text-lime-100">{formatNpr(expense.amount)}</p>
                            </div>
                            <p className="mt-0.5 truncate text-xs font-semibold text-emerald-100/55">
                              {getFinanceCategoryLabel(expense.category)} · {status.remainingLabel}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {isRecurring ? (
                                <span className="rounded-full border border-violet-300/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-violet-100">
                                  Recurring
                                </span>
                              ) : null}
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] ${PRIORITY_STYLES[priority]}`}
                              >
                                {priority === "high" ? "Priority" : priority === "medium" ? "Soon" : "Planned"}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="relative overflow-hidden rounded-[1.65rem] border border-lime-300/20 bg-gradient-to-br from-lime-300/16 via-white/[0.055] to-emerald-500/10 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-emerald-950">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-base font-black text-white">Smart Insights</h2>
              <p className="text-xs font-semibold text-emerald-100/55">AI-style signals from your expense data</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {commandInsights.length === 0 ? (
              <p className="text-sm font-semibold text-emerald-100/65">Add expenses to unlock smart insights.</p>
            ) : (
              commandInsights.map((insight) => (
                <div key={insight.id} className={`rounded-2xl border px-3.5 py-3 text-sm font-semibold ${INSIGHT_TONE[insight.tone]}`}>
                  {insight.message}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl">
          <label className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-300/8 px-4">
            <Search size={18} className="shrink-0 text-lime-200" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search expenses, categories, merchant, notes..."
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-emerald-100/35"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setFilter(chip)}
                className={`shrink-0 rounded-full px-3.5 py-2.5 text-xs font-black transition active:scale-[0.98] ${
                  filter === chip
                    ? "bg-gradient-to-r from-emerald-300 to-lime-300 text-emerald-950 shadow-md"
                    : "border border-white/10 bg-white/[0.04] text-emerald-100/70"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">Recent Expenses</h2>
            <span className="text-xs font-bold text-emerald-100/45">{filteredExpenses.length} items</span>
          </div>
          <div className="space-y-3">
            {!hydrated ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-semibold text-emerald-100/50">
                Loading expense workspace...
              </div>
            ) : expenses.length === 0 ? (
              <div className="rounded-[1.75rem] border border-dashed border-emerald-300/25 bg-gradient-to-br from-white/[0.06] via-emerald-400/10 to-lime-300/10 px-6 py-10 text-center backdrop-blur-xl">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.5rem] bg-gradient-to-br from-emerald-300/25 to-lime-300/20 text-4xl shadow-lg shadow-emerald-500/10">
                  🧾
                </div>
                <h3 className="mt-5 text-xl font-black tracking-tight text-white">No expenses recorded yet.</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-relaxed text-emerald-100/55">
                  Start tracking spending to unlock insights, category charts, and upcoming payment alerts.
                </p>
                <button
                  type="button"
                  onClick={openAdd}
                  className="mt-6 inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 px-6 text-base font-black text-emerald-950 shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
                >
                  <Plus size={20} strokeWidth={2.5} /> Add Expense
                </button>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-emerald-300/20 bg-emerald-300/8 p-6 text-center">
                <p className="text-sm font-black text-white">No expenses match this view</p>
                <p className="mt-1 text-xs font-semibold text-emerald-100/55">Try another filter or clear search.</p>
              </div>
            ) : (
              filteredExpenses.map((expense, index) => {
                const meta = metaMap[expense.id];
                const status = getExpenseStatus(expense, meta);
                return (
                  <motion.article
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.28 }}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-3.5 shadow-[0_18px_60px_-34px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-4"
                  >
                    <button type="button" onClick={() => openDetail(expense)} className="w-full min-w-0 text-left">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-300 text-2xl shadow-lg">
                          {categoryIcon(expense.category)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-black text-white">{expense.title}</h3>
                              <p className="mt-0.5 truncate text-xs font-semibold text-emerald-100/55">
                                {getFinanceCategoryLabel(expense.category)}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-black tabular-nums text-lime-100">{formatNpr(expense.amount)}</p>
                              <span
                                className={`mt-1.5 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${STATUS_STYLES[status.tone]}`}
                              >
                                {status.label}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-emerald-100/50">
                            <span>{meta?.paymentMethod ?? "Bank Transfer"}</span>
                            <span aria-hidden>·</span>
                            <span>{formatDisplayDate(expense.date)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">Monthly Trend</h2>
              <p className="mt-1 text-xs font-semibold text-emerald-100/45">NPR-only spending trend</p>
            </div>
            <CalendarDays size={18} className="text-lime-200" />
          </div>
          <ExpenseWorkspaceTrendChart data={trendData} ready={chartsReady} />
        </section>

        <ExpenseWorkspaceCalendar
          expenses={expenses}
          metaMap={metaMap}
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenLegacyHistory}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 text-xs font-black text-emerald-50"
          >
            <FileText size={15} /> Reports & History
          </button>
        </div>
      </div>

      <AnimatePresence>
        {notificationsOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#020806]/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="mx-auto flex h-full max-w-lg flex-col bg-[#04140f]"
            >
              <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top,0px))]">
                <div>
                  <h2 className="text-lg font-black text-white">Notifications</h2>
                  <p className="text-xs font-semibold text-emerald-100/55">Profile notification center</p>
                </div>
                <button type="button" onClick={() => setNotificationsOpen(false)} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06]">
                  <X size={20} />
                </button>
              </header>
              <div className="flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
                {notifications.length === 0 ? (
                  <p className="py-8 text-center text-sm font-semibold text-emerald-100/55">No notifications yet.</p>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((item) => (
                      <NotificationRow
                        key={item.id}
                        item={item}
                        read={uiState.readNotificationIds.includes(item.id)}
                        onOpen={() => {
                          const expense = expenses.find((entry) => entry.id === item.expenseId);
                          if (expense) openDetail(expense);
                          markNotificationRead(item.id);
                          setNotificationsOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {detailExpense ? (
          <ExpenseDetailSheet
            expense={detailExpense}
            meta={metaMap[detailExpense.id]}
            onClose={() => setDetailExpense(null)}
            onEdit={() => {
              onEditExpense(detailExpense);
              setDetailExpense(null);
            }}
            onDelete={() => {
              onDeleteExpense(detailExpense);
              setDetailExpense(null);
            }}
            onDuplicate={() => {
              onDuplicateExpense(detailExpense);
              setDetailExpense(null);
            }}
            onMarkPaid={() => handleMarkPaid(detailExpense)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {addOpen ? (
          <ExpenseAddSheet
            form={form}
            setForm={setForm}
            onClose={() => setAddOpen(false)}
            onSave={() => {
              const amountNpr = Number(form.amount.replace(/[^\d.]/g, "")) || 0;
              if (!form.title.trim() || !amountNpr) return;
              const expenseDate = form.expenseDate || todayIso;
              const repeat = form.repeat ?? "Never";
              const reminderEnabled = repeat !== "Never";
              void Promise.resolve(
                onSubmitWorkspaceExpense({
                  title: form.title.trim(),
                  amountNpr,
                  category: normalizeFinanceCategory(form.category),
                  expenseDate,
                  dueDate: expenseDate,
                  account: DEFAULT_WORKSPACE_ACCOUNT,
                  paymentMethod: DEFAULT_PAYMENT_METHOD,
                  repeat,
                  notes: form.notes,
                  reminderEnabled,
                  reminderTiming: DEFAULT_REMINDER_TIMING,
                  reminderTime: DEFAULT_REMINDER_TIME,
                  reminderEmail: false,
                }),
              )
                .then(() => {
                  setAddOpen(false);
                  setForm(emptyForm(todayIso));
                })
                .catch(() => {
                  /* Parent shows the Supabase error toast. */
                });
            }}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function NotificationRow({
  item,
  read,
  onOpen,
}: {
  item: ExpenseWorkspaceNotification;
  read: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
        read ? "border-white/8 bg-white/[0.03]" : "border-emerald-300/20 bg-emerald-400/10"
      }`}
    >
      <span className="text-lg">{NOTIFICATION_DOT[item.tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">{item.message}</p>
        <p className="mt-1 text-xs font-semibold text-emerald-100/55">
          {formatNpr(item.amountNpr)} · Due {formatDisplayDate(item.dueDate)}
        </p>
      </div>
    </button>
  );
}

function ExpenseDetailSheet({
  expense,
  meta,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onMarkPaid,
}: {
  expense: Expense;
  meta?: ExpenseWorkspaceMeta;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMarkPaid: () => void;
}) {
  const status = getExpenseStatus(expense, meta);
  const dueDate = getDueDate(expense, meta);
  const reminderSummary = formatExpenseRepeatReminder(meta?.repeat, expense.date);
  const repeatLabel =
    meta?.repeat === "Never" || !meta?.repeat
      ? "None"
      : meta.repeat;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#020806]/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 28 }}
        className="mx-auto flex h-full max-w-lg flex-col overflow-hidden bg-[#04140f]"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
          <button type="button" onClick={onClose} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06]">
            <X size={20} />
          </button>
          <h2 className="text-lg font-black">Expense Details</h2>
          <button type="button" onClick={onEdit} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06]">
            <Pencil size={18} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl">{categoryIcon(expense.category)}</p>
                <h3 className="mt-2 text-xl font-black text-white">{expense.title}</h3>
                <p className="mt-1 text-sm font-semibold text-emerald-100/55">{getFinanceCategoryLabel(expense.category)}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${STATUS_STYLES[status.tone]}`}>
                {status.label}
              </span>
            </div>
            <p className="mt-4 text-3xl font-black text-lime-100">{formatNpr(expense.amount)}</p>
          </div>

          <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Timeline</p>
            <div className="mt-3 space-y-3">
              {[
                ["Expense Date", formatDisplayDate(expense.date)],
                ["Due Date", formatDisplayDate(dueDate)],
                ["Remaining", status.remainingLabel],
                ["Account", meta?.account ?? "Personal"],
                ["Payment Method", meta?.paymentMethod ?? "Bank Transfer"],
                ["Repeat", repeatLabel],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2.5">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/45">{label}</span>
                  <span className="text-sm font-bold text-emerald-50">{value}</span>
                </div>
              ))}
            </div>
          </section>

          {reminderSummary ? (
            <section className="mt-4 rounded-[1.5rem] border border-lime-300/25 bg-gradient-to-br from-emerald-400/14 to-lime-300/10 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Repeat / Reminder</p>
              <p className="mt-3 text-sm font-black text-white">🔔 Reminder: {reminderSummary}</p>
            </section>
          ) : null}

          <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Reminder History</p>
            <div className="mt-3 space-y-2">
              {(meta?.reminderHistory ?? []).length === 0 ? (
                <p className="text-sm font-semibold text-emerald-100/55">No reminder events yet.</p>
              ) : (
                meta?.reminderHistory?.map((entry, index) => (
                  <div key={`${entry.date}-${index}`} className="rounded-xl bg-black/15 px-3 py-2 text-sm font-semibold text-emerald-50">
                    {entry.type} · {formatDisplayDate(entry.date)}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Payment History</p>
            <div className="mt-3 space-y-2">
              {meta?.paidAt ? (
                <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-50">
                  Paid on {formatDisplayDate(meta.paidAt)} · {formatNpr(expense.amount)}
                </div>
              ) : (
                <p className="text-sm font-semibold text-emerald-100/55">No payment recorded yet.</p>
              )}
            </div>
          </section>

          {expense.receiptImage ? (
            <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Attachment</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={expense.receiptImage} alt="Receipt attachment" className="max-h-56 w-full rounded-2xl object-cover" />
            </section>
          ) : null}

          <section className="mt-4 rounded-[1.5rem] border border-lime-300/20 bg-gradient-to-br from-emerald-400/12 to-lime-300/8 p-4">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-lime-200" />
              <p className="text-sm font-black text-white">Email Reminder Preview</p>
            </div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-[#03110d] p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-lime-200">Expense Reminder</p>
              <p className="mt-2 text-sm font-bold text-white">{expense.title}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-100/65">{formatNpr(expense.amount)}</p>
              <p className="mt-1 text-sm font-semibold text-emerald-100/65">Due {formatDisplayDate(dueDate)} · {status.remainingLabel}</p>
              <button type="button" className="mt-4 w-full rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 py-3 text-sm font-black text-emerald-950">
                Open FIRE Nepal
              </button>
            </div>
          </section>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {!meta?.paidAt ? (
              <button type="button" onClick={onMarkPaid} className="col-span-2 min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-sm font-black text-emerald-950">
                Mark Paid
              </button>
            ) : null}
            <button type="button" onClick={onDuplicate} className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-emerald-50">
              <Copy size={15} className="mr-1 inline" /> Duplicate
            </button>
            <button type="button" onClick={onDelete} className="min-h-[48px] rounded-2xl border border-red-300/20 bg-red-500/10 text-sm font-black text-red-100">
              <Trash2 size={15} className="mr-1 inline" /> Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ExpenseAddSheet({
  form,
  setForm,
  onClose,
  onSave,
}: {
  form: WorkspaceForm;
  setForm: Dispatch<SetStateAction<WorkspaceForm>>;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-[#020806]/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 28 }}
        className="mx-auto flex h-full max-w-lg flex-col overflow-hidden bg-[#04140f]"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
          <button type="button" onClick={onClose} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06]">
            <X size={20} />
          </button>
          <h2 className="text-lg font-black">Add Expense</h2>
          <button type="button" onClick={onSave} className="rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 py-2 text-sm font-black text-emerald-950">
            Save
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          <div className="space-y-5">
            <Field label="Expense Name">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base font-bold text-white outline-none"
                placeholder="Internet Bill"
              />
            </Field>
            <FinanceCategoryPicker
              value={form.category}
              onChange={(category) => setForm((current) => ({ ...current, category }))}
              heading="Category"
            />
            <Field label="Amount (NPR only)">
              <div className="flex min-h-[58px] items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4">
                <span className="mr-2 text-lg font-black text-lime-200">NPR</span>
                <input
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  inputMode="numeric"
                  className="min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none"
                  placeholder="1,200"
                />
              </div>
            </Field>
            <Field label="Expense Date">
              <input
                type="date"
                value={form.expenseDate}
                onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
                className="min-h-[48px] w-full max-w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
              />
            </Field>
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Repeat / Reminder (Optional)</p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {REPEAT_OPTIONS.map((option) => {
                  const selected = form.repeat === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, repeat: option.id }))}
                      className={`min-h-[44px] rounded-2xl border px-2 text-xs font-black transition active:scale-[0.98] sm:text-sm ${
                        selected
                          ? "border-lime-300/60 bg-gradient-to-r from-emerald-300/25 to-lime-300/20 text-white shadow-[0_0_24px_rgba(190,242,100,0.12)]"
                          : "border-white/10 bg-white/[0.04] text-emerald-100/70"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {form.repeat !== "Never" ? (
                <div className="mt-3 rounded-2xl border border-lime-300/25 bg-gradient-to-br from-emerald-400/12 to-lime-300/10 px-3.5 py-3">
                  <p className="text-sm font-black text-white">
                    🔔 Reminder: {formatExpenseRepeatReminder(form.repeat, form.expenseDate) ?? "Scheduled"}
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs font-semibold text-emerald-100/50">No reminder.</p>
              )}
            </section>
            <Field label="Notes (Optional)">
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white outline-none"
                placeholder="Optional notes"
              />
            </Field>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">{label}</p>
      {children}
    </section>
  );
}
