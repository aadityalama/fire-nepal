"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ChevronDown,
  Link2,
  MinusCircle,
  PlusCircle,
  RefreshCw,
  Settings2,
  Shield,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmergencyFundAiSafetyAnalysis } from "@/components/emergency-fund/EmergencyFundAiSafetyAnalysis";
import { BackToReturnChecklistBannerSlot } from "@/components/return-to-nepal/BackToReturnChecklistBannerSlot";
import { SavingsRingProgress } from "@/components/savings-tracker/SavingsRingProgress";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useHomepageLanguage } from "@/contexts/HomepageLanguageContext";
import { useIntelligentEmergencyFund } from "@/hooks/useIntelligentEmergencyFund";
import {
  ALLOCATION_PCT_OPTIONS,
  PROTECTION_MONTH_OPTIONS,
} from "@/lib/emergency-fund/types";
import { getEmergencyFundCopy, localizeDataSourceLabel } from "@/lib/emergency-fund/i18n";
import { EMERGENCY_PERIOD_MODE_OPTIONS, pluralMonths } from "@/lib/emergency-fund/period";
import {
  EMERGENCY_SCENARIO_PRESETS,
  runEmergencySimulator,
  type EmergencyScenarioId,
} from "@/lib/emergency-fund/simulator";
import { runEmergencyFundProjection } from "@/lib/emergency-fund";
import { formatMoney } from "@/lib/expense-utils";

