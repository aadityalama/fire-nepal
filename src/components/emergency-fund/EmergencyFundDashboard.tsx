"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarClock,
  FileDown,
  Flame,
  Gauge,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmergencyFundAiSafetyAnalysis } from "@/components/emergency-fund/EmergencyFundAiSafetyAnalysis";
import {
  buildEmergencyFundSafetyAnalysis,
  formatEmergencyMonths,
  formatEmergencyNpr,
  runEmergencyFundProjection,
  type EmergencyRiskProfileKey,
} from "@/lib/emergency-fund";
import { downloadEmergencyFundSafetyReportPdf } from "@/lib/emergency-fund-report";

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseNumber(value: string) {
  return Math.max(0, Number(value || 0));
}

function compactNumber(value: number) {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return Math.round(value).toLocaleString("en-US");
}

/** Map standalone UI toggles onto existing risk profiles — no engine changes. */
function resolveRiskLevel(
  stableJob: boolean,
  dependents: number,
  returnToNepal: boolean,
): EmergencyRiskProfileKey {
  if (returnToNepal) return "high";
  if (dependents > 0 || !stableJob) return "moderate";
  return "stable";
}

function safetyLevelFromReadiness(readiness: number): {
  label: string;
  tone: "emerald" | "lime" | "gold" | "dark";
} {
  if (readiness >= 90) return { label: "Excellent", tone: "emerald" };
  if (readiness >= 70) return { label: "Safe", tone: "lime" };
  if (readiness >= 45) return { label: "Moderate", tone: "gold" };
  return { label: "Critical", tone: "dark" };
}

