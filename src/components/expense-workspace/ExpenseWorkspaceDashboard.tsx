"use client";

import {
  ArrowLeft,
  Bell,
  Bot,
  CalendarDays,
  Check,
  Copy,
  CreditCard,
  FileText,
  Mail,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ExpenseWorkspaceCalendar } from "@/components/expense-workspace/ExpenseWorkspaceCalendar";
import { FinanceCategoryPicker } from "@/components/finance/FinanceCategoryPicker";
import {
  buildNotifications,
  buildUpcomingBuckets,
  categoryBreakdown,
  categoryIcon,
  formatDisplayDate,
  formatNpr,
  getDueDate,
  getExpenseStatus,
  largestExpense,
  matchesFilter,
  matchesSearch,
  monthSpending,
  NOTIFICATION_DOT,
  recurringExpenses,
  sortByDueDate,
  STATUS_STYLES,
  upcomingPaymentsTotal,
  type ExpenseFilter,
} from "@/components/expense-workspace/expense-workspace-utils";
import { generateAiInsights } from "@/lib/expense-ai-insights";
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

const FILTERS: ExpenseFilter[] = [
  "All",
  "Today",
  "Tomorrow",
  "Upcoming",
  "This Week",
  "This Month",
  "Recurring",
  "Completed",
  "Overdue",
];

const REPEAT_OPTIONS: ExpenseRepeat[] = ["Never", "Weekly", "Monthly", "Yearly"];
const REMINDER_OPTIONS: ExpenseReminderTiming[] = ["On Due Date", "1 Day Before", "3 Days Before", "7 Days Before", "Custom"];
const ACCOUNTS = ["Personal", "Savings", "Cash", "Bank"];
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Card", "Wallet", "UPI"];

type WorkspaceForm = {
  title: string;
  amount: string;
  category: string;
  account: string;
  paymentMethod: string;
  expenseDate: string;
  dueDate: string;
  repeat: ExpenseRepeat;
  notes: string;
  reminderEnabled: boolean;
  reminderTiming: ExpenseReminderTiming;
  /** HH:mm — native time input; default 09:00 AM */
  reminderTime: string;
  reminderEmail: boolean;
};