function money(n: number | null | undefined, currency: "NPR" | "KRW" | "USD" = "NPR") {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatMoney(n, currency);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function insightText(
  insight: { messageEn: string; messageNe: string; messageKo: string },
  language: string,
) {
  if (language === "np") return insight.messageNe;
  if (language === "kr") return insight.messageKo;
  return insight.messageEn;
}

type Emp = "stable" | "contract" | "overseas" | "self_employed" | "uncertain";

export function EmergencyFundDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const { language } = useHomepageLanguage();
  const copy = getEmergencyFundCopy(language);

  const {
    result,
    ledger,
    emergencyGoals,
    growthSeries,
    loading,
    budgetsError,
    lastSyncedAt,
    syncing,
    recordTransaction,
    reverseTransaction,
    patchSettings,
    toggleLinkedGoal,
    refreshFinanceSync,
  } = useIntelligentEmergencyFund();

  const [sheet, setSheet] = useState<null | "contribute" | "withdraw" | "settings" | "link" | "calc">(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [noteRaw, setNoteRaw] = useState("");
  const [dateRaw, setDateRaw] = useState(todayIso());
  const [customMonthsRaw, setCustomMonthsRaw] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    synced: true,
    funding: true,
    timeline: false,
    simulator: false,
    growth: false,
    insights: true,
  });
  const [scenarioId, setScenarioId] = useState<EmergencyScenarioId>("complete_income_loss");
  const [simOneTime, setSimOneTime] = useState("0");
  const [simIncome, setSimIncome] = useState("");
  const [txError, setTxError] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState({
    openingBalanceNpr: "",
    manualMonthlyExpenseNpr: "",
    expenseBasisOverrideNpr: "",
    employmentType: "" as "" | Emp,
    dependents: "0",
    incomeSources: "" as "" | "single" | "multiple",
  });

  const shell = light
    ? "min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#f1f5f9_100%)] text-emerald-950"
    : "premium-shell min-h-screen bg-[#04150f] text-emerald-50";
  const card = light
    ? "rounded-2xl border border-emerald-100/80 bg-white/85 shadow-[0_12px_36px_rgba(6,78,59,0.07)] backdrop-blur"
    : "rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_12px_36px_rgba(0,0,0,0.3)] backdrop-blur";
  const muted = light ? "text-slate-500" : "text-emerald-100/65";
  const strong = light ? "text-emerald-950" : "text-white";

  const legacyAiResult = useMemo(() => {
    if (!result.recommendedExpenseBasisNpr) return null;
    return runEmergencyFundProjection({
      monthlyExpense: result.recommendedExpenseBasisNpr,
      currentFund: result.currentReserveNpr,
      monthlySave: result.recommendedMonthlyContributionNpr ?? 0,
      riskLevel:
        ledger.settings.employmentType === "overseas" || ledger.settings.employmentType === "uncertain"
          ? "high"
          : (ledger.settings.dependents ?? 0) > 0
            ? "moderate"
            : "stable",
    });
  }, [ledger.settings.dependents, ledger.settings.employmentType, result]);

  const preset = EMERGENCY_SCENARIO_PRESETS.find((p) => p.id === scenarioId)!;
  const simResult = useMemo(() => {
    if (!result.recommendedExpenseBasisNpr) return null;
    const baseIncome = result.recurringMonthlyIncomeNpr ?? result.monthlyNetIncomeNpr ?? 0;
    const remaining =
      simIncome !== ""
        ? Math.max(0, Number(simIncome.replace(/,/g, "")) || 0)
        : Math.round(baseIncome * preset.incomeMultiplier);
    return runEmergencySimulator({
      currentReserveNpr: result.currentReserveNpr,
      essentialMonthlyNpr: result.recommendedExpenseBasisNpr,
      remainingMonthlyIncomeNpr: remaining,
      oneTimeEmergencyCostNpr:
        Number(simOneTime.replace(/,/g, "")) || preset.defaultOneTimeCostNpr,
      monthlyExpenseAdjustmentNpr: preset.defaultExpenseAdjustmentNpr,
    });
  }, [preset, result, simIncome, simOneTime]);

  const toggle = (key: string) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  const openTx = (kind: "contribute" | "withdraw") => {
    setAmountRaw("");
    setNoteRaw("");
    setDateRaw(todayIso());
    setTxError(null);
    setSheet(kind);
  };

  const openSettings = () => {
    setSettingsDraft({
      openingBalanceNpr: String(ledger.settings.openingBalanceNpr ?? 0),
      manualMonthlyExpenseNpr:
        ledger.settings.manualMonthlyExpenseNpr != null
          ? String(ledger.settings.manualMonthlyExpenseNpr)
          : "",
      expenseBasisOverrideNpr:
        ledger.settings.expenseBasisOverrideNpr != null
          ? String(ledger.settings.expenseBasisOverrideNpr)
          : "",
      employmentType: (ledger.settings.employmentType ?? "") as "" | Emp,
      dependents: String(ledger.settings.dependents ?? 0),
      incomeSources: (ledger.settings.incomeSources ?? "") as "" | "single" | "multiple",
    });
    setSheet("settings");
  };

  const saveSettings = () => {
    const opening = Math.max(0, Math.round(Number(settingsDraft.openingBalanceNpr.replace(/,/g, "")) || 0));
    const manualRaw = settingsDraft.manualMonthlyExpenseNpr.replace(/,/g, "").trim();
    const overrideRaw = settingsDraft.expenseBasisOverrideNpr.replace(/,/g, "").trim();
    patchSettings({
      openingBalanceNpr: opening,
      manualMonthlyExpenseNpr: manualRaw
        ? Math.max(0, Math.round(Number(manualRaw) || 0)) || undefined
        : undefined,
      expenseBasisOverrideNpr: overrideRaw
        ? Math.max(0, Math.round(Number(overrideRaw) || 0)) || undefined
        : undefined,
      employmentType: settingsDraft.employmentType || undefined,
      dependents: Math.max(0, Math.round(Number(settingsDraft.dependents) || 0)),
      incomeSources: settingsDraft.incomeSources || undefined,
    });
    setSheet(null);
  };

  const submitTx = () => {
    const amount = Math.max(0, Math.round(Number(amountRaw.replace(/,/g, "")) || 0));
    if (amount <= 0) return;
    try {
      recordTransaction({
        type: sheet === "withdraw" ? "withdrawal" : "contribution",
        amountNpr: amount,
        date: dateRaw || todayIso(),
        note: noteRaw.trim() || undefined,
        originalCurrency: "NPR",
        originalAmount: amount,
      });
      setSheet(null);
    } catch (error) {
      setTxError(error instanceof Error ? error.message : "Could not save transaction.");
    }
  };

  if (loading) {
    return (
      <main className={`${shell} px-4 pb-24 pt-6`}>
        <div className="mx-auto flex max-w-3xl items-center justify-center py-24">
          <p className={`text-sm font-bold ${muted}`}>{copy.loading}</p>
        </div>
      </main>
    );
  }

  const showOnboarding = !result.hasSufficientData;
  const dqIssues = result.dataQuality?.issues.filter((i) => i.severity !== "info") ?? [];

  return (
    <main className={`${shell} overflow-x-hidden px-3 pb-28 pt-4 sm:px-6 lg:px-10`}>
      <section className="mx-auto max-w-3xl lg:max-w-5xl">
        <BackToReturnChecklistBannerSlot light={light} className="mb-2" />

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/finance"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${
              light ? "border-emerald-100 bg-white/80 text-emerald-800" : "border-white/15 bg-white/5 text-emerald-100"
            }`}
          >
            <ArrowLeft size={14} />
            {copy.backToFinance}
          </Link>
          <button
            type="button"
            onClick={() => void refreshFinanceSync()}
            disabled={syncing}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${muted} ${
              light ? "border-emerald-100" : "border-white/15"
            }`}
          >
            <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
            {lastSyncedAt
              ? `Synced ${new Date(lastSyncedAt).toLocaleString(language === "np" ? "ne-NP" : language === "kr" ? "ko-KR" : "en-US")}`
              : "Sync finance data"}
          </button>
        </div>

        {/* Compact hero */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`relative overflow-hidden ${card} p-4 sm:p-5`}
        >
          <p className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${muted}`}>
            <Sparkles size={12} /> Finance · Emergency Fund
          </p>
          <h1 className={`mt-1 text-2xl font-black tracking-tight sm:text-3xl ${strong}`}>{copy.title}</h1>
          <p className={`mt-1 max-w-xl text-xs font-medium leading-relaxed sm:text-sm ${muted}`}>{copy.subtitle}</p>

          {dqIssues.length > 0 ? (
            <div className="mt-3 space-y-2">
              {dqIssues.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  className={`flex gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
                    light ? "border-amber-200 bg-amber-50 text-amber-950" : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                  }`}
                >
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <div>
                    <p>{language === "np" ? issue.messageNe : language === "kr" ? issue.messageKo : issue.messageEn}</p>
                    {issue.href ? (
                      <Link href={issue.href} className="mt-1 inline-block font-black underline">
                        Fix in Finance →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {showOnboarding ? (
            <div className={`mt-4 rounded-xl border border-dashed p-4 ${light ? "border-emerald-200 bg-emerald-50/50" : "border-white/20 bg-white/5"}`}>
              <h2 className={`text-base font-black ${strong}`}>{copy.onboardingTitle}</h2>
              <p className={`mt-1 text-xs ${muted}`}>{copy.onboardingBody}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/cashflow-dashboard" className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-black text-white">
                  {copy.openCashflow}
                </Link>
                <Link href="/expense-dashboard?finance=personal" className={`rounded-full border px-3 py-1.5 text-xs font-black ${light ? "border-emerald-200" : "border-white/20"}`}>
                  {copy.addExpenses}
                </Link>
                <Link href="/budget" className={`rounded-full border px-3 py-1.5 text-xs font-black ${light ? "border-emerald-200" : "border-white/20"}`}>
                  {copy.openBudget}
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-[96px_1fr] gap-3 sm:grid-cols-[120px_1fr]">
              <SavingsRingProgress
                pct={result.fundingProgressRingPct ?? 0}
                label={copy.fundingProgress}
                size={96}
                stroke={8}
              />
              <div className="grid grid-cols-2 gap-2">
                <MiniKpi label={copy.target} value={money(result.emergencyFundTargetNpr)} icon={Target} strong={strong} muted={muted} light={light} />
                <MiniKpi label={copy.currentReserve} value={money(result.currentReserveNpr)} icon={Shield} strong={strong} muted={muted} light={light} />
                <MiniKpi
                  label={copy.safetyRunway}
                  value={result.safetyRunwayMonths == null ? "—" : pluralMonths(result.safetyRunwayMonths)}
                  icon={Wallet}
                  strong={strong}
                  muted={muted}
                  light={light}
                />
                <MiniKpi
                  label={copy.safetyStatus}
                  value={result.safetyStatus ? copy.safety[result.safetyStatus] : "—"}
                  icon={AlertTriangle}
                  strong={strong}
                  muted={muted}
                  light={light}
                />
              </div>
            </div>
          )}

          {/* Quick contribute / withdraw near hero */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => openTx("contribute")} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white">
              <PlusCircle size={14} /> {copy.addContribution}
            </button>
            <button
              type="button"
              onClick={() => openTx("withdraw")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-black ${light ? "border-emerald-200 text-emerald-900" : "border-white/15 text-emerald-50"}`}
            >
              <MinusCircle size={14} /> {copy.recordWithdrawal}
            </button>
          </div>
        </motion.section>

        {/* Protection period — compact */}
        <section className={`mt-3 ${card} p-3 sm:p-4`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${muted}`}>{copy.protectionPeriod}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PROTECTION_MONTH_OPTIONS.map((m) => {
              const active = ledger.settings.protectionMonths === m && !customMonthsRaw;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setCustomMonthsRaw("");
                    patchSettings({ protectionMonths: m });
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                    active ? "bg-emerald-600 text-white" : light ? "bg-emerald-50 text-emerald-900" : "bg-white/10 text-emerald-50"
                  }`}
                >
                  {m} mo
                </button>
              );
            })}
            <input
              className={`w-16 rounded-xl border px-2 py-1.5 text-xs font-black outline-none ${light ? "border-emerald-100" : "border-white/15 bg-white/5"}`}
              inputMode="numeric"
              placeholder="Custom"
              value={
                customMonthsRaw !== ""
                  ? customMonthsRaw
                  : (PROTECTION_MONTH_OPTIONS as readonly number[]).includes(ledger.settings.protectionMonths)
                    ? ""
                    : String(ledger.settings.protectionMonths)
              }
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d]/g, "");
                setCustomMonthsRaw(v);
                const n = Number(v);
                if (n >= 1 && n <= 36) patchSettings({ protectionMonths: n });
              }}
            />
          </div>
        </section>

        {/* Period mode */}
        <section className={`mt-3 ${card} p-3 sm:p-4`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${muted}`}>Calculation period</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EMERGENCY_PERIOD_MODE_OPTIONS.filter((o) => o.id !== "custom").map((opt) => {
              const active = (ledger.settings.periodMode ?? "latest_completed") === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchSettings({ periodMode: opt.id })}
                  className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black ${
                    active ? "bg-emerald-600 text-white" : light ? "bg-emerald-50 text-emerald-900" : "bg-white/10"
                  }`}
                >
                  {opt.labelEn}
                </button>
              );
            })}
          </div>
          <p className={`mt-2 text-[11px] font-semibold ${muted}`}>
            Income/Expense: {result.incomePeriodLabel ?? "—"}
            {result.essentialAveragingLabel ? ` · Essential avg: ${result.essentialAveragingLabel}` : ""}
            {result.currency.rateUpdatedAt
              ? ` · FX: ${new Date(result.currency.rateUpdatedAt).toLocaleString()}`
              : ""}
          </p>
        </section>

        {!showOnboarding ? (
          <Expandable
            title={copy.syncedData}
            open={openSections.synced}
            onToggle={() => toggle("synced")}
            card={card}
            muted={muted}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <DataCell label={copy.monthlyNetIncome} value={money(result.monthlyNetIncomeNpr)} muted={muted} strong={strong} />
              <DataCell label="Recurring income" value={money(result.recurringMonthlyIncomeNpr)} muted={muted} strong={strong} />
              <DataCell label={copy.actualMonthlyExpenses} value={money(result.actualMonthlyTotalExpensesNpr)} muted={muted} strong={strong} />
              <DataCell label={copy.essentialAverage} value={money(result.actualEssentialMonthlyAvgNpr)} muted={muted} strong={strong} />
              <DataCell label={copy.plannedEssential} value={money(result.plannedEssentialMonthlyNpr)} muted={muted} strong={strong} />
              <DataCell label={copy.recommendedBasis} value={money(result.recommendedExpenseBasisNpr)} muted={muted} strong={strong} />
              <DataCell
                label={copy.availableSurplus}
                value={
                  result.capacityReliable ? money(result.availableContributionCapacityNpr) : "Needs review"
                }
                muted={muted}
                strong={strong}
              />
            </div>
            <p className={`mt-2 text-[11px] font-semibold ${muted}`}>
              {copy.dataSource}: {localizeDataSourceLabel(result.dataSourceLabel, language)}
              {result.dataQuality ? ` · Quality: ${result.dataQuality.overall}` : ""}
            </p>
            {budgetsError && !/supabase is not configured/i.test(budgetsError) ? (
              <p className="mt-2 text-xs font-semibold text-amber-600">{budgetsError}</p>
            ) : null}
          </Expandable>
        ) : null}

        {!showOnboarding ? (
          <Expandable title={copy.fundingPlan} open={openSections.funding} onToggle={() => toggle("funding")} card={card} muted={muted}>
            <div className="grid grid-cols-2 gap-2">
              <DataCell label={copy.remainingShortfall} value={money(result.remainingShortfallNpr)} muted={muted} strong={strong} />
              <DataCell
                label={copy.recommendedContribution}
                value={
                  result.fullyFunded
                    ? copy.fullyFunded
                    : result.recommendedMonthlyContributionNpr == null
                      ? "Verify data first"
                      : money(result.recommendedMonthlyContributionNpr)
                }
                muted={muted}
                strong={strong}
              />
              <DataCell label={copy.estimatedCompletion} value={result.estimatedCompletionLabel ?? "—"} muted={muted} strong={strong} />
              <DataCell
                label={copy.fundingProgress}
                value={result.fundingProgressPct == null ? "—" : `${result.fundingProgressPct.toFixed(2)}%`}
                muted={muted}
                strong={strong}
              />
            </div>
            <p className={`mt-3 text-[10px] font-bold uppercase tracking-[0.1em] ${muted}`}>{copy.allocation}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ALLOCATION_PCT_OPTIONS.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => patchSettings({ allocationPct: pct, customContributionNpr: undefined })}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                    ledger.settings.allocationPct === pct && ledger.settings.customContributionNpr == null
                      ? "bg-emerald-600 text-white"
                      : light
                        ? "bg-emerald-50"
                        : "bg-white/10"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <p className={`mt-4 text-[10px] font-bold uppercase tracking-[0.1em] ${muted}`}>Deadline plans</p>
            <div className="mt-2 space-y-2">
              {result.fundingPlans.map((plan) => (
                <button
                  key={plan.deadlineMonths}
                  type="button"
                  onClick={() => patchSettings({ fundingDeadlineMonths: plan.deadlineMonths })}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs ${
                    ledger.settings.fundingDeadlineMonths === plan.deadlineMonths
                      ? "border-emerald-400 bg-emerald-50/80 text-emerald-950"
                      : light
                        ? "border-emerald-100"
                        : "border-white/10"
                  }`}
                >
                  <span className="font-black">{plan.labelEn}</span>
                  <span className="font-bold">
                    {plan.requiredMonthlyContributionNpr == null
                      ? "—"
                      : money(plan.requiredMonthlyContributionNpr)}{" "}
                    · {plan.affordability.replace(/_/g, " ")}
                  </span>
                </button>
              ))}
            </div>
            <p className={`mt-2 text-[11px] ${muted}`}>{copy.estimateNote}</p>
          </Expandable>
        ) : null}

        {!showOnboarding ? (
          <Expandable title="Safety Timeline" open={openSections.timeline} onToggle={() => toggle("timeline")} card={card} muted={muted}>
            <p className={`mb-2 text-[11px] ${muted}`}>
              Milestone status is independent of your selected funding target and does not guarantee financial security.
            </p>
            <ul className="space-y-2">
              {result.milestones.map((m) => (
                <li key={m.months} className={`rounded-xl border px-3 py-2 ${light ? "border-emerald-100" : "border-white/10"}`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`font-black ${strong}`}>
                      {m.months} mo · {language === "np" ? m.labelNe : language === "kr" ? m.labelKo : m.labelEn}
                    </span>
                    <span className={m.achieved ? "font-black text-emerald-600" : muted}>
                      {m.achieved ? "Achieved" : money(m.remainingNpr) + " left"}
                    </span>
                  </div>
                  <div className={`mt-1.5 h-1.5 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${m.progressPct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Expandable>
        ) : null}

        {!showOnboarding ? (
          <Expandable title="Job Loss & Emergency Simulator" open={openSections.simulator} onToggle={() => toggle("simulator")} card={card} muted={muted}>
            <p className={`mb-2 text-[11px] font-semibold ${muted}`}>
              Simulation only — does not change your actual records.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EMERGENCY_SCENARIO_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setScenarioId(p.id);
                    setSimOneTime(String(p.defaultOneTimeCostNpr || 0));
                    setSimIncome("");
                  }}
                  className={`rounded-xl px-2.5 py-1.5 text-[11px] font-black ${
                    scenarioId === p.id ? "bg-emerald-600 text-white" : light ? "bg-emerald-50" : "bg-white/10"
                  }`}
                >
                  {p.labelEn}
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className={`text-[10px] font-bold uppercase ${muted}`}>
                One-time cost
                <input
                  className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm font-black outline-none ${light ? "border-emerald-100" : "border-white/15 bg-white/5"}`}
                  value={simOneTime}
                  onChange={(e) => setSimOneTime(e.target.value.replace(/[^\d.]/g, ""))}
                />
              </label>
              <label className={`text-[10px] font-bold uppercase ${muted}`}>
                Remaining income
                <input
                  className={`mt-1 w-full rounded-xl border px-2 py-2 text-sm font-black outline-none ${light ? "border-emerald-100" : "border-white/15 bg-white/5"}`}
                  placeholder="Auto"
                  value={simIncome}
                  onChange={(e) => setSimIncome(e.target.value.replace(/[^\d.]/g, ""))}
                />
              </label>
            </div>
            {simResult ? (
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <DataCell
                  label="Survival runway"
                  value={
                    simResult.zeroGap
                      ? "No monthly gap"
                      : simResult.safetyRunwayMonths == null
                        ? "—"
                        : `${pluralMonths(simResult.safetyRunwayMonths)} (~${simResult.safetyRunwayDays ?? 0} days)`
                  }
                  muted={muted}
                  strong={strong}
                />
                <DataCell label="Available after shock" value={money(simResult.availableReserveNpr)} muted={muted} strong={strong} />
                <DataCell label="Monthly funding gap" value={money(simResult.monthlyFundingGapNpr)} muted={muted} strong={strong} />
                <DataCell label="12-mo shortfall" value={money(simResult.financialShortfallNpr)} muted={muted} strong={strong} />
              </div>
            ) : null}
          </Expandable>
        ) : null}

        <Expandable title={copy.growth} open={openSections.growth} onToggle={() => toggle("growth")} card={card} muted={muted}>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {([3, 6, 12, 24] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => patchSettings({ growthChartMonths: m })}
                className={`rounded-lg px-2 py-1 text-[11px] font-black ${
                  (ledger.settings.growthChartMonths ?? 12) === m
                    ? "bg-emerald-600 text-white"
                    : light
                      ? "bg-emerald-50"
                      : "bg-white/10"
                }`}
              >
                {m}m
              </button>
            ))}
          </div>
          <div className="h-44 w-full">
            {growthSeries.some((p) => p.kind === "actual" && (p.reserve ?? 0) >= 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthSeries}>
                  <defs>
                    <linearGradient id="ef-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={light ? "#d1fae5" : "#134e4a"} />
                  <XAxis dataKey="date" hide />
                  <YAxis width={48} tick={{ fontSize: 10 }} stroke={light ? "#64748b" : "#6ee7b7"} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Area type="monotone" dataKey="reserve" stroke="#059669" fill="url(#ef-g)" strokeWidth={2} name="Actual" connectNulls={false} />
                  <Line type="monotone" dataKey="projection" stroke="#84cc16" strokeDasharray="5 4" strokeWidth={2} dot={false} name="Projection" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className={`grid h-full place-items-center rounded-xl border border-dashed text-center text-xs ${muted}`}>
                <div>
                  <p className="font-bold">{copy.noTransactions}</p>
                  <p className="mt-1">Current reserve {money(result.currentReserveNpr)} is your known starting point.</p>
                </div>
              </div>
            )}
          </div>
          <ul className="mt-3 max-h-40 space-y-1.5 overflow-auto text-xs">
            {ledger.transactions.slice(0, 8).map((tx) => (
              <li key={tx.id} className="flex items-center justify-between gap-2">
                <span className={muted}>
                  {tx.date} · {tx.type}
                  {tx.note ? ` · ${tx.note}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  <span className={`font-black ${strong}`}>{money(tx.amountNpr)}</span>
                  <button type="button" className="text-[10px] font-bold text-amber-600" onClick={() => reverseTransaction(tx.id)}>
                    Reverse
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Expandable>

        <Expandable title={copy.insights} open={openSections.insights} onToggle={() => toggle("insights")} card={card} muted={muted}>
          <ul className="space-y-2">
            {result.insights.map((insight) => (
              <li
                key={insight.id}
                className={`rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                  insight.tone === "critical" || insight.tone === "warning"
                    ? light
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                    : light
                      ? "border-emerald-100 bg-emerald-50/70"
                      : "border-white/10 bg-white/5"
                }`}
              >
                <p className="font-black">
                  {language === "np" ? insight.titleNe : language === "kr" ? insight.titleKo : insight.titleEn}
                </p>
                <p className="mt-1 font-semibold">{insightText(insight, language)}</p>
                {insight.actionEn ? (
                  <p className={`mt-1 ${muted}`}>
                    {language === "np" ? insight.actionNe : language === "kr" ? insight.actionKo : insight.actionEn}
                  </p>
                ) : null}
                {insight.href ? (
                  <Link href={insight.href} className="mt-1 inline-block font-black underline">
                    Next step →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </Expandable>

        <section className={`mt-3 ${card} p-3`}>
          <div className="grid grid-cols-3 gap-2">
            <ActionBtn label={copy.linkSavingsGoal} icon={Link2} onClick={() => setSheet("link")} light={light} />
            <ActionBtn label={copy.editSettings} icon={Settings2} onClick={openSettings} light={light} />
            <ActionBtn label={copy.reviewCalculation} icon={Calculator} onClick={() => setSheet("calc")} light={light} />
          </div>
          <button type="button" onClick={() => setShowAi((v) => !v)} className={`mt-3 text-xs font-black underline ${muted}`}>
            {showAi ? "Hide" : "Show"} extended AI safety analysis
          </button>
          {showAi && legacyAiResult ? (
            <div className="mt-3">
              <EmergencyFundAiSafetyAnalysis result={legacyAiResult} />
            </div>
          ) : null}
        </section>
      </section>

      <AnimatePresence>
        {sheet ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSheet(null)}
          >
            <motion.div
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className={`w-full max-w-md rounded-3xl p-4 ${light ? "bg-white text-emerald-950" : "bg-[#0b1f18] text-emerald-50"}`}
              onClick={(e) => e.stopPropagation()}
            >
              {sheet === "contribute" || sheet === "withdraw" ? (
                <>
                  <h3 className="text-base font-black">
                    {sheet === "contribute" ? copy.addContribution : copy.recordWithdrawal}
                  </h3>
                  <p className={`mt-1 text-[11px] ${muted}`}>
                    Updates your emergency reserve tracker only — no bank transfer is initiated.
                  </p>
                  <label className="mt-3 block text-[10px] font-bold uppercase">
                    {copy.amount} (NPR)
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-2.5 text-lg font-black outline-none ${light ? "border-emerald-100" : "border-white/15 bg-white/5"}`}
                      value={amountRaw}
                      onChange={(e) => setAmountRaw(e.target.value.replace(/[^\d.]/g, ""))}
                    />
                  </label>
                  <label className="mt-2 block text-[10px] font-bold uppercase">
                    {copy.date}
                    <input
                      type="date"
                      className={`mt-1 w-full rounded-2xl border px-3 py-2.5 text-sm font-bold outline-none ${light ? "border-emerald-100" : "border-white/15 bg-white/5"}`}
                      value={dateRaw}
                      onChange={(e) => setDateRaw(e.target.value)}
                    />
                  </label>
                  <label className="mt-2 block text-[10px] font-bold uppercase">
                    {copy.note}
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-2.5 text-sm outline-none ${light ? "border-emerald-100" : "border-white/15 bg-white/5"}`}
                      value={noteRaw}
                      onChange={(e) => setNoteRaw(e.target.value)}
                      maxLength={500}
                    />
                  </label>
                  {txError ? <p className="mt-2 text-xs font-semibold text-amber-600">{txError}</p> : null}
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setSheet(null)} className={`flex-1 rounded-full border py-2 text-sm font-black ${light ? "border-emerald-100" : "border-white/15"}`}>
                      {copy.cancel}
                    </button>
                    <button type="button" onClick={submitTx} className="flex-1 rounded-full bg-emerald-600 py-2 text-sm font-black text-white">
                      {copy.save}
                    </button>
                  </div>
                </>
              ) : null}

              {sheet === "link" ? (
                <>
                  <h3 className="text-base font-black">{copy.linkSavingsGoal}</h3>
                  <ul className="mt-3 max-h-56 space-y-2 overflow-auto">
                    {emergencyGoals.length === 0 ? (
                      <li className={`text-xs ${muted}`}>
                        No emergency goals. <Link href="/savings-tracker" className="font-black underline">Open Savings</Link>
                      </li>
                    ) : (
                      emergencyGoals.map((goal) => {
                        const linked = ledger.settings.linkedSavingsGoalIds.includes(goal.id);
                        return (
                          <li key={goal.id}>
                            <button
                              type="button"
                              onClick={() => toggleLinkedGoal(goal.id)}
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold ${
                                linked ? "border-emerald-400 bg-emerald-50 text-emerald-950" : light ? "border-emerald-100" : "border-white/15"
                              }`}
                            >
                              <span>
                                {goal.icon} {goal.name}
                              </span>
                              <span>{money(goal.savedAmountNpr)}</span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                  <button type="button" onClick={() => setSheet(null)} className="mt-4 w-full rounded-full bg-emerald-600 py-2 text-sm font-black text-white">
                    {copy.save}
                  </button>
                </>
              ) : null}

              {sheet === "settings" ? (
                <>
                  <h3 className="text-base font-black">{copy.editSettings}</h3>
                  {(
                    [
                      ["openingBalanceNpr", copy.openingBalance],
                      ["manualMonthlyExpenseNpr", copy.manualExpense],
                      ["expenseBasisOverrideNpr", copy.overrideBasis],
                      ["dependents", copy.dependents],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="mt-2 block text-[10px] font-bold uppercase">
                      {label}
                      <input
                        className={`mt-1 w-full rounded-2xl border px-3 py-2.5 text-sm font-black outline-none ${light ? "border-emerald-100" : "border-white/15 bg-white/5"}`}
                        value={settingsDraft[key]}
                        onChange={(e) =>
                          setSettingsDraft((d) => ({
                            ...d,
                            [key]: e.target.value.replace(/[^\d.]/g, ""),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <button type="button" onClick={saveSettings} className="mt-4 w-full rounded-full bg-emerald-600 py-2 text-sm font-black text-white">
                    {copy.save}
                  </button>
                </>
              ) : null}

              {sheet === "calc" ? (
                <>
                  <h3 className="text-base font-black">{copy.reviewCalculation}</h3>
                  <ul className={`mt-3 space-y-1.5 text-xs font-semibold ${muted}`}>
                    <li>Basis = MAX(actual essential, planned) → <span className={strong}>{money(result.recommendedExpenseBasisNpr)}</span></li>
                    <li>Target = basis × {result.protectionMonths} → <span className={strong}>{money(result.emergencyFundTargetNpr)}</span></li>
                    <li>Reserve = opening + contributions − withdrawals → <span className={strong}>{money(result.currentReserveNpr)}</span></li>
                    <li>Capacity uses recurring income when available → <span className={strong}>{money(result.availableContributionCapacityNpr)}</span></li>
                  </ul>
                  <button type="button" onClick={() => setSheet(null)} className="mt-4 w-full rounded-full bg-emerald-600 py-2 text-sm font-black text-white">
                    {copy.cancel}
                  </button>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function Expandable({
  title,
  open,
  onToggle,
  card,
  muted,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  card: string;
  muted: string;
  children: ReactNode;
}) {
  return (
    <section className={`mt-3 ${card}`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-3 py-3 text-left sm:px-4">
        <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${muted}`}>{title}</span>
        <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""} ${muted}`} />
      </button>
      {open ? <div className="border-t border-emerald-100/20 px-3 pb-3 sm:px-4">{children}</div> : null}
    </section>
  );
}

function MiniKpi({
  label,
  value,
  icon: Icon,
  strong,
  muted,
  light,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  strong: string;
  muted: string;
  light: boolean;
}) {
  return (
    <div className={`rounded-xl p-2 ${light ? "bg-emerald-50/80" : "bg-white/5"}`}>
      <div className="flex items-start justify-between gap-1">
        <p className={`text-[9px] font-black uppercase tracking-[0.08em] ${muted}`}>{label}</p>
        <Icon size={12} className="opacity-60" />
      </div>
      <p className={`mt-1 text-sm font-black leading-tight sm:text-base ${strong}`}>{value}</p>
    </div>
  );
}

function DataCell({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted: string;
  strong: string;
}) {
  return (
    <div>
      <p className={`text-[9px] font-bold uppercase tracking-[0.08em] ${muted}`}>{label}</p>
      <p className={`mt-0.5 text-sm font-black ${strong}`}>{value}</p>
    </div>
  );
}

function ActionBtn({
  label,
  icon: Icon,
  onClick,
  light,
}: {
  label: string;
  icon: typeof Wallet;
  onClick: () => void;
  light: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[64px] flex-col items-start justify-center gap-1 rounded-xl border px-2.5 py-2 text-left text-[10px] font-black ${
        light ? "border-emerald-100 bg-white text-emerald-900" : "border-white/15 bg-white/5"
      }`}
    >
      <Icon size={14} className="text-emerald-500" />
      {label}
    </button>
  );
}
