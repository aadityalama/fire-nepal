"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  Link2,
  MinusCircle,
  PiggyBank,
  PlusCircle,
  Settings2,
  Shield,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
import {
  getEmergencyFundCopy,
  localizeDataSourceLabel,
} from "@/lib/emergency-fund/i18n";
import { runEmergencyFundProjection } from "@/lib/emergency-fund";
import { formatMoney } from "@/lib/expense-utils";

function money(n: number | null | undefined, currency: "NPR" | "KRW" | "USD" = "NPR") {
  if (n == null || !Number.isFinite(n)) return "—";
  return formatMoney(n, currency);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function insightMessage(
  insight: { messageEn: string; messageNe: string; messageKo: string },
  language: string,
) {
  if (language === "np") return insight.messageNe;
  if (language === "kr") return insight.messageKo;
  return insight.messageEn;
}

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
    recordTransaction,
    patchSettings,
    toggleLinkedGoal,
  } = useIntelligentEmergencyFund();

  const [sheet, setSheet] = useState<
    null | "contribute" | "withdraw" | "settings" | "link" | "calc"
  >(null);
  const [amountRaw, setAmountRaw] = useState("");
  const [noteRaw, setNoteRaw] = useState("");
  const [dateRaw, setDateRaw] = useState(todayIso());
  const [customMonthsRaw, setCustomMonthsRaw] = useState("");
  const [showAi, setShowAi] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({
    openingBalanceNpr: "",
    manualMonthlyExpenseNpr: "",
    expenseBasisOverrideNpr: "",
    employmentType: "" as "" | EmergencyFundSettingsEmployment,
    dependents: "0",
    incomeSources: "" as "" | "single" | "multiple",
  });

  const shell = light
    ? "min-h-screen bg-[radial-gradient(ellipse_at_top,_#ecfdf5_0%,_#f8fafc_45%,_#f1f5f9_100%)] text-emerald-950"
    : "premium-shell min-h-screen bg-[#04150f] text-emerald-50";

  const card = light
    ? "rounded-3xl border border-emerald-100/80 bg-white/80 shadow-[0_18px_50px_rgba(6,78,59,0.08)] backdrop-blur"
    : "rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur";

  const muted = light ? "text-slate-500" : "text-emerald-100/65";
  const strong = light ? "text-emerald-950" : "text-white";

  const safetyTone =
    result.safetyStatus === "critical" || result.safetyStatus === "high_risk"
      ? "text-amber-600"
      : result.safetyStatus === "building_safety"
        ? "text-lime-600"
        : "text-emerald-600";

  const legacyAiResult = useMemo(() => {
    if (!result.recommendedExpenseBasisNpr) return null;
    return runEmergencyFundProjection({
      monthlyExpense: result.recommendedExpenseBasisNpr,
      currentFund: result.currentReserveNpr,
      monthlySave: result.recommendedMonthlyContributionNpr ?? 0,
      riskLevel:
        ledger.settings.employmentType === "overseas" ||
        ledger.settings.employmentType === "uncertain"
          ? "high"
          : (ledger.settings.dependents ?? 0) > 0
            ? "moderate"
            : "stable",
    });
  }, [ledger.settings.dependents, ledger.settings.employmentType, result]);

  const openTx = (kind: "contribute" | "withdraw") => {
    setAmountRaw("");
    setNoteRaw("");
    setDateRaw(todayIso());
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
      employmentType: (ledger.settings.employmentType ?? "") as
        | ""
        | EmergencyFundSettingsEmployment,
      dependents: String(ledger.settings.dependents ?? 0),
      incomeSources: (ledger.settings.incomeSources ?? "") as "" | "single" | "multiple",
    });
    setSheet("settings");
  };

  const saveSettings = () => {
    const opening = Math.max(
      0,
      Math.round(Number(settingsDraft.openingBalanceNpr.replace(/,/g, "")) || 0),
    );
    const manualRaw = settingsDraft.manualMonthlyExpenseNpr.replace(/,/g, "").trim();
    const overrideRaw = settingsDraft.expenseBasisOverrideNpr.replace(/,/g, "").trim();
    const manual = manualRaw
      ? Math.max(0, Math.round(Number(manualRaw) || 0)) || undefined
      : undefined;
    const override = overrideRaw
      ? Math.max(0, Math.round(Number(overrideRaw) || 0)) || undefined
      : undefined;
    patchSettings({
      openingBalanceNpr: opening,
      manualMonthlyExpenseNpr: manual,
      expenseBasisOverrideNpr: override,
      employmentType: settingsDraft.employmentType || undefined,
      dependents: Math.max(0, Math.round(Number(settingsDraft.dependents) || 0)),
      incomeSources: settingsDraft.incomeSources || undefined,
    });
    setSheet(null);
  };

  const submitTx = () => {
    const amount = Math.max(0, Math.round(Number(amountRaw.replace(/,/g, "")) || 0));
    if (amount <= 0) return;
    recordTransaction({
      type: sheet === "withdraw" ? "withdrawal" : "contribution",
      amountNpr: amount,
      date: dateRaw || todayIso(),
      note: noteRaw.trim() || undefined,
      originalCurrency: "NPR",
      originalAmount: amount,
    });
    setSheet(null);
  };

  if (loading) {
    return (
      <main className={`${shell} px-4 pb-24 pt-6 sm:px-6 lg:px-10`}>
        <div className="mx-auto flex max-w-6xl items-center justify-center py-24">
          <p className={`text-sm font-bold ${muted}`}>{copy.loading}</p>
        </div>
      </main>
    );
  }

  const showOnboarding = !result.hasSufficientData;

  return (
    <main className={`${shell} overflow-hidden px-4 pb-28 pt-6 sm:px-6 lg:px-10`}>
      <section className="mx-auto max-w-6xl">
        <BackToReturnChecklistBannerSlot light={light} className="mb-3" />

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/finance"
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 ${
              light
                ? "border-emerald-100 bg-white/80 text-emerald-800"
                : "border-white/15 bg-white/5 text-emerald-100"
            }`}
          >
            <ArrowLeft size={16} />
            {copy.backToFinance}
          </Link>
          <p className={`text-xs font-bold ${muted}`}>
            {copy.lastUpdated}:{" "}
            {new Date(result.lastUpdatedAt).toLocaleString(
              language === "np" ? "ne-NP" : language === "kr" ? "ko-KR" : "en-US",
            )}
          </p>
        </div>

        {/* Hero / Section A */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`relative overflow-hidden ${card} p-5 sm:p-7`}
        >
          <div
            className={`pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl ${
              light ? "bg-emerald-300/30" : "bg-emerald-400/15"
            }`}
          />
          <div
            className={`pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full blur-3xl ${
              light ? "bg-lime-200/40" : "bg-lime-300/10"
            }`}
          />
          <div className="relative">
            <p
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${
                light
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-white/15 bg-white/10 text-emerald-100"
              }`}
            >
              <Sparkles size={13} />
              Finance · Emergency Fund
            </p>
            <h1 className={`mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl ${strong}`}>
              {copy.title}
            </h1>
            <p className={`mt-2 max-w-2xl text-sm font-medium leading-relaxed sm:text-base ${muted}`}>
              {copy.subtitle}
            </p>

            {showOnboarding ? (
              <div
                className={`mt-6 rounded-2xl border border-dashed p-5 ${
                  light ? "border-emerald-200 bg-emerald-50/60" : "border-white/20 bg-white/5"
                }`}
              >
                <h2 className={`text-lg font-black ${strong}`}>{copy.onboardingTitle}</h2>
                <p className={`mt-2 text-sm ${muted}`}>{copy.onboardingBody}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href="/cashflow-dashboard"
                    className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-black text-white"
                  >
                    {copy.openCashflow}
                  </Link>
                  <Link
                    href="/expense-dashboard?finance=personal"
                    className={`rounded-full border px-4 py-2 text-sm font-black ${
                      light ? "border-emerald-200 text-emerald-800" : "border-white/20 text-white"
                    }`}
                  >
                    {copy.addExpenses}
                  </Link>
                  <Link
                    href="/budget"
                    className={`rounded-full border px-4 py-2 text-sm font-black ${
                      light ? "border-emerald-200 text-emerald-800" : "border-white/20 text-white"
                    }`}
                  >
                    {copy.openBudget}
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 lg:grid-cols-[160px_1fr]">
                <div className="flex justify-center lg:justify-start">
                  <SavingsRingProgress
                    pct={result.fundingProgressRingPct ?? 0}
                    label={copy.fundingProgress}
                    sublabel={
                      result.fundingProgressPct != null && result.fundingProgressPct > 100
                        ? `${result.fundingProgressPct.toFixed(0)}%`
                        : undefined
                    }
                    size={148}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Metric
                    label={copy.target}
                    value={money(result.emergencyFundTargetNpr)}
                    icon={Target}
                    strong={strong}
                    muted={muted}
                    cardClass={light ? "bg-emerald-50/70" : "bg-white/5"}
                  />
                  <Metric
                    label={copy.currentReserve}
                    value={money(result.currentReserveNpr)}
                    icon={Shield}
                    strong={strong}
                    muted={muted}
                    cardClass={light ? "bg-emerald-50/70" : "bg-white/5"}
                  />
                  <Metric
                    label={copy.fundingProgress}
                    value={
                      result.fundingProgressPct == null
                        ? "—"
                        : `${result.fundingProgressPct.toFixed(2)}%`
                    }
                    icon={PiggyBank}
                    strong={strong}
                    muted={muted}
                    cardClass={light ? "bg-emerald-50/70" : "bg-white/5"}
                  />
                  <Metric
                    label={copy.safetyStatus}
                    value={
                      result.safetyStatus ? copy.safety[result.safetyStatus] : "—"
                    }
                    icon={AlertTriangle}
                    strong={safetyTone}
                    muted={muted}
                    cardClass={light ? "bg-emerald-50/70" : "bg-white/5"}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Section B — Synced data */}
        {!showOnboarding ? (
          <section className={`mt-5 ${card} p-5 sm:p-6`}>
            <h2 className={`text-sm font-black uppercase tracking-[0.14em] ${muted}`}>
              {copy.syncedData}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DataRow label={copy.monthlyNetIncome} value={money(result.monthlyNetIncomeNpr)} muted={muted} strong={strong} />
              <DataRow label={copy.actualMonthlyExpenses} value={money(result.actualMonthlyTotalExpensesNpr)} muted={muted} strong={strong} />
              <DataRow label={copy.essentialAverage} value={money(result.actualEssentialMonthlyAvgNpr)} muted={muted} strong={strong} />
              <DataRow label={copy.plannedEssential} value={money(result.plannedEssentialMonthlyNpr)} muted={muted} strong={strong} />
              <DataRow label={copy.recommendedBasis} value={money(result.recommendedExpenseBasisNpr)} muted={muted} strong={strong} />
              <DataRow
                label={copy.availableSurplus}
                value={money(result.availableContributionCapacityNpr)}
                muted={muted}
                strong={strong}
              />
            </div>
            <div className={`mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold ${muted}`}>
              <span>
                {copy.dataSource}: {localizeDataSourceLabel(result.dataSourceLabel, language)}
              </span>
              {result.calculationPeriodLabel ? (
                <span>
                  {copy.calculationPeriod}: {result.calculationPeriodLabel}
                </span>
              ) : null}
              {result.expenseBasisOverridden ? (
                <span className="text-amber-600">{copy.overrideBasis}</span>
              ) : null}
            </div>
            {!result.categoryClassificationReliable ? (
              <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-amber-600">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                {copy.categoryLimitation}
              </p>
            ) : null}
            {result.currency.incomplete || result.currency.stale ? (
              <p className="mt-2 text-sm font-semibold text-amber-600">{copy.currencyFlag}</p>
            ) : null}
            {budgetsError ? (
              <p className="mt-2 text-sm font-semibold text-amber-600">{budgetsError}</p>
            ) : null}
          </section>
        ) : null}

        {/* Section C — Protection period */}
        <section className={`mt-5 ${card} p-5 sm:p-6`}>
          <h2 className={`text-sm font-black uppercase tracking-[0.14em] ${muted}`}>
            {copy.protectionPeriod}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
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
                  className={`min-h-11 rounded-2xl px-4 text-sm font-black transition ${
                    active
                      ? "bg-emerald-600 text-white shadow"
                      : light
                        ? "border border-emerald-100 bg-white text-emerald-900"
                        : "border border-white/15 bg-white/5 text-emerald-50"
                  }`}
                >
                  {m} mo
                </button>
              );
            })}
            <label
              className={`flex min-h-11 items-center gap-2 rounded-2xl border px-3 ${
                light ? "border-emerald-100 bg-white" : "border-white/15 bg-white/5"
              }`}
            >
              <span className={`text-xs font-bold ${muted}`}>{copy.customMonths}</span>
              <input
                className={`w-16 bg-transparent text-right text-sm font-black outline-none ${strong}`}
                inputMode="numeric"
                value={
                  customMonthsRaw !== ""
                    ? customMonthsRaw
                    : (PROTECTION_MONTH_OPTIONS as readonly number[]).includes(
                          ledger.settings.protectionMonths,
                        )
                      ? ""
                      : String(ledger.settings.protectionMonths)
                }
                placeholder="—"
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, "");
                  setCustomMonthsRaw(v);
                  const n = Number(v);
                  if (n >= 1 && n <= 36) patchSettings({ protectionMonths: n });
                }}
              />
            </label>
          </div>
        </section>

        {/* Section D — Funding plan */}
        {!showOnboarding ? (
          <section className={`mt-5 ${card} p-5 sm:p-6`}>
            <h2 className={`text-sm font-black uppercase tracking-[0.14em] ${muted}`}>
              {copy.fundingPlan}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DataRow label={copy.remainingShortfall} value={money(result.remainingShortfallNpr)} muted={muted} strong={strong} />
              <DataRow
                label={copy.recommendedContribution}
                value={
                  result.fullyFunded
                    ? copy.fullyFunded
                    : result.additionalSavingsRequired
                      ? copy.additionalSavingsRequired
                      : money(result.recommendedMonthlyContributionNpr)
                }
                muted={muted}
                strong={strong}
              />
              <DataRow
                label={copy.estimatedCompletion}
                value={result.estimatedCompletionLabel ?? "—"}
                muted={muted}
                strong={strong}
              />
              <DataRow
                label={copy.safetyRunway}
                value={
                  result.safetyRunwayMonths == null
                    ? "—"
                    : `${result.safetyRunwayMonths.toFixed(2)} mo`
                }
                muted={muted}
                strong={strong}
              />
            </div>

            <p className={`mt-4 text-xs font-bold ${muted}`}>{copy.allocation}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ALLOCATION_PCT_OPTIONS.map((pct) => {
                const active =
                  ledger.settings.allocationPct === pct &&
                  ledger.settings.customContributionNpr == null;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() =>
                      patchSettings({ allocationPct: pct, customContributionNpr: undefined })
                    }
                    className={`rounded-full px-3 py-1.5 text-xs font-black ${
                      active
                        ? "bg-emerald-600 text-white"
                        : light
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-white/10 text-emerald-100"
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
              <label
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
                  light ? "bg-emerald-50 text-emerald-800" : "bg-white/10 text-emerald-100"
                }`}
              >
                Custom
                <input
                  className="w-20 bg-transparent text-right outline-none"
                  inputMode="numeric"
                  placeholder="NPR"
                  defaultValue={ledger.settings.customContributionNpr ?? ""}
                  onBlur={(e) => {
                    const n = Number(String(e.target.value).replace(/,/g, ""));
                    if (Number.isFinite(n) && n >= 0) {
                      patchSettings({ customContributionNpr: Math.round(n) });
                    } else {
                      patchSettings({ customContributionNpr: undefined });
                    }
                  }}
                />
              </label>
            </div>
            {result.contributionExceedsCapacity ? (
              <p className="mt-3 text-sm font-semibold text-amber-600">{copy.contributionWarning}</p>
            ) : null}
            {result.negativeCashflow ? (
              <p className="mt-2 text-sm font-semibold text-amber-600">{copy.negativeCashflowHint}</p>
            ) : null}
            <p className={`mt-3 text-xs ${muted}`}>{copy.estimateNote}</p>
          </section>
        ) : null}

        {/* Section E — Growth */}
        <section className={`mt-5 ${card} p-5 sm:p-6`}>
          <h2 className={`text-sm font-black uppercase tracking-[0.14em] ${muted}`}>
            {copy.growth}
          </h2>
          <div className="mt-4 h-52 w-full">
            {growthSeries.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthSeries}>
                  <defs>
                    <linearGradient id="ef-growth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={light ? "#d1fae5" : "#134e4a"} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke={light ? "#64748b" : "#6ee7b7"} />
                  <YAxis tick={{ fontSize: 10 }} stroke={light ? "#64748b" : "#6ee7b7"} width={56} />
                  <Tooltip
                    formatter={(v: number) => money(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      background: light ? "#fff" : "#064e3b",
                      color: light ? "#064e3b" : "#ecfdf5",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="reserve"
                    stroke="#059669"
                    fill="url(#ef-growth)"
                    strokeWidth={2.5}
                    name="Actual reserve"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className={`grid h-full place-items-center text-sm font-semibold ${muted}`}>
                {copy.noTransactions}
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TxList
              title={copy.contributions}
              empty={copy.noTransactions}
              items={ledger.transactions.filter((t) => t.type === "contribution")}
              muted={muted}
              strong={strong}
            />
            <TxList
              title={copy.withdrawals}
              empty={copy.noTransactions}
              items={ledger.transactions.filter((t) => t.type === "withdrawal")}
              muted={muted}
              strong={strong}
            />
          </div>
        </section>

        {/* Section F — Insights */}
        <section className={`mt-5 ${card} p-5 sm:p-6`}>
          <h2 className={`text-sm font-black uppercase tracking-[0.14em] ${muted}`}>
            {copy.insights}
          </h2>
          <ul className="mt-4 space-y-3">
            {result.insights.map((insight) => (
              <li
                key={insight.id}
                className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed ${
                  insight.tone === "critical" || insight.tone === "warning"
                    ? light
                      ? "border-amber-200 bg-amber-50 text-amber-950"
                      : "border-amber-400/30 bg-amber-400/10 text-amber-100"
                    : light
                      ? "border-emerald-100 bg-emerald-50/70 text-emerald-950"
                      : "border-white/10 bg-white/5 text-emerald-50"
                }`}
              >
                {insight.href ? (
                  <Link href={insight.href} className="underline-offset-2 hover:underline">
                    {insightMessage(insight, language)}
                  </Link>
                ) : (
                  insightMessage(insight, language)
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Section G — Quick actions */}
        <section className={`mt-5 ${card} p-5 sm:p-6`}>
          <h2 className={`text-sm font-black uppercase tracking-[0.14em] ${muted}`}>
            {copy.quickActions}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <ActionBtn label={copy.addContribution} icon={PlusCircle} onClick={() => openTx("contribute")} light={light} />
            <ActionBtn label={copy.recordWithdrawal} icon={MinusCircle} onClick={() => openTx("withdraw")} light={light} />
            <ActionBtn label={copy.linkSavingsGoal} icon={Link2} onClick={() => setSheet("link")} light={light} />
            <ActionBtn label={copy.editSettings} icon={Settings2} onClick={openSettings} light={light} />
            <ActionBtn label={copy.reviewCalculation} icon={Calculator} onClick={() => setSheet("calc")} light={light} />
          </div>
        </section>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowAi((v) => !v)}
            className={`text-sm font-black underline-offset-2 hover:underline ${muted}`}
          >
            {showAi ? "Hide" : "Show"} extended AI safety analysis
          </button>
          {showAi && legacyAiResult ? (
            <div className="mt-4">
              <EmergencyFundAiSafetyAnalysis result={legacyAiResult} />
            </div>
          ) : null}
        </div>
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
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className={`w-full max-w-md rounded-3xl p-5 ${
                light ? "bg-white text-emerald-950" : "bg-[#0b1f18] text-emerald-50"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {sheet === "contribute" || sheet === "withdraw" ? (
                <>
                  <h3 className="text-lg font-black">
                    {sheet === "contribute" ? copy.addContribution : copy.recordWithdrawal}
                  </h3>
                  <p className={`mt-1 text-xs ${muted}`}>
                    Recording here updates your emergency reserve tracker — it does not initiate a bank transfer.
                  </p>
                  <label className="mt-4 block text-xs font-bold uppercase tracking-wide">
                    {copy.amount} (NPR)
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-lg font-black outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      inputMode="decimal"
                      value={amountRaw}
                      onChange={(e) => setAmountRaw(e.target.value.replace(/[^\d.]/g, ""))}
                    />
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase tracking-wide">
                    {copy.date}
                    <input
                      type="date"
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-bold outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      value={dateRaw}
                      onChange={(e) => setDateRaw(e.target.value)}
                    />
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase tracking-wide">
                    {copy.note}
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-semibold outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      value={noteRaw}
                      onChange={(e) => setNoteRaw(e.target.value)}
                      maxLength={500}
                    />
                  </label>
                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSheet(null)}
                      className={`flex-1 rounded-full border py-2.5 text-sm font-black ${
                        light ? "border-emerald-100" : "border-white/15"
                      }`}
                    >
                      {copy.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={submitTx}
                      className="flex-1 rounded-full bg-emerald-600 py-2.5 text-sm font-black text-white"
                    >
                      {copy.save}
                    </button>
                  </div>
                </>
              ) : null}

              {sheet === "link" ? (
                <>
                  <h3 className="text-lg font-black">{copy.linkSavingsGoal}</h3>
                  <p className={`mt-1 text-xs ${muted}`}>
                    Only goals explicitly designated as emergency reserves are eligible.
                  </p>
                  <ul className="mt-4 max-h-64 space-y-2 overflow-auto">
                    {emergencyGoals.length === 0 ? (
                      <li className={`text-sm ${muted}`}>
                        No emergency savings goals yet.{" "}
                        <Link href="/savings-tracker" className="font-black underline">
                          Open Savings
                        </Link>
                      </li>
                    ) : (
                      emergencyGoals.map((goal) => {
                        const linked = ledger.settings.linkedSavingsGoalIds.includes(goal.id);
                        return (
                          <li key={goal.id}>
                            <button
                              type="button"
                              onClick={() => toggleLinkedGoal(goal.id)}
                              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm font-bold ${
                                linked
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                                  : light
                                    ? "border-emerald-100"
                                    : "border-white/15"
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
                  <button
                    type="button"
                    onClick={() => setSheet(null)}
                    className="mt-4 w-full rounded-full bg-emerald-600 py-2.5 text-sm font-black text-white"
                  >
                    {copy.save}
                  </button>
                </>
              ) : null}

              {sheet === "settings" ? (
                <>
                  <h3 className="text-lg font-black">{copy.editSettings}</h3>
                  <label className="mt-4 block text-xs font-bold uppercase">
                    {copy.openingBalance}
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-black outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      inputMode="numeric"
                      value={settingsDraft.openingBalanceNpr}
                      onChange={(e) =>
                        setSettingsDraft((d) => ({
                          ...d,
                          openingBalanceNpr: e.target.value.replace(/[^\d.]/g, ""),
                        }))
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase">
                    {copy.manualExpense}
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-black outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      inputMode="numeric"
                      value={settingsDraft.manualMonthlyExpenseNpr}
                      placeholder="Optional"
                      onChange={(e) =>
                        setSettingsDraft((d) => ({
                          ...d,
                          manualMonthlyExpenseNpr: e.target.value.replace(/[^\d.]/g, ""),
                        }))
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase">
                    {copy.overrideBasis}
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-black outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      inputMode="numeric"
                      value={settingsDraft.expenseBasisOverrideNpr}
                      placeholder="Optional"
                      onChange={(e) =>
                        setSettingsDraft((d) => ({
                          ...d,
                          expenseBasisOverrideNpr: e.target.value.replace(/[^\d.]/g, ""),
                        }))
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase">
                    {copy.employmentType}
                    <select
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-bold outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      value={settingsDraft.employmentType}
                      onChange={(e) =>
                        setSettingsDraft((d) => ({
                          ...d,
                          employmentType: e.target.value as "" | EmergencyFundSettingsEmployment,
                        }))
                      }
                    >
                      <option value="">—</option>
                      <option value="stable">Stable</option>
                      <option value="contract">Contract</option>
                      <option value="overseas">Overseas</option>
                      <option value="self_employed">Self-employed</option>
                      <option value="uncertain">Uncertain</option>
                    </select>
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase">
                    {copy.dependents}
                    <input
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-black outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      inputMode="numeric"
                      value={settingsDraft.dependents}
                      onChange={(e) =>
                        setSettingsDraft((d) => ({
                          ...d,
                          dependents: e.target.value.replace(/[^\d]/g, ""),
                        }))
                      }
                    />
                  </label>
                  <label className="mt-3 block text-xs font-bold uppercase">
                    {copy.incomeSources}
                    <select
                      className={`mt-1 w-full rounded-2xl border px-3 py-3 text-sm font-bold outline-none ${
                        light ? "border-emerald-100" : "border-white/15 bg-white/5"
                      }`}
                      value={settingsDraft.incomeSources}
                      onChange={(e) =>
                        setSettingsDraft((d) => ({
                          ...d,
                          incomeSources: e.target.value as "" | "single" | "multiple",
                        }))
                      }
                    >
                      <option value="">—</option>
                      <option value="single">Single</option>
                      <option value="multiple">Multiple</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={saveSettings}
                    className="mt-5 w-full rounded-full bg-emerald-600 py-2.5 text-sm font-black text-white"
                  >
                    {copy.save}
                  </button>
                </>
              ) : null}

              {sheet === "calc" ? (
                <>
                  <h3 className="text-lg font-black">{copy.reviewCalculation}</h3>
                  <ul className={`mt-4 space-y-2 text-sm font-semibold ${muted}`}>
                    <li>
                      Basis = MAX(actual essential, planned essential) →{" "}
                      <span className={strong}>{money(result.recommendedExpenseBasisNpr)}</span>
                    </li>
                    <li>
                      Target = basis × {result.protectionMonths} →{" "}
                      <span className={strong}>{money(result.emergencyFundTargetNpr)}</span>
                    </li>
                    <li>
                      Reserve = opening + contributions − withdrawals →{" "}
                      <span className={strong}>{money(result.currentReserveNpr)}</span>
                    </li>
                    <li>
                      Capacity × {result.allocationPct}% →{" "}
                      <span className={strong}>{money(result.recommendedMonthlyContributionNpr)}</span>
                    </li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => setSheet(null)}
                    className="mt-5 w-full rounded-full bg-emerald-600 py-2.5 text-sm font-black text-white"
                  >
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

type EmergencyFundSettingsEmployment =
  | "stable"
  | "contract"
  | "overseas"
  | "self_employed"
  | "uncertain";

function Metric({
  label,
  value,
  icon: Icon,
  strong,
  muted,
  cardClass,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  strong: string;
  muted: string;
  cardClass: string;
}) {
  return (
    <div className={`rounded-2xl p-3.5 ${cardClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${muted}`}>{label}</p>
          <p className={`mt-1.5 text-xl font-black tracking-tight sm:text-2xl ${strong}`}>{value}</p>
        </div>
        <Icon size={18} className="mt-1 shrink-0 opacity-70" />
      </div>
    </div>
  );
}

function DataRow({
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
    <div className="rounded-2xl border border-transparent px-1 py-1">
      <p className={`text-[11px] font-bold uppercase tracking-[0.1em] ${muted}`}>{label}</p>
      <p className={`mt-1 text-base font-black ${strong}`}>{value}</p>
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
      className={`flex min-h-[72px] flex-col items-start justify-center gap-1 rounded-2xl border px-3 py-3 text-left text-xs font-black transition hover:-translate-y-0.5 ${
        light
          ? "border-emerald-100 bg-white text-emerald-900"
          : "border-white/15 bg-white/5 text-emerald-50"
      }`}
    >
      <Icon size={18} className="text-emerald-500" />
      {label}
    </button>
  );
}

function TxList({
  title,
  empty,
  items,
  muted,
  strong,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; amountNpr: number; date: string; note?: string }>;
  muted: string;
  strong: string;
}) {
  return (
    <div>
      <p className={`text-xs font-black uppercase tracking-[0.12em] ${muted}`}>{title}</p>
      {items.length === 0 ? (
        <p className={`mt-2 text-sm ${muted}`}>{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.slice(0, 6).map((tx) => (
            <li key={tx.id} className="flex items-center justify-between gap-3 text-sm">
              <span className={muted}>
                {tx.date}
                {tx.note ? ` · ${tx.note}` : ""}
              </span>
              <span className={`font-black ${strong}`}>{money(tx.amountNpr)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