function emptyForm(today: string): WorkspaceForm {
  return {
    title: "",
    amount: "",
    category: DEFAULT_FINANCE_CATEGORY_ID,
    account: "Personal",
    paymentMethod: "Bank Transfer",
    expenseDate: today,
    dueDate: today,
    repeat: "Never",
    notes: "",
    reminderEnabled: true,
    reminderTiming: "1 Day Before",
    reminderTime: "09:00",
    reminderEmail: true,
  };
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
        checked ? "border-emerald-300/50 bg-emerald-400/15" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span className="text-sm font-bold text-emerald-50">{label}</span>
      <span className={`relative h-8 w-14 rounded-full p-1 transition ${checked ? "bg-emerald-400" : "bg-white/18"}`}>
        <span className={`block h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

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

  const metaMap = uiState.meta;
  const notifications = useMemo(() => buildNotifications(expenses, metaMap), [expenses, metaMap]);
  const unreadCount = notifications.filter((item) => !uiState.readNotificationIds.includes(item.id)).length;

  const filteredExpenses = useMemo(() => {
    const list = sortByDueDate(expenses, metaMap).filter(
      (expense) => matchesFilter(expense, metaMap[expense.id], filter) && matchesSearch(expense, metaMap[expense.id], search),
    );
    return list;
  }, [expenses, metaMap, filter, search]);

  const upcomingBuckets = useMemo(() => buildUpcomingBuckets(expenses, metaMap), [expenses, metaMap]);
  const monthTotal = useMemo(() => monthSpending(expenses, selectedMonthKey), [expenses, selectedMonthKey]);
  const categories = useMemo(() => categoryBreakdown(expenses.filter((e) => e.date.startsWith(selectedMonthKey))), [expenses, selectedMonthKey]);
  const dueNext7 = useMemo(() => upcomingPaymentsTotal(expenses, metaMap, 7), [expenses, metaMap]);
  const topExpense = useMemo(() => largestExpense(expenses.filter((e) => e.date.startsWith(selectedMonthKey))), [expenses, selectedMonthKey]);
  const recurring = useMemo(() => recurringExpenses(expenses, metaMap), [expenses, metaMap]);
  const insights = useMemo(
    () => generateAiInsights(expenses, members, selectedMonthKey, "NPR", profiles).slice(0, 4),
    [expenses, members, selectedMonthKey, profiles],
  );

  const trendData = useMemo(() => {
    const comparison = monthlyComparisonData(expenses, "NPR", 6);
    return comparison.labels.map((month, index) => ({
      month,
      spent: comparison.data[index] ?? 0,
    }));
  }, [expenses]);

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

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 lg:max-w-6xl">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/finance"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50 backdrop-blur-xl"
            >
              <ArrowLeft size={15} /> Finance
            </Link>
            <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-white sm:text-[2.35rem]">Expense Workspace</h1>
            <p className="mt-1 max-w-xl text-sm font-semibold leading-relaxed text-emerald-100/58">
              Track expenses, bills, reminders and upcoming payments.
            </p>
          </div>
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
              onClick={() => {
                setForm(emptyForm(todayIso));
                setAddOpen(true);
              }}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              <Plus size={18} /> Add
            </button>
          </div>
        </header>

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
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-black transition active:scale-[0.98] ${
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

        {upcomingBuckets.length > 0 ? (
          <section className="rounded-[1.65rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-500/20 via-emerald-950/85 to-[#03110d] p-4 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.55)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Upcoming Payments</p>
                <p className="mt-1 text-sm font-semibold text-emerald-100/65">Tap any item to open details</p>
              </div>
              <span className="rounded-full bg-lime-300/14 px-3 py-1 text-xs font-black text-lime-100">{formatNpr(dueNext7)}</span>
            </div>
            <div className="space-y-3">
              {upcomingBuckets.map((bucket) => (
                <div key={bucket.label}>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-100/50">{bucket.label}</p>
                  <div className="space-y-2">
                    {bucket.items.map(({ expense, status }) => (
                      <button
                        key={expense.id}
                        type="button"
                        onClick={() => openDetail(expense)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-left transition active:scale-[0.99]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {categoryIcon(expense.category)} {expense.title}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-emerald-100/50">{status.remainingLabel}</p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-lime-100">{formatNpr(expense.amount)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">Expenses</h2>
            <span className="text-xs font-bold text-emerald-100/45">{filteredExpenses.length} items</span>
          </div>
          <div className="space-y-3">
            {!hydrated ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 text-center text-sm font-semibold text-emerald-100/50">
                Loading expense workspace...
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-emerald-300/20 bg-emerald-300/8 p-6 text-center">
                <p className="text-sm font-black text-white">No expenses match this view</p>
                <p className="mt-1 text-xs font-semibold text-emerald-100/55">Add an expense or change your filters.</p>
              </div>
            ) : (
              filteredExpenses.map((expense, index) => {
                const meta = metaMap[expense.id];
                const status = getExpenseStatus(expense, meta);
                const dueDate = getDueDate(expense, meta);
                return (
                  <motion.article
                    key={expense.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_18px_60px_-34px_rgba(0,0,0,0.8)] backdrop-blur-xl"
                  >
                    <button type="button" onClick={() => openDetail(expense)} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400 to-lime-300 text-2xl shadow-lg">
                            {categoryIcon(expense.category)}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-black text-white">{expense.title}</h3>
                            <p className="mt-0.5 truncate text-xs font-semibold text-emerald-100/55">
                              {expense.notes?.trim() || getFinanceCategoryLabel(expense.category)}
                            </p>
                            <p className="mt-1 text-[11px] font-bold text-emerald-100/45">
                              {meta?.account ?? "Personal"} · {meta?.paymentMethod ?? "Bank Transfer"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-lime-100">{formatNpr(expense.amount)}</p>
                          <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${STATUS_STYLES[status.tone]}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="rounded-xl border border-white/8 bg-black/15 p-2.5">
                          <p className="font-black uppercase tracking-[0.12em] text-emerald-100/45">Expense Date</p>
                          <p className="mt-1 font-bold text-emerald-50">{formatDisplayDate(expense.date)}</p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/15 p-2.5">
                          <p className="font-black uppercase tracking-[0.12em] text-emerald-100/45">Due Date</p>
                          <p className="mt-1 font-bold text-emerald-50">{formatDisplayDate(dueDate)}</p>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-black/15 p-2.5">
                          <p className="font-black uppercase tracking-[0.12em] text-emerald-100/45">Remaining</p>
                          <p className="mt-1 font-bold text-emerald-50">{status.remainingLabel}</p>
                        </div>
                      </div>
                    </button>
                  </motion.article>
                );
              })
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[1.65rem] border border-lime-300/20 bg-gradient-to-br from-lime-300/16 via-white/[0.055] to-emerald-500/10 p-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-emerald-950">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-base font-black text-white">🔥 FIRE AI Insights</h2>
              <p className="text-xs font-semibold text-emerald-100/55">Based on your existing expense data only</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {insights.length === 0 ? (
              <p className="text-sm font-semibold text-emerald-100/65">Add expenses to unlock AI insights.</p>
            ) : (
              insights.map((insight) => (
                <div key={insight.id} className="rounded-2xl border border-white/10 bg-black/18 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-lime-200">{insight.title}</p>
                  <p className="mt-1 text-sm font-semibold leading-relaxed text-emerald-50">{insight.message}</p>
                  {insight.metric ? <p className="mt-2 text-sm font-black text-lime-100">{insight.metric}</p> : null}
                </div>
              ))
            )}
            {dueNext7 > 0 ? (
              <div className="rounded-2xl border border-sky-300/20 bg-sky-500/10 p-3">
                <p className="text-sm font-semibold text-sky-100">You have {formatNpr(dueNext7)} due in the next 7 days.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Monthly Spending", value: formatNpr(monthTotal), hint: "Current month total" },
            { label: "Upcoming Payments", value: formatNpr(dueNext7), hint: "Due in next 7 days" },
            { label: "Recurring Expenses", value: String(recurring.length), hint: "Active repeat schedules" },
            { label: "Largest Expense", value: topExpense ? formatNpr(topExpense.amount) : "—", hint: topExpense?.title ?? "No data yet" },
            { label: "Categories", value: String(categories.length), hint: "Tracked this month" },
            { label: "Remaining Budget", value: "—", hint: "Connect Budget module for live utilization" },
          ].map((tile) => (
            <div key={tile.label} className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">{tile.label}</p>
              <p className="mt-3 text-xl font-black tracking-tight text-white">{tile.value}</p>
              <p className="mt-1 text-xs font-semibold text-emerald-100/50">{tile.hint}</p>
            </div>
          ))}
        </section>

        <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">Category Breakdown</h2>
            <button type="button" onClick={onOpenLegacyAnalytics} className="text-xs font-black text-lime-200">
              Full analytics
            </button>
          </div>
          <div className="space-y-3">
            {categories.slice(0, 6).map((item) => {
              const share = monthTotal > 0 ? Math.round((item.total / monthTotal) * 100) : 0;
              return (
                <div key={item.category}>
                  <div className="mb-1.5 flex items-center justify-between text-xs font-black">
                    <span className="text-emerald-50">
                      {categoryIcon(item.category)} {item.category}
                    </span>
                    <span className="text-lime-100">{formatNpr(item.total)} · {share}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
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
              void Promise.resolve(
                onSubmitWorkspaceExpense({
                  title: form.title.trim(),
                  amountNpr,
                  category: normalizeFinanceCategory(form.category),
                  expenseDate: form.expenseDate,
                  dueDate: form.dueDate,
                  account: form.account,
                  paymentMethod: form.paymentMethod,
                  repeat: form.repeat,
                  notes: form.notes,
                  reminderEnabled: form.reminderEnabled,
                  reminderTiming: form.reminderTiming,
                  reminderTime: form.reminderTime,
                  reminderEmail: form.reminderEmail,
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
                ["Repeat", meta?.repeat ?? "Never"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2.5">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/45">{label}</span>
                  <span className="text-sm font-bold text-emerald-50">{value}</span>
                </div>
              ))}
            </div>
          </section>

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
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          <div className="space-y-4">
            <Field label="Expense Name">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base font-bold text-white outline-none"
                placeholder="Internet Bill"
              />
            </Field>
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
            <FinanceCategoryPicker
              value={form.category}
              onChange={(category) => setForm((current) => ({ ...current, category }))}
              heading="Category"
            />
            <Field label="Account">
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNTS.map((account) => (
                  <button
                    key={account}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, account }))}
                    className={`min-h-[44px] rounded-2xl border px-3 text-sm font-black ${
                      form.account === account ? "border-lime-300/60 bg-lime-300/18 text-white" : "border-white/10 bg-white/[0.04] text-emerald-100/75"
                    }`}
                  >
                    <Wallet size={14} className="mr-1 inline" />
                    {account}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Payment Method">
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, paymentMethod: method }))}
                    className={`min-h-[44px] rounded-2xl border px-3 text-sm font-black ${
                      form.paymentMethod === method ? "border-lime-300/60 bg-lime-300/18 text-white" : "border-white/10 bg-white/[0.04] text-emerald-100/75"
                    }`}
                  >
                    <CreditCard size={14} className="mr-1 inline" />
                    {method}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expense Date">
                <input
                  type="date"
                  value={form.expenseDate}
                  onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))}
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none"
                />
              </Field>
              <Field label="Due Date">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none"
                />
              </Field>
            </div>
            <Field label="Repeat">
              <div className="grid grid-cols-2 gap-2">
                {REPEAT_OPTIONS.map((repeat) => (
                  <button
                    key={repeat}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, repeat }))}
                    className={`min-h-[44px] rounded-2xl border px-3 text-sm font-black ${
                      form.repeat === repeat ? "border-lime-300/60 bg-lime-300/18 text-white" : "border-white/10 bg-white/[0.04] text-emerald-100/75"
                    }`}
                  >
                    {repeat}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Notes">
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white outline-none"
                placeholder="Optional notes"
              />
            </Field>
            <Field label="Attachment">
              <div className="rounded-2xl border border-dashed border-emerald-300/20 bg-emerald-300/8 p-4">
                <p className="text-sm font-semibold text-emerald-100/65">Attach receipts from the expense editor after saving.</p>
              </div>
            </Field>
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Bot size={16} className="text-lime-200" />
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Reminder Settings</p>
              </div>
              <div className="space-y-2">
                <ToggleSwitch
                  label="Enable reminder"
                  checked={form.reminderEnabled}
                  onChange={() => setForm((current) => ({ ...current, reminderEnabled: !current.reminderEnabled }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  {REMINDER_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, reminderTiming: option }))}
                      className={`min-h-[44px] rounded-2xl border px-3 text-xs font-black ${
                        form.reminderTiming === option ? "border-lime-300/60 bg-lime-300/18 text-white" : "border-white/10 bg-white/[0.04] text-emerald-100/75"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Reminder Time</p>
                  <input
                    type="time"
                    lang="en-US"
                    step={60}
                    value={form.reminderTime}
                    onChange={(event) => {
                      const next = event.target.value || "09:00";
                      setForm((current) => ({ ...current, reminderTime: next.slice(0, 5) }));
                    }}
                    className="min-h-[48px] w-full rounded-2xl border border-white/10 bg-black/20 px-3 text-sm font-bold text-white outline-none [color-scheme:dark]"
                    aria-describedby="expense-reminder-time-help"
                  />
                  <p id="expense-reminder-time-help" className="text-xs font-semibold text-emerald-100/65">
                    Your reminder will be sent at the selected time.
                  </p>
                </div>
                <ToggleSwitch
                  label="Send email reminder"
                  checked={form.reminderEmail}
                  onChange={() => setForm((current) => ({ ...current, reminderEmail: !current.reminderEmail }))}
                />
              </div>
            </section>
            <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Notification System</p>
              <div className="mt-3 space-y-2">
                {["Send In-App Notification", "Show Profile Notification", "Show Dashboard Notification", "Show Notification Badge"].map((label) => (
                  <div key={label} className="flex items-center gap-2 rounded-xl bg-black/15 px-3 py-2 text-sm font-semibold text-emerald-50">
                    <Check size={14} className="text-lime-300" /> {label}
                  </div>
                ))}
              </div>
            </section>
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
