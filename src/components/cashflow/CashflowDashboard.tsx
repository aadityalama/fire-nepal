"use client";

import { ArrowLeft, Banknote, Briefcase, PiggyBank, ShieldHalf, TrendingUp, Wallet2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { useCashflowPersistedState } from "@/components/cashflow/hooks/useCashflowPersistedState";
import { AiFinancialCoachSection } from "@/components/financial-coach/AiFinancialCoachSection";
import { buildCashflowOnlyFinancialCoachSnapshot } from "@/components/financial-coach/coach-snapshot";
import { NumericMoneyInput } from "@/components/NumericMoneyInput";
import { KoreanPayslipImportPanel } from "@/components/payslip-import/KoreanPayslipImportPanel";
import { PAYSLIP_HISTORY_SYNC_EVENT } from "@/components/payslip-import/payslip-history-storage";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { WealthMetricGrid } from "@/components/portfolio/WealthMetricGrid";
import { formatMoney } from "@/lib/expense-utils";

const moneyFieldClass = "text-[10px] font-bold uppercase tracking-wide text-zinc-200 [&>span]:block";
const moneyWrap = "rounded-xl border border-emerald-400/15 bg-black/30 px-2 py-2 focus-within:border-emerald-400/40";
const moneyInput = "min-w-0 flex-1 bg-transparent text-xs font-bold text-emerald-50 outline-none sm:text-sm";

export function CashflowDashboard() {
  const { state, setState, metrics, patchIncome, patchExpense, hydrated } = useCashflowPersistedState();
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

  return (
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
                    <NumericMoneyInput tone="dark"
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
                    <NumericMoneyInput tone="dark"
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
                    <NumericMoneyInput tone="dark"
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
                    <NumericMoneyInput tone="dark"
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
  );
}
