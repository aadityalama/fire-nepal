"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Bot,
  ChevronRight,
  PiggyBank,
  ReceiptText,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CashflowDerivedMetrics } from "@/components/cashflow/hooks/useCashflowPersistedState";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import { CashflowWorkspaceCalendar } from "@/components/cashflow-workspace/CashflowWorkspaceCalendar";
import {
  buildCashflowTrendData,
  buildCashflowWorkspaceInsights,
  buildTodaySummary,
  buildUpcomingPayments,
  formatShortDate,
  monthlyProgressPercent,
  type CashflowWorkspaceInsight,
} from "@/components/cashflow-workspace/cashflow-workspace-utils";
import {
  buildNotifications,
  formatNpr,
  NOTIFICATION_DOT,
  STATUS_STYLES,
  upcomingPaymentsTotal,
} from "@/components/expense-workspace/expense-workspace-utils";
import type { FinancialIntelligenceModel } from "@/components/financial-intelligence";
import type { FinancialIntelMonthRollup } from "@/components/financial-intelligence/monthly-rollup-storage";
import { loadDashboardState } from "@/lib/expense-storage";
import {
  loadExpenseWorkspaceUiState,
  saveExpenseWorkspaceUiState,
  type ExpenseWorkspaceNotification,
} from "@/lib/expense-workspace-ui";
import { formatMoney } from "@/lib/expense-utils";
import { useProductAuth } from "@/contexts/ProductAuthContext";

const CashflowNetTrendChart = dynamic(
  () => import("@/components/cashflow-workspace/CashflowNetTrendChart").then((mod) => mod.CashflowNetTrendChart),
  { ssr: false, loading: () => null },
);

type CashflowWorkspaceDashboardProps = {
  state: CashflowDashboardState;
  metrics: CashflowDerivedMetrics;
  intelModel: FinancialIntelligenceModel;
  intelRollups: FinancialIntelMonthRollup[];
  hydrated: boolean;
};

const glassCardClassName = "rounded-[1.5rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl sm:rounded-[1.65rem]";

function KpiCard({
  label,
  value,
  hint,
  tone = "emerald",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "emerald" | "lime" | "rose" | "amber" | "cyan";
}) {
  const toneClass =
    tone === "rose"
      ? "text-rose-200"
      : tone === "lime"
        ? "text-lime-200"
        : tone === "amber"
          ? "text-amber-200"
          : tone === "cyan"
            ? "text-cyan-200"
            : "text-emerald-100";

  return (
    <div className={`${glassCardClassName} min-h-[92px] p-3.5 sm:p-4`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{label}</p>
      <p className={`mt-2 truncate text-[1.35rem] font-black leading-none tracking-[-0.05em] tabular-nums sm:text-2xl ${toneClass}`}>
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[10px] font-bold text-emerald-100/40">{hint}</p> : null}
    </div>
  );
}

function InsightCard({ insight }: { insight: CashflowWorkspaceInsight }) {
  const toneClass =
    insight.tone === "positive"
      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-50"
      : insight.tone === "warning"
        ? "border-amber-300/25 bg-amber-400/10 text-amber-50"
        : insight.tone === "info"
          ? "border-sky-300/25 bg-sky-500/10 text-sky-50"
          : "border-white/10 bg-white/[0.04] text-emerald-50";

  return (
    <div className={`rounded-2xl border px-4 py-3.5 text-sm font-semibold leading-relaxed ${toneClass}`}>
      {insight.message}
    </div>
  );
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: ExpenseWorkspaceNotification;
  onMarkRead: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onMarkRead(item.id)}
      className="flex w-full items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left transition active:scale-[0.99]"
    >
      <span className="mt-0.5 text-base">{NOTIFICATION_DOT[item.tone]}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">{item.title}</span>
        <span className="mt-0.5 block text-xs font-semibold text-emerald-100/55">{item.message}</span>
        <span className="mt-1 block text-[11px] font-bold text-lime-100/70">
          {formatNpr(item.amountNpr)} · Due {formatShortDate(item.dueDate)}
        </span>
      </span>
    </button>
  );
}

