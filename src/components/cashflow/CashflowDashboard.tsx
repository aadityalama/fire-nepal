"use client";

import {
  ArrowLeft,
  Banknote,
  Bell,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Flame,
  Home,
  LayoutGrid,
  Menu,
  MoreHorizontal,
  PiggyBank,
  ShieldHalf,
  TrendingUp,
  Wallet2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildFinancialIntelligenceModel,
  loadIntelMonthRollups,
  SmartFinancialIntelligenceSection,
  upsertCurrentMonthRollup,
  type FinancialIntelMonthRollup,
} from "@/components/financial-intelligence";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { CashflowGlassCard, CashflowInsetCard } from "@/components/cashflow/CashflowGlassCard";
import { EXPENSE_CATEGORY_META, INCOME_SOURCE_META } from "@/components/cashflow/cashflow-constants";
import type { CashflowDashboardState } from "@/components/cashflow/types";
import type { CashflowDerivedMetrics } from "@/components/cashflow/hooks/useCashflowPersistedState";
import { useCashflowPersistedState } from "@/components/cashflow/hooks/useCashflowPersistedState";
import { FireNepalBrandLogo } from "@/components/FireNepalBrandLogo";
import { FireThemeToggle } from "@/components/dashboard/FireThemeToggle";
import { AiFinancialCoachSection } from "@/components/financial-coach/AiFinancialCoachSection";
import { buildCashflowOnlyFinancialCoachSnapshot } from "@/components/financial-coach/coach-snapshot";
import type { FinancialCoachSnapshot } from "@/components/financial-coach/types";
import type { FinancialIntelligenceModel } from "@/components/financial-intelligence";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { KoreanPayslipImportPanel } from "@/components/payslip-import/KoreanPayslipImportPanel";
import { PAYSLIP_HISTORY_SYNC_EVENT } from "@/components/payslip-import/payslip-history-storage";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { WealthMetricGrid } from "@/components/portfolio/WealthMetricGrid";
import { formatMoney } from "@/lib/expense-utils";
import { useProductAuth } from "@/contexts/ProductAuthContext";

const moneyFieldClass = "text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block";
const moneyWrap = "rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40";
const moneyInput = "min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none sm:text-sm";
const mobileMoneyWrap =
  "rounded-[18px] border border-white/[0.08] bg-white/[0.055] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus-within:border-emerald-300/45";
const mobileMoneyInput = "min-w-0 flex-1 bg-transparent text-[13px] font-black text-white outline-none";

type CashflowMetricTile = {
  label: string;
  value: string;
  hint: string;
  accent: "lime" | "rose" | "amber" | "default";
};

type CashflowDashboardViewProps = {
  state: CashflowDashboardState;
  setState: ReturnType<typeof useCashflowPersistedState>["setState"];
  metrics: CashflowDerivedMetrics;
  patchIncome: ReturnType<typeof useCashflowPersistedState>["patchIncome"];
  patchExpense: ReturnType<typeof useCashflowPersistedState>["patchExpense"];
  coachSnapshot: FinancialCoachSnapshot;
  intelModel: FinancialIntelligenceModel;
  metricTiles: CashflowMetricTile[];
};

type MobileAccordionProps = {
  title: string;
  summary: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  defaultOpen?: boolean;
};

function pctStroke(score: number | null | undefined) {
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const circumference = 2 * Math.PI * 38;
  return {
    dasharray: circumference,
    dashoffset: circumference - (pct / 100) * circumference,
  };
}