function InputField({
  label,
  nepaliLabel,
  value,
  onChange,
  prefix,
  suffix,
  inputMode = "decimal",
}: Readonly<{
  label: string;
  nepaliLabel: string;
  value: string;
  onChange: (next: string) => void;
  prefix?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
}>) {
  return (
    <label className="block rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_55px_rgba(0,63,47,0.07)] backdrop-blur-xl transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100/80">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="font-nepali mt-0.5 block text-[0.72rem] font-semibold text-slate-400">{nepaliLabel}</span>
      <span className="mt-3 flex items-center gap-2">
        {prefix ? <span className="text-sm font-black text-emerald-700">{prefix}</span> : null}
        <input
          className="min-w-0 flex-1 bg-transparent text-right text-2xl font-black tracking-tight text-emerald-950 outline-none placeholder:text-emerald-200 sm:text-3xl"
          inputMode={inputMode}
          value={value}
          placeholder="0"
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix ? <span className="text-sm font-black text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
  nepaliLabel,
  icon: Icon,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  label: string;
  nepaliLabel: string;
  icon: LucideIcon;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[72px] flex-col items-start justify-center rounded-2xl border p-3.5 text-left transition ${
        active
          ? "border-emerald-400 bg-emerald-50 text-emerald-950 shadow-sm"
          : "border-white/70 bg-white/70 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icon size={16} className={active ? "text-emerald-700" : "text-slate-400"} />
        <span className="text-sm font-black">{label}</span>
      </span>
      <span className="font-nepali mt-1 text-[0.7rem] font-semibold text-slate-500">{nepaliLabel}</span>
    </button>
  );
}

function ResultCard({
  label,
  nepaliLabel,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
}: Readonly<{
  label: string;
  nepaliLabel: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "emerald" | "gold" | "lime" | "dark";
}>) {
  const toneClass =
    tone === "gold"
      ? "from-amber-400 to-yellow-300 text-amber-950"
      : tone === "lime"
        ? "from-lime-300 to-emerald-400 text-emerald-950"
        : tone === "dark"
          ? "from-slate-950 to-emerald-900 text-white"
          : "from-emerald-700 to-emerald-500 text-white";

  return (
    <motion.article
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group overflow-hidden rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_20px_70px_rgba(0,63,47,0.09)] backdrop-blur-xl sm:p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="font-nepali mt-0.5 text-[0.7rem] font-semibold text-slate-400">{nepaliLabel}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">{value}</p>
          <p className="mt-2 text-sm font-bold leading-snug text-slate-500">{hint}</p>
        </div>
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${toneClass} shadow-lg transition group-hover:scale-105`}
        >
          <Icon size={22} />
        </div>
      </div>
    </motion.article>
  );
}

export function EmergencyFundDashboard() {
  const [monthlyExpenseRaw, setMonthlyExpenseRaw] = useState("100000");
  const [currentFundRaw, setCurrentFundRaw] = useState("420000");
  const [monthlySaveRaw, setMonthlySaveRaw] = useState("45000");
  const [inflationRaw, setInflationRaw] = useState("5.8");
  const [dependentsRaw, setDependentsRaw] = useState("1");
  const [stableJob, setStableJob] = useState(true);
  const [returnToNepal, setReturnToNepal] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const riskLevel = useMemo(
    () => resolveRiskLevel(stableJob, parseNumber(dependentsRaw), returnToNepal),
    [stableJob, dependentsRaw, returnToNepal],
  );

  const analytics = useMemo(
    () =>
      runEmergencyFundProjection({
        monthlyExpense: parseNumber(monthlyExpenseRaw),
        currentFund: parseNumber(currentFundRaw),
        monthlySave: parseNumber(monthlySaveRaw),
        riskLevel,
        inflationPct: parseNumber(inflationRaw),
      }),
    [currentFundRaw, inflationRaw, monthlyExpenseRaw, monthlySaveRaw, riskLevel],
  );

  const safety = safetyLevelFromReadiness(analytics.readiness);

  const inflationChart = useMemo(() => {
    return [0, 1, 2, 3, 4, 5].map((year) => {
      const factor = Math.pow(1 + analytics.inflationPct / 100, year);
      return {
        year: `Y${year}`,
        nominal: analytics.currentFund,
        real: analytics.currentFund / factor,
      };
    });
  }, [analytics.currentFund, analytics.inflationPct]);

  const coverageChart = useMemo(
    () => [
      { label: "Current", months: analytics.runwayMonths },
      { label: "Recommended", months: analytics.recommendedMonths },
      { label: "Stress", months: analytics.stressRunway },
    ],
    [analytics.recommendedMonths, analytics.runwayMonths, analytics.stressRunway],
  );

  const handlePdf = async () => {
    setPdfBusy(true);
    try {
      const analysis = buildEmergencyFundSafetyAnalysis(analytics);
      await downloadEmergencyFundSafetyReportPdf(analysis, analytics);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <main className="premium-shell min-h-screen overflow-hidden bg-[#f4fbf6] px-4 pb-24 pt-6 text-emerald-950 sm:px-6 sm:pt-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} />
            Back to Homepage
          </Link>
          <button
            type="button"
            onClick={handlePdf}
            disabled={pdfBusy}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-emerald-50 disabled:opacity-60"
          >
            <FileDown size={16} />
            {pdfBusy ? "Preparing…" : "PDF Export"}
          </button>
        </div>

        {/* Premium hero */}
        <section className="dark-glass-card relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-7 lg:p-9">
          <div className="absolute -left-24 top-8 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />
          <motion.div
            aria-hidden
            animate={{ y: [0, -12, 0], opacity: [0.35, 0.65, 0.35] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute right-12 top-12 h-28 w-28 rounded-full bg-emerald-300/20 blur-2xl"
          />
          <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <Sparkles size={14} />
                FIRE Nepal Safety Calculator
              </p>
              <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                🛡️ Emergency Fund Calculator
              </h1>
              <p className="font-nepali mt-3 text-xl font-semibold leading-snug text-emerald-50/75 sm:text-2xl">
                आपतकालीन कोष सुरक्षा योजना
              </p>
              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-emerald-50/85 sm:text-lg">
                A premium standalone safety calculator for Nepalis abroad — measure runway, funding gap, stress
                coverage, and get Nepali AI guidance without the OS workspace chrome.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">Readiness</p>
                  <p className="mt-2 text-3xl font-black">{Math.round(analytics.readiness)}%</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">Coverage</p>
                  <p className="mt-2 text-3xl font-black">{formatEmergencyMonths(analytics.runwayMonths)}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">Safety</p>
                  <p className="mt-2 text-2xl font-black">{safety.label}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-xl sm:p-5"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">Target fund</p>
                  <p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                    {formatEmergencyNpr(analytics.recommendedFund)}
                  </p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-emerald-800 shadow-lg">
                  <ShieldCheck size={25} />
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-950/35 p-4">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
                  <span>Funding progress</span>
                  <span>{Math.round(analytics.readiness)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${analytics.readiness}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-3 text-sm font-bold leading-relaxed text-emerald-50/80">
                  Gap {formatEmergencyNpr(analytics.gap)} · Profile uses {analytics.recommendedMonths} months + buffer
                  ({riskLevel}).
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Inputs + results */}
        <section className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-emerald-950">Safety Inputs</h2>
                <p className="font-nepali text-sm font-bold text-slate-500">आफ्नो सुरक्षा विवरण हाल्नुहोस्</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Live</span>
            </div>
            <div className="grid gap-4">
              <InputField
                label="Monthly Essential Expenses"
                nepaliLabel="मासिक आवश्यक खर्च"
                value={monthlyExpenseRaw}
                prefix="रु"
                onChange={(next) => setMonthlyExpenseRaw(sanitizeIntegerInput(next))}
                inputMode="numeric"
              />
              <InputField
                label="Current Emergency Fund"
                nepaliLabel="हालको आपतकालीन कोष"
                value={currentFundRaw}
                prefix="रु"
                onChange={(next) => setCurrentFundRaw(sanitizeIntegerInput(next))}
                inputMode="numeric"
              />
              <InputField
                label="Monthly Contribution"
                nepaliLabel="मासिक बचत योगदान"
                value={monthlySaveRaw}
                prefix="रु"
                onChange={(next) => setMonthlySaveRaw(sanitizeIntegerInput(next))}
                inputMode="numeric"
              />
              <InputField
                label="Inflation"
                nepaliLabel="मुद्रास्फीति"
                value={inflationRaw}
                suffix="%"
                onChange={(next) => setInflationRaw(sanitizeDecimalInput(next))}
              />
              <InputField
                label="Dependents"
                nepaliLabel="आश्रित परिवार सदस्य"
                value={dependentsRaw}
                onChange={(next) => setDependentsRaw(sanitizeIntegerInput(next))}
                inputMode="numeric"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <ToggleChip
                  active={stableJob}
                  onClick={() => setStableJob((v) => !v)}
                  label={stableJob ? "Stable Job: On" : "Stable Job: Off"}
                  nepaliLabel="स्थिर जागिर"
                  icon={ShieldCheck}
                />
                <ToggleChip
                  active={returnToNepal}
                  onClick={() => setReturnToNepal((v) => !v)}
                  label={returnToNepal ? "Return to Nepal: On" : "Return to Nepal: Off"}
                  nepaliLabel="नेपाल फर्कने योजना"
                  icon={Users}
                />
              </div>
              <p className="rounded-2xl bg-emerald-50/80 px-4 py-3 text-xs font-bold leading-relaxed text-emerald-800">
                Profile → <span className="font-black capitalize">{riskLevel}</span> ({analytics.recommendedMonths} mo
                target). Stable job + no dependents → stable; dependents or unstable job → moderate; Nepal return →
                high.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ResultCard
              label="Readiness Score"
              nepaliLabel="तयारी स्कोर"
              value={`${Math.round(analytics.readiness)}%`}
              hint="Funded vs recommended target"
              icon={Gauge}
            />
            <ResultCard
              label="Current Coverage"
              nepaliLabel="हालको कभरेज"
              value={formatEmergencyMonths(analytics.runwayMonths)}
              hint={`Stress runway ${formatEmergencyMonths(analytics.stressRunway)}`}
              icon={CalendarClock}
              tone="lime"
            />
            <ResultCard
              label="Recommended Fund"
              nepaliLabel="सिफारिस कोष"
              value={formatEmergencyNpr(analytics.recommendedFund)}
              hint={`${analytics.recommendedMonths} months + buffer`}
              icon={Target}
            />
            <ResultCard
              label="Funding Gap"
              nepaliLabel="कमी रकम"
              value={formatEmergencyNpr(analytics.gap)}
              hint={analytics.gap === 0 ? "Fully funded" : "Still to save"}
              icon={PiggyBank}
              tone="gold"
            />
            <ResultCard
              label="Time to Goal"
              nepaliLabel="लक्ष्य पुग्ने समय"
              value={
                analytics.gap === 0
                  ? "Ready"
                  : analytics.monthsToTarget > 0
                    ? `${analytics.monthsToTarget} mo`
                    : "—"
              }
              hint="At current monthly contribution"
              icon={WalletCards}
              tone="dark"
            />
            <ResultCard
              label="Safety Level"
              nepaliLabel="सुरक्षा स्तर"
              value={safety.label}
              hint="Based on readiness score"
              icon={ShieldCheck}
              tone={safety.tone}
            />
          </div>
        </section>

        {/* Charts */}
        <section className="mt-6 grid gap-5 xl:grid-cols-3">
          <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-5 xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-xl font-black tracking-tight text-emerald-950 sm:text-2xl">📈 Fund Growth</h2>
              <p className="font-nepali text-sm font-bold text-slate-500">आपतकालीन कोष वृद्धि मार्ग</p>
            </div>
            <div className="h-[22rem]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={analytics.projection} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="efStandaloneFund" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#007a3d" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="#007a3d" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                    tickFormatter={(value: number) => compactNumber(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(255,255,255,0.94)",
                      border: "1px solid rgba(0,122,61,0.16)",
                      borderRadius: "18px",
                    }}
                    formatter={(value: number | string, name: string) => [
                      formatEmergencyNpr(Number(value)),
                      name === "fund" ? "Fund" : "Target",
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="fund"
                    name="Fund"
                    stroke="#007a3d"
                    strokeWidth={3}
                    fill="url(#efStandaloneFund)"
                    animationDuration={900}
                  />
                  <Line
                    type="monotone"
                    dataKey="target"
                    name="Target"
                    stroke="#84cc16"
                    strokeWidth={2}
                    strokeDasharray="6 5"
                    dot={false}
                    animationDuration={900}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-xl font-black tracking-tight text-emerald-950 sm:text-2xl">📊 Coverage Progress</h2>
              <p className="font-nepali text-sm font-bold text-slate-500">कभरेज प्रगति</p>
            </div>
            <div className="h-[22rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageChart}>
                  <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{ background: "rgba(255,255,255,0.94)", borderRadius: "18px" }}
                    formatter={(value: number | string) => formatEmergencyMonths(Number(value))}
                  />
                  <Bar dataKey="months" fill="#059669" radius={[14, 14, 0, 0]} animationDuration={850} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-5 xl:col-span-3">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black tracking-tight text-emerald-950 sm:text-2xl">📉 Inflation Impact</h2>
                <p className="font-nepali text-sm font-bold text-slate-500">मुद्रास्फीति प्रभाव</p>
              </div>
              <Flame className="text-amber-600" size={22} />
            </div>
            <div className="h-[20rem]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={inflationChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="efStandaloneReal" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                    tickFormatter={(value: number) => compactNumber(value)}
                  />
                  <Tooltip
                    contentStyle={{ background: "rgba(255,255,255,0.94)", borderRadius: "18px" }}
                    formatter={(value: number | string, name: string) => [
                      formatEmergencyNpr(Number(value)),
                      name === "real" ? "Real purchasing power" : "Nominal",
                    ]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="nominal"
                    name="Nominal"
                    stroke="#059669"
                    strokeWidth={2.5}
                    fillOpacity={0}
                    animationDuration={900}
                  />
                  <Area
                    type="monotone"
                    dataKey="real"
                    name="Real purchasing power"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    fill="url(#efStandaloneReal)"
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Existing AI module — unchanged */}
        <div className="mt-8">
          <EmergencyFundAiSafetyAnalysis result={analytics} />
        </div>
      </section>

      {/* Mobile sticky summary */}
      <div className="fixed inset-x-3 bottom-3 z-30 rounded-3xl border border-white/70 bg-white/85 p-3 shadow-[0_18px_60px_rgba(0,63,47,0.18)] backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Coverage</p>
            <p className="text-lg font-black text-emerald-950">{formatEmergencyMonths(analytics.runwayMonths)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">
            {Math.round(analytics.readiness)}%
          </div>
        </div>
      </div>
    </main>
  );
}