export function CashflowWorkspaceDashboard({
  metrics,
  intelModel,
  intelRollups,
  hydrated,
}: CashflowWorkspaceDashboardProps) {
  const { user } = useProductAuth();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [expenseDataVersion, setExpenseDataVersion] = useState(0);
  const [uiState, setUiState] = useState(() => loadExpenseWorkspaceUiState());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayIso);
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    saveExpenseWorkspaceUiState(uiState);
  }, [uiState]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === "fire-nepal-expense-dashboard-v2" ||
        event.key === "fire-nepal-expense-workspace-ui-v1"
      ) {
        setExpenseDataVersion((v) => v + 1);
        setUiState(loadExpenseWorkspaceUiState());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setChartsReady(true), 480);
    return () => window.clearTimeout(id);
  }, []);

  const expenseState = useMemo(() => {
    void expenseDataVersion;
    return loadDashboardState();
  }, [expenseDataVersion, hydrated]);

  const expenses = expenseState?.expenses ?? [];
  const metaMap = uiState.meta;

  const notifications = useMemo(() => buildNotifications(expenses, metaMap), [expenses, metaMap]);
  const unreadCount = notifications.filter((item) => !uiState.readNotificationIds.includes(item.id)).length;

  const todaySummary = useMemo(() => buildTodaySummary(expenses, todayIso), [expenses, todayIso]);
  const upcomingPayments = useMemo(() => buildUpcomingPayments(expenses, metaMap), [expenses, metaMap]);
  const dueNext7 = useMemo(() => upcomingPaymentsTotal(expenses, metaMap, 7), [expenses, metaMap]);
  const insights = useMemo(
    () =>
      buildCashflowWorkspaceInsights({
        metrics,
        intelModel,
        intelRollups,
        expenses,
        metaMap,
      }),
    [metrics, intelModel, intelRollups, expenses, metaMap],
  );
  const trendData = useMemo(() => buildCashflowTrendData(intelRollups), [intelRollups]);

  const {
    totalIncome,
    monthlyBurn: burn,
    savingsRatePct: sr,
    investableCashflow: netCashflow,
  } = metrics;

  const progressPct = monthlyProgressPercent();
  const displayName = user?.email?.split("@")[0] ?? "there";

  function markNotificationRead(id: string) {
    setUiState((current) => ({
      ...current,
      readNotificationIds: current.readNotificationIds.includes(id)
        ? current.readNotificationIds
        : [...current.readNotificationIds, id],
    }));
  }

  function markAllNotificationsRead() {
    setUiState((current) => ({
      ...current,
      readNotificationIds: notifications.map((item) => item.id),
    }));
  }

  return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#020806] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.85rem+env(safe-area-inset-top,0px))] text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
        <div className="absolute -right-24 top-52 h-80 w-80 rounded-full bg-lime-300/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-4 lg:max-w-6xl lg:gap-5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href="/finance"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs font-black text-emerald-50 backdrop-blur-xl transition active:scale-95"
            >
              <ArrowLeft size={15} /> Finance
            </Link>
            <h1 className="mt-3 text-[2rem] font-black tracking-[-0.05em] text-white sm:text-[2.35rem] lg:text-5xl">
              Cashflow Workspace
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-emerald-100/58 sm:text-[0.95rem]">
              Track your income, expenses, budget and monthly cashflow in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotificationsOpen(true)}
            className="relative grid min-h-[48px] min-w-[48px] shrink-0 touch-manipulation place-items-center rounded-full border border-white/10 bg-white/[0.06] text-emerald-50 backdrop-blur-xl transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : notifications.length > 0 ? (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            ) : null}
          </button>
        </header>

        <section className="relative overflow-hidden rounded-[1.65rem] border border-emerald-200/15 bg-gradient-to-br from-emerald-500/20 via-emerald-950/85 to-[#03110d] p-4 shadow-[0_24px_80px_-40px_rgba(16,185,129,0.55)] sm:p-5 lg:p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(163,230,53,0.18),transparent_32%)]" />
          <div className="relative">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Net Cashflow</p>
            <p className="mt-3 text-[2.2rem] font-black leading-none tracking-[-0.07em] text-white sm:text-[2.6rem] lg:text-[3rem]">
              {netCashflow >= 0 ? "+" : ""}
              {formatMoney(netCashflow, "NPR")}
            </p>
            <p className="mt-2 text-sm font-semibold text-emerald-100/60">
              Monthly surplus after burn · {sr === null ? "Add income to unlock savings rate" : `${sr.toFixed(1)}% savings rate`}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Monthly Income</p>
                <p className="mt-1 text-sm font-black tabular-nums text-lime-100 sm:text-base">{formatMoney(totalIncome, "NPR")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Monthly Expense</p>
                <p className="mt-1 text-sm font-black tabular-nums text-rose-100 sm:text-base">{formatMoney(burn, "NPR")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Remaining Balance</p>
                <p className="mt-1 text-sm font-black tabular-nums text-emerald-50 sm:text-base">{formatMoney(Math.max(netCashflow, 0), "NPR")}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Savings Rate</p>
                <p className="mt-1 text-sm font-black tabular-nums text-cyan-100 sm:text-base">{sr === null ? "—" : `${sr.toFixed(1)}%`}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">Burn Rate</p>
                <p className="mt-1 text-sm font-black tabular-nums text-orange-100 sm:text-base">{formatMoney(burn, "NPR")}/mo</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Monthly Progress</p>
                <span className="text-xs font-black text-lime-100">{progressPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Cashflow trend</p>
              <CashflowNetTrendChart data={trendData} ready={chartsReady && hydrated} />
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/expense-dashboard?finance=personal&view=expenses"
            className="group relative min-h-[132px] touch-manipulation overflow-hidden rounded-[1.5rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-400/25 via-emerald-900/70 to-[#041510] p-4 shadow-[0_20px_60px_-30px_rgba(16,185,129,0.55)] transition active:scale-[0.985] sm:rounded-[1.65rem] sm:p-5"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-lime-300/20 blur-2xl transition group-hover:scale-110" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300/15 text-emerald-100 ring-1 ring-white/10">
                  <ReceiptText size={22} />
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-100/50 transition group-hover:translate-x-0.5" />
              </div>
              <div>
                <p className="text-xl font-black tracking-[-0.04em] text-white">Expense</p>
                <p className="mt-1 text-sm font-semibold text-emerald-100/60">Track and manage expenses.</p>
              </div>
            </div>
          </Link>

          <Link
            href="/budget"
            className="group relative min-h-[132px] touch-manipulation overflow-hidden rounded-[1.5rem] border border-teal-300/20 bg-gradient-to-br from-teal-400/20 via-emerald-950/75 to-[#031018] p-4 shadow-[0_20px_60px_-30px_rgba(45,212,191,0.45)] transition active:scale-[0.985] sm:rounded-[1.65rem] sm:p-5"
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-teal-300/15 blur-2xl transition group-hover:scale-110" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-300/15 text-teal-100 ring-1 ring-white/10">
                  <PiggyBank size={22} />
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-100/50 transition group-hover:translate-x-0.5" />
              </div>
              <div>
                <p className="text-xl font-black tracking-[-0.04em] text-white">Budget</p>
                <p className="mt-1 text-sm font-semibold text-emerald-100/60">Plan and manage monthly budgets.</p>
              </div>
            </div>
          </Link>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Today&apos;s Summary</p>
              <p className="mt-1 text-sm font-semibold text-emerald-100/55">Live view for {displayName}</p>
            </div>
            <Wallet className="h-5 w-5 text-emerald-300" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
            <KpiCard label="Income Today" value={formatNpr(todaySummary.incomeTodayNpr)} hint="Payroll & recorded inflows" tone="lime" />
            <KpiCard label="Expense Today" value={formatNpr(todaySummary.expenseTodayNpr)} hint="Transactions dated today" tone="rose" />
            <KpiCard
              label="Net Today"
              value={`${todaySummary.netTodayNpr >= 0 ? "+" : ""}${formatNpr(Math.abs(todaySummary.netTodayNpr))}`}
              hint="Income minus expense today"
              tone={todaySummary.netTodayNpr >= 0 ? "emerald" : "rose"}
            />
            <KpiCard label="Transactions Today" value={String(todaySummary.transactionsToday)} hint="Expenses + payroll events" tone="cyan" />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-5">
          <section className={`${glassCardClassName} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Upcoming Payments</p>
                <p className="mt-1 text-sm font-semibold text-emerald-100/60">Tap any item to open expense</p>
              </div>
              {dueNext7 > 0 ? (
                <span className="rounded-full bg-lime-300/14 px-3 py-1 text-xs font-black text-lime-100">{formatNpr(dueNext7)}</span>
              ) : null}
            </div>

            {upcomingPayments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center">
                <p className="text-sm font-black text-white">No upcoming payments</p>
                <p className="mt-1 text-xs font-semibold text-emerald-100/50">Add expenses with due dates in the Expense workspace.</p>
                <Link
                  href="/expense-dashboard?finance=personal&view=expenses"
                  className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 text-sm font-black text-emerald-950"
                >
                  Open Expense
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingPayments.map((payment) => (
                  <Link
                    key={payment.expense.id}
                    href="/expense-dashboard?finance=personal&view=expenses"
                    className="flex touch-manipulation items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 transition active:scale-[0.99] hover:bg-white/[0.07]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{payment.expense.title}</p>
                      <p className="mt-1 text-xs font-semibold text-emerald-100/50">
                        Expense {payment.expenseDateLabel} · Due {payment.dueDateLabel}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-lime-100">{formatNpr(payment.expense.amount)}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[payment.tone]}`}>
                        {payment.remainingLabel}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className={`${glassCardClassName} p-4 sm:p-5`}>
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">AI Insight</p>
                <p className="text-sm font-semibold text-emerald-100/55">Based on your real cashflow data</p>
              </div>
              <Sparkles className="ml-auto h-4 w-4 text-lime-300" />
            </div>
            <div className="space-y-2.5">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </section>
        </div>

        <CashflowWorkspaceCalendar
          expenses={expenses}
          metaMap={metaMap}
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
          month={calendarMonth}
          onMonthChange={setCalendarMonth}
        />

        <section className={`${glassCardClassName} p-4 sm:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Notification channels</p>
              <p className="mt-1 text-sm font-semibold text-emerald-100/55">
                Dashboard alerts, profile center, email reminders, and future push support.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Dashboard", active: true },
                { label: "Profile center", active: true },
                { label: "Email", active: true },
                { label: "Push", active: false },
              ].map((channel) => (
                <span
                  key={channel.label}
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                    channel.active
                      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-white/[0.03] text-emerald-100/35"
                  }`}
                >
                  {channel.label}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
              <div className="flex items-center gap-2 text-emerald-100">
                <TrendingUp size={16} className="text-lime-300" />
                <p className="text-sm font-black">Upcoming expense reminders</p>
              </div>
              <p className="mt-1 text-xs font-semibold text-emerald-100/50">{notifications.length} active reminders in workspace</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/15 px-3.5 py-3">
              <div className="flex items-center gap-2 text-emerald-100">
                <TrendingDown size={16} className="text-orange-300" />
                <p className="text-sm font-black">Budget & overdue alerts</p>
              </div>
              <p className="mt-1 text-xs font-semibold text-emerald-100/50">
                {sr !== null && sr < 15 ? "Savings rate is below target" : "Monitoring burn and due dates"}
              </p>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {notificationsOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close notifications"
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNotificationsOpen(false)}
            />
            <motion.div
              className="fixed inset-x-3 top-[calc(0.75rem+env(safe-area-inset-top,0px))] z-50 mx-auto max-w-lg overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#071512]/95 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85)] backdrop-blur-2xl sm:inset-x-auto sm:right-6 sm:top-[calc(1rem+env(safe-area-inset-top,0px))] sm:w-[min(100vw-3rem,24rem)]"
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3.5">
                <div>
                  <p className="text-sm font-black text-white">Notifications</p>
                  <p className="text-xs font-semibold text-emerald-100/50">{unreadCount} unread</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 ? (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-100"
                    >
                      Mark all read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.06] text-emerald-100"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-[min(70dvh,28rem)] space-y-2 overflow-y-auto p-3 [-webkit-overflow-scrolling:touch]">
                {notifications.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm font-semibold text-emerald-100/50">No notifications yet.</p>
                ) : (
                  notifications.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onMarkRead={markNotificationRead}
                    />
                  ))
                )}
              </div>
              <div className="border-t border-white/10 p-3">
                <Link
                  href="/expense-dashboard?finance=personal&view=expenses"
                  className="flex min-h-[44px] items-center justify-center rounded-2xl bg-white/[0.05] text-sm font-black text-emerald-50"
                  onClick={() => setNotificationsOpen(false)}
                >
                  Open Expense Workspace
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