function MobileScoreGauge({ score }: { score: number | null }) {
  const safeScore = score ?? 0;
  const stroke = pctStroke(safeScore);
  return (
    <div className="relative grid h-[106px] w-[106px] place-items-center">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="url(#cashflowHealthGradient)"
          strokeLinecap="round"
          strokeWidth="9"
          strokeDasharray={stroke.dasharray}
          strokeDashoffset={stroke.dashoffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
        />
        <defs>
          <linearGradient id="cashflowHealthGradient" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#34d399" />
            <stop offset="0.55" stopColor="#a3e635" />
            <stop offset="1" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <p className="text-[30px] font-black leading-none tracking-[-0.08em] text-white">{safeScore || "—"}</p>
        <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/55">/100</p>
      </div>
    </div>
  );
}

function MobileAccordion({ title, summary, children, action, defaultOpen = false }: MobileAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.055] shadow-[0_18px_48px_-28px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[72px] w-full touch-manipulation items-center justify-between gap-3 px-4 py-3 text-left transition active:scale-[0.985]"
        aria-expanded={open}
      >
        <div className="min-w-0">
          <h3 className="text-[15px] font-black tracking-[-0.03em] text-white">{title}</h3>
          <div className="mt-1 text-[11px] font-bold leading-snug text-emerald-100/58">{summary}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <span className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.08] bg-black/25 text-emerald-100/75">
            <ChevronDown
              size={17}
              className={`transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "rotate-180" : ""}`}
            />
          </span>
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          {open && children ? <div className="border-t border-white/[0.06] px-4 py-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}

function MobileSummaryTile({
  label,
  value,
  hint,
  tone = "emerald",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "emerald" | "rose" | "lime" | "amber" | "cyan";
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
    <div className="min-h-[84px] rounded-[22px] border border-white/[0.075] bg-white/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{label}</p>
      <p className={`mt-2 truncate text-[18px] font-black leading-none tracking-[-0.055em] tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-1.5 line-clamp-1 text-[10px] font-bold text-zinc-400">{hint}</p>
    </div>
  );
}

function MobileBottomNav() {
  const items = [
    { href: "/hub", label: "Home", icon: Home, active: false },
    { href: "/cashflow-dashboard", label: "Finance", icon: Banknote, active: true },
    { href: "/portfolio", label: "Portfolio", icon: Briefcase, active: false },
    { href: "/fire-biz", label: "FIRE Biz", icon: LayoutGrid, active: false },
    { href: "/more", label: "More", icon: MoreHorizontal, active: false },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-[430px] justify-center px-4 pb-[calc(14px+env(safe-area-inset-bottom,0px))]"
      aria-label="Cashflow mobile navigation"
    >
      <div className="flex h-[72px] w-full items-center justify-between rounded-[26px] border border-white/[0.1] bg-[#07110f]/78 px-2 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.92),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            className="flex min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition active:scale-95"
            aria-current={active ? "page" : undefined}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-full transition ${
                active
                  ? "bg-emerald-400 text-emerald-950 shadow-[0_10px_24px_-10px_rgba(52,211,153,0.8)]"
                  : "text-zinc-500"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2.15} />
            </span>
            <span className={`truncate text-[10px] font-black ${active ? "text-emerald-100" : "text-zinc-500"}`}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function MobileCashflowDashboard({
  state,
  setState,
  metrics,
  patchIncome,
  patchExpense,
  coachSnapshot,
  intelModel,
}: CashflowDashboardViewProps) {
  const {
    totalIncome,
    categoryExpenseTotal,
    monthlyBurn: burn,
    savingsRatePct: sr,
    investableCashflow: surplus,
    fireSpeedScore: speed,
    coverageMonths: months,
  } = metrics;
  const healthScore = speed ?? intelModel.financialHealthScore ?? null;
  const summaryTiles = [
    { label: "Income", value: formatMoney(totalIncome, "NPR"), hint: "Monthly inflow", tone: "emerald" as const },
    { label: "Expenses", value: formatMoney(burn, "NPR"), hint: "Monthly burn", tone: "rose" as const },
    {
      label: "Savings",
      value: `${surplus >= 0 ? "+" : ""}${formatMoney(surplus, "NPR")}`,
      hint: "Investable",
      tone: surplus >= 0 ? ("lime" as const) : ("rose" as const),
    },
    { label: "FIRE Speed", value: speed === null ? "—" : `${speed}`, hint: "Velocity score", tone: "cyan" as const },
    {
      label: "Emergency Runway",
      value: months === null ? "—" : `${months.toFixed(1)} mo`,
      hint: "Liquid coverage",
      tone: "amber" as const,
    },
  ];

  return (
    <main className="min-h-[100dvh] bg-[#030908] text-white md:hidden">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(52,211,153,0.28),transparent_34%),radial-gradient(circle_at_100%_16%,rgba(45,212,191,0.12),transparent_30%),linear-gradient(180deg,#071512_0%,#030908_42%,#020403_100%)]" />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden border-x border-white/[0.04] shadow-[0_0_90px_rgba(0,0,0,0.6)]">
        <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#06110f]/86 px-4 pt-[env(safe-area-inset-top,0px)] shadow-[0_10px_34px_-26px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-10 w-10 touch-manipulation place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.055] text-emerald-50 transition active:scale-95"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <FireThemeToggle variant="header" />
          </div>
          <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2">
            <FireNepalBrandLogo className="h-9 w-9 rounded-xl" />
            <div className="text-left">
              <p className="text-[13px] font-black leading-tight tracking-[-0.04em] text-white">FIRE Nepal</p>
              <p className="text-[9px] font-black uppercase leading-tight tracking-[0.22em] text-emerald-200/62">
                Cashflow OS
              </p>
            </div>
          </div>
          <button
            type="button"
            className="relative grid h-10 w-10 touch-manipulation place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.055] text-emerald-50 transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-[calc(106px+env(safe-area-inset-bottom,0px))] pt-5 [-webkit-overflow-scrolling:touch]">
          <section className="mb-4">
            <p className="text-[24px] font-black leading-tight tracking-[-0.07em] text-white">Namaste, Raj Kumar 👋</p>
            <p className="mt-1 text-[13px] font-bold text-emerald-100/54">Here&apos;s your cashflow intelligence</p>
          </section>

          <section className="relative mb-4 overflow-hidden rounded-[28px] border border-emerald-300/[0.16] bg-[linear-gradient(135deg,rgba(255,255,255,0.105),rgba(16,185,129,0.075)_48%,rgba(0,0,0,0.38))] p-4 shadow-[0_28px_70px_-34px_rgba(16,185,129,0.65),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(163,230,53,0.16),transparent_30%)]" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-black uppercase tracking-[0.2em] text-emerald-100/55">Cashflow Health</p>
                <h1 className="mt-4 text-[28px] font-black leading-none tracking-[-0.08em] text-white">
                  {healthScore === null ? "Getting ready" : healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Stable" : "Needs focus"}
                </h1>
                <p className="mt-2 text-[12px] font-bold leading-snug text-emerald-100/58">
                  {sr === null ? "Add income to unlock your premium cashflow score." : `${sr.toFixed(1)}% savings rate this month`}
                </p>
                <div className="mt-5 flex h-9 w-[132px] items-end gap-1.5" aria-hidden="true">
                  {[28, 44, 32, 55, 47, 68, 61, 76].map((h, i) => (
                    <span
                      key={`${h}-${i}`}
                      className="flex-1 rounded-full bg-gradient-to-t from-emerald-500/35 to-lime-300/90 shadow-[0_0_16px_-8px_rgba(163,230,53,0.9)]"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <MobileScoreGauge score={healthScore} />
            </div>
          </section>

          <section className="mb-5 grid grid-cols-2 gap-3">
            {summaryTiles.map((tile) => (
              <MobileSummaryTile key={tile.label} {...tile} />
            ))}
          </section>

          <section className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[17px] font-black tracking-[-0.045em] text-white">FIRE Metrics</p>
                <p className="mt-0.5 text-[11px] font-bold text-emerald-100/45">Compact monthly operating system</p>
              </div>
              <Flame className="h-5 w-5 text-emerald-300" fill="currentColor" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MobileSummaryTile
                label="Savings Rate"
                value={sr === null ? "—" : `${sr.toFixed(1)}%`}
                hint="Surplus ÷ income"
                tone="lime"
              />
              <MobileSummaryTile label="Monthly Burn" value={formatMoney(burn, "NPR")} hint="Runway driver" tone="rose" />
              <MobileSummaryTile
                label="Investable Cashflow"
                value={`${surplus >= 0 ? "+" : ""}${formatMoney(surplus, "NPR")}`}
                hint="Income − burn"
                tone={surplus >= 0 ? "emerald" : "rose"}
              />
              <MobileSummaryTile label="FIRE Score" value={speed === null ? "—" : `${speed}`} hint="0–100 readiness" tone="cyan" />
            </div>
          </section>

          <section className="space-y-3">
            <MobileAccordion title="Income Sources" summary={`Total income · ${formatMoney(totalIncome, "NPR")}`}>
              <div className="grid gap-2.5">
                {INCOME_SOURCE_META.map(({ key, label, hint }) => (
                  <div key={key}>
                    <NumericMoneyInput
                      tone="dark"
                      label={label}
                      value={state.income[key]}
                      onChange={(n) => patchIncome(key, n)}
                      variant="amount"
                      placeholder="0"
                      className={moneyFieldClass}
                      wrapperClassName={mobileMoneyWrap}
                      inputClassName={mobileMoneyInput}
                    />
                    <p className="mt-1 text-[10px] font-bold text-emerald-100/40">{hint}</p>
                  </div>
                ))}
              </div>
            </MobileAccordion>

            <MobileAccordion title="Expense Tracker" summary={`Total expense · ${formatMoney(categoryExpenseTotal, "NPR")}`}>
              <div className="grid gap-2.5">
                {EXPENSE_CATEGORY_META.map(({ key, label, hint }) => (
                  <div key={key}>
                    <NumericMoneyInput
                      tone="dark"
                      label={label}
                      value={state.expenses[key]}
                      onChange={(n) => patchExpense(key, n)}
                      variant="amount"
                      placeholder="0"
                      className={moneyFieldClass}
                      wrapperClassName={mobileMoneyWrap}
                      inputClassName={mobileMoneyInput}
                    />
                    <p className="mt-1 text-[10px] font-bold text-emerald-100/40">{hint}</p>
                  </div>
                ))}
              </div>
            </MobileAccordion>

            <MobileAccordion
              title="Emergency Fund"
              summary={
                <>
                  Reserve · {formatMoney(state.emergencyCashReserve ?? 0, "NPR")} · Coverage{" "}
                  {months === null ? "—" : `${months.toFixed(1)} mo`}
                </>
              }
            >
              <div className="grid gap-3">
                <NumericMoneyInput
                  tone="dark"
                  label="Emergency cash reserve"
                  value={state.emergencyCashReserve}
                  onChange={(n) => setState((s) => ({ ...s, emergencyCashReserve: n }))}
                  variant="amount"
                  placeholder="0"
                  className={moneyFieldClass}
                  wrapperClassName={mobileMoneyWrap}
                  inputClassName={mobileMoneyInput}
                />
                <NumericMoneyInput
                  tone="dark"
                  label="Monthly expenses override"
                  value={state.monthlyExpensesOverride}
                  onChange={(n) => setState((s) => ({ ...s, monthlyExpensesOverride: n }))}
                  variant="amount"
                  placeholder="Leave empty to use categories"
                  className={moneyFieldClass}
                  wrapperClassName={mobileMoneyWrap}
                  inputClassName={mobileMoneyInput}
                />
                <div className="grid grid-cols-2 gap-2">
                  <MobileSummaryTile label="Reserve" value={formatMoney(state.emergencyCashReserve ?? 0, "NPR")} hint="Liquid cash" tone="emerald" />
                  <MobileSummaryTile label="Coverage" value={months === null ? "—" : `${months.toFixed(1)} mo`} hint="Reserve ÷ burn" tone="lime" />
                </div>
              </div>
            </MobileAccordion>

            <MobileAccordion
              title="Korean Payslip Import"
              summary="Upload salary data into cashflow"
              action={
                <span className="rounded-full bg-emerald-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-950">
                  Import
                </span>
              }
            >
              <KoreanPayslipImportPanel />
            </MobileAccordion>

            <MobileAccordion title="Behavioral Analytics" summary="Savings discipline, momentum and pressure signals">
              <AiFinancialCoachSection snapshot={coachSnapshot} compact />
            </MobileAccordion>

            <section className="flex min-h-[74px] items-center justify-between gap-3 rounded-[22px] border border-white/[0.08] bg-white/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
              <div className="min-w-0">
                <p className="text-[15px] font-black tracking-[-0.03em] text-white">Automation & Signals</p>
                <p className="mt-1 text-[11px] font-bold text-emerald-100/55">Smart automation for your cashflow</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-emerald-300/25 bg-emerald-400/12 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-100">
                  3 Active
                </span>
                <ChevronRight className="h-5 w-5 text-emerald-100/55" />
              </div>
            </section>

            <MobileAccordion
              title="Recent Activity"
              summary={`Latest updates · ${intelModel.monthlyReport.month}`}
              action={<span className="text-[11px] font-black text-emerald-200">View All</span>}
            >
              <div className="space-y-2 text-[12px] font-bold leading-relaxed text-zinc-300">
                <p className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2">
                  Cashflow quality score updated to {intelModel.monthlyReport.cashflowQualityScore}.
                </p>
                <p className="rounded-2xl border border-white/[0.06] bg-black/20 px-3 py-2">
                  Savings trajectory is {intelModel.monthlyReport.savingsRateTrend}.
                </p>
              </div>
            </MobileAccordion>
          </section>
        </div>
        <MobileBottomNav />
      </div>
    </main>
  );
}

function DesktopCashflowDashboard({
  state,
  setState,
  metrics,
  patchIncome,
  patchExpense,
  coachSnapshot,
  intelModel,
  metricTiles,
}: CashflowDashboardViewProps) {
  const {
    totalIncome,
    categoryExpenseTotal,
    monthlyBurn: burn,
    coverageMonths: months,
  } = metrics;

  return (
    <div className="hidden md:block">
      <WealthDashboardShell
        brand={{ tagline: "Cashflow OS", iconGradient: "from-emerald-400 to-teal-400" }}
        footerNote="Local-first. Amounts stay in your browser — use one currency per sheet (NPR display)."
      >
        <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
          <Link
            href="/"
            className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-emerald-400/18 bg-white/[0.06] px-3.5 py-2.5 text-xs font-black text-emerald-50/95 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)] backdrop-blur-md transition duration-300 active:scale-[0.98] hover:border-teal-300/35 hover:bg-white/10 hover:shadow-[0_12px_36px_-10px_rgba(45,212,191,0.15)] sm:text-sm"
          >
            <ArrowLeft size={15} /> Back to FIRE Nepal
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-200/70 sm:text-xs">
            <Wallet2 size={14} className="text-teal-300" />
            Cashflow dashboard
          </div>
        </div>

        <div className="wealth-dash-flow flex flex-col gap-5 lg:gap-6">
          <DashboardSectionHeader
            accent="teal"
            title="Your Cashflow Intelligence"
            subtitle="Monitor income, expenses, savings, and FIRE speed."
          />

          <KoreanPayslipImportPanel />

          <AiFinancialCoachSection snapshot={coachSnapshot} compact />

          <SmartFinancialIntelligenceSection model={intelModel} compact />

          <div className="mb-5 space-y-3">
            <CashflowInsetCard className="border-teal-400/15">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-200/55">FIRE metrics</p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-200/55">
                Totals: {formatMoney(totalIncome, "NPR")} in · {formatMoney(categoryExpenseTotal, "NPR")} categories
                {state.monthlyExpensesOverride != null && state.monthlyExpensesOverride > 0
                  ? ` · burn uses override`
                  : ""}
              </p>
              <div className="mt-3">
                <WealthMetricGrid tiles={metricTiles} />
              </div>
            </CashflowInsetCard>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <CashflowGlassCard
              title="Income sources"
              subtitle="Average monthly inflows — salary, side income, rentals, and platform earnings."
              icon={TrendingUp}
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                {INCOME_SOURCE_META.map(({ key, label, hint }) => (
                  <div key={key} className="min-w-0">
                    <NumericMoneyInput
                      tone="dark"
                      label={label}
                      value={state.income[key]}
                      onChange={(n) => patchIncome(key, n)}
                      variant="amount"
                      placeholder="0"
                      className={moneyFieldClass}
                      wrapperClassName={moneyWrap}
                      inputClassName={moneyInput}
                    />
                    <p className="mt-1 text-[10px] font-semibold text-emerald-200/45">{hint}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-400/10 bg-black/20 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Total income</span>
                <span className="text-sm font-black tabular-nums text-teal-200">{formatMoney(totalIncome, "NPR")}</span>
              </div>
            </CashflowGlassCard>

            <CashflowGlassCard
              title="Expense tracker"
              subtitle="Monthly outflows by category — drives burn rate when no override is set."
              icon={Banknote}
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                {EXPENSE_CATEGORY_META.map(({ key, label, hint }) => (
                  <div key={key} className="min-w-0">
                    <NumericMoneyInput
                      tone="dark"
                      label={label}
                      value={state.expenses[key]}
                      onChange={(n) => patchExpense(key, n)}
                      variant="amount"
                      placeholder="0"
                      className={moneyFieldClass}
                      wrapperClassName={moneyWrap}
                      inputClassName={moneyInput}
                    />
                    <p className="mt-1 text-[10px] font-semibold text-emerald-200/45">{hint}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-400/10 bg-black/20 px-3 py-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">
                  Category total
                </span>
                <span className="text-sm font-black tabular-nums text-amber-200/95">
                  {formatMoney(categoryExpenseTotal, "NPR")}
                </span>
              </div>
            </CashflowGlassCard>

            <div className="lg:col-span-2">
              <CashflowGlassCard
                title="Emergency fund"
                subtitle="Liquid reserve vs monthly obligations — aim for 3–6+ months of runway."
                icon={ShieldHalf}
              >
                <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
                  <div className="min-w-0 lg:col-span-4">
                    <NumericMoneyInput
                      tone="dark"
                      label="Emergency cash reserve"
                      value={state.emergencyCashReserve}
                      onChange={(n) => setState((s) => ({ ...s, emergencyCashReserve: n }))}
                      variant="amount"
                      placeholder="0"
                      className={moneyFieldClass}
                      wrapperClassName={moneyWrap}
                      inputClassName={moneyInput}
                    />
                  </div>
                  <div className="min-w-0 lg:col-span-4">
                    <NumericMoneyInput
                      tone="dark"
                      label="Monthly expenses override"
                      value={state.monthlyExpensesOverride}
                      onChange={(n) => setState((s) => ({ ...s, monthlyExpensesOverride: n }))}
                      variant="amount"
                      placeholder="Leave empty to use categories"
                      className={moneyFieldClass}
                      wrapperClassName={moneyWrap}
                      inputClassName={moneyInput}
                    />
                    <p className="mt-1 text-[10px] font-semibold text-emerald-200/45">
                      Optional: use when real burn differs from the sum of categories.
                    </p>
                  </div>
                  <CashflowInsetCard className="lg:col-span-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Monthly expenses</p>
                    <p className="mt-1 text-lg font-black tabular-nums text-emerald-50">{formatMoney(burn, "NPR")}</p>
                    <p className="mt-2 text-[10px] font-bold text-emerald-200/50">
                      {state.monthlyExpensesOverride != null && state.monthlyExpensesOverride > 0
                        ? "Using override for burn & metrics."
                        : "Using sum of expense categories."}
                    </p>
                  </CashflowInsetCard>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <CashflowInsetCard>
                    <div className="flex items-center gap-2">
                      <PiggyBank size={16} className="text-lime-300/90" />
                      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Coverage</p>
                    </div>
                    <p className="mt-1.5 text-2xl font-black tabular-nums text-lime-200">
                      {months === null ? "—" : `${months.toFixed(1)} mo`}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold text-emerald-200/50">Reserve ÷ monthly burn</p>
                  </CashflowInsetCard>
                  <CashflowInsetCard>
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-teal-300/90" />
                      <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">Runway signal</p>
                    </div>
                    <p className="mt-1.5 text-sm font-black leading-snug text-emerald-100">
                      {months === null
                        ? "Add monthly burn to see months covered."
                        : months < 3
                          ? "Build toward 3–6 months liquid."
                          : months < 6
                            ? "Solid start — keep topping up."
                            : "Strong buffer — consider investing surplus."}
                    </p>
                  </CashflowInsetCard>
                </div>
              </CashflowGlassCard>
            </div>
          </div>
        </div>
      </WealthDashboardShell>
    </div>
  );
}

export function CashflowDashboard() {
  const { user } = useProductAuth();
  const { state, setState, metrics, patchIncome, patchExpense, hydrated } = useCashflowPersistedState(user?.id);
  const [coachTick, setCoachTick] = useState(0);
  const [intelRollups, setIntelRollups] = useState<FinancialIntelMonthRollup[]>([]);

  useEffect(() => {
    const on = () => setCoachTick((t) => t + 1);
    window.addEventListener(PAYSLIP_HISTORY_SYNC_EVENT, on);
    return () => window.removeEventListener(PAYSLIP_HISTORY_SYNC_EVENT, on);
  }, []);

  const coachSnapshot = useMemo(() => buildCashflowOnlyFinancialCoachSnapshot(state), [state, coachTick]);

  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;
    upsertCurrentMonthRollup({ cashflow: state, coach: coachSnapshot });
    setIntelRollups(loadIntelMonthRollups());
  }, [hydrated, state, coachSnapshot, coachTick]);

  const intelModel = useMemo(
    () =>
      buildFinancialIntelligenceModel({
        cashflow: state,
        coach: coachSnapshot,
        monthRollups: intelRollups,
        netWorthHistory: [],
      }),
    [state, coachSnapshot, intelRollups],
  );

  const {
    totalIncome,
    categoryExpenseTotal,
    monthlyBurn: burn,
    savingsRatePct: sr,
    investableCashflow: surplus,
    fireSpeedScore: speed,
    coverageMonths: months,
  } = metrics;

  const metricTiles = useMemo(
    () => [
      {
        label: "Savings rate",
        value: sr === null ? "—" : `${sr.toFixed(1)}%`,
        hint: "Surplus ÷ income (monthly)",
        accent: "lime" as const,
      },
      {
        label: "Monthly burn",
        value: formatMoney(burn, "NPR"),
        hint: "Outflows driving runway",
        accent: "rose" as const,
      },
      {
        label: "Investable cashflow",
        value: `${surplus >= 0 ? "+" : ""}${formatMoney(surplus, "NPR")}`,
        hint: "Income − monthly burn",
        accent: surplus >= 0 ? ("amber" as const) : ("rose" as const),
      },
      {
        label: "FIRE speed",
        value: speed === null ? "—" : String(speed),
        hint: "0–100: savings + emergency runway (cashflow view)",
        accent: "default" as const,
      },
    ],
    [sr, burn, surplus, speed],
  );

  const viewProps = {
    state,
    setState,
    metrics,
    patchIncome,
    patchExpense,
    coachSnapshot,
    intelModel,
    metricTiles,
  };

  return (
    <>
      <MobileCashflowDashboard {...viewProps} />
      <DesktopCashflowDashboard {...viewProps} />
    </>
  );
}
