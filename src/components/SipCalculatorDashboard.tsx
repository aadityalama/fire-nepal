"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BarChart3,
  CalendarClock,
  Flame,
  Gauge,
  Gem,
  LineChart,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Currency = "KRW" | "NPR" | "USD";

const RATES_TO_NPR: Record<Currency, number> = {
  KRW: 0.1029,
  NPR: 1,
  USD: 133.5,
};

const FIRE_TARGET_NPR = 30_000_000;
const LEAN_FIRE_NPR = 15_000_000;
const FULL_FIRE_NPR = 30_000_000;
const NEPAL_MONTHLY_EXPENSE_NPR = 100_000;

const quickPresets: Array<{ label: string; amount: number; currency: Currency; helper: string }> = [
  { label: "₩100k", amount: 100_000, currency: "KRW", helper: "Starter habit" },
  { label: "₩300k", amount: 300_000, currency: "KRW", helper: "Strong savings" },
  { label: "₩500k", amount: 500_000, currency: "KRW", helper: "Korea worker mode" },
  { label: "₩1M", amount: 1_000_000, currency: "KRW", helper: "Accelerated FIRE" },
  { label: "NPR 50k", amount: 50_000, currency: "NPR", helper: "Nepal investing" },
  { label: "NPR 100k", amount: 100_000, currency: "NPR", helper: "Premium SIP" },
];

const milestoneTimeline = [
  { label: "First NPR 10L", valueNpr: 1_000_000 },
  { label: "Coast FIRE", valueNpr: 7_500_000 },
  { label: "Lean FIRE", valueNpr: LEAN_FIRE_NPR },
  { label: "Full FIRE", valueNpr: FULL_FIRE_NPR },
];

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function toNpr(value: number, currency: Currency) {
  return value * RATES_TO_NPR[currency];
}

function fromNpr(value: number, currency: Currency) {
  return value / RATES_TO_NPR[currency];
}

function formatCurrency(value: number, currency: Currency) {
  const locale = currency === "KRW" ? "ko-KR" : currency === "NPR" ? "en-NP" : "en-US";
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Math.round(value));
}

function formatNpr(value: number) {
  return formatCurrency(value, "NPR");
}

function formatPct(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

function compactNumber(value: number) {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return Math.round(value).toLocaleString("en-US");
}

function yearsToReach(rows: Array<{ year: number; valueNpr: number }>, targetNpr: number) {
  return rows.find((row) => row.valueNpr >= targetNpr)?.year ?? null;
}

function InputField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  inputMode = "decimal",
}: Readonly<{
  label: string;
  value: string;
  onChange: (next: string) => void;
  prefix?: string;
  suffix?: string;
  inputMode?: "decimal" | "numeric";
}>) {
  return (
    <label className="block rounded-3xl border border-white/70 bg-white/75 p-4 shadow-[0_18px_55px_rgba(0,63,47,0.07)] backdrop-blur-xl transition focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100/80">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
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

function SkeletonCard({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div className={`rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur ${className}`}>
      <div className="h-4 w-28 animate-pulse rounded-full bg-emerald-100" />
      <div className="mt-5 h-9 w-44 animate-pulse rounded-2xl bg-emerald-100" />
      <div className="mt-4 h-28 animate-pulse rounded-3xl bg-gradient-to-br from-emerald-50 to-white" />
    </div>
  );
}

function ResultCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
}: Readonly<{
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
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
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">{value}</p>
          <p className="mt-2 text-sm font-bold leading-snug text-slate-500">{hint}</p>
        </div>
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${toneClass} shadow-lg transition group-hover:scale-105`}>
          <Icon size={22} />
        </div>
      </div>
    </motion.article>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (next: string) => void;
}>) {
  return (
    <label className="block rounded-2xl border border-emerald-100 bg-white/70 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-emerald-100 accent-emerald-700"
      />
    </label>
  );
}

export function SipCalculatorDashboard() {
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [monthlyRaw, setMonthlyRaw] = useState("500000");
  const [returnRaw, setReturnRaw] = useState("12");
  const [yearsRaw, setYearsRaw] = useState("15");
  const [inflationRaw, setInflationRaw] = useState("5.8");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const projection = useMemo(() => {
    const monthlyInvestment = Math.max(0, Number(monthlyRaw || 0));
    const annualReturn = Math.max(0, Math.min(60, Number(returnRaw || 0)));
    const years = Math.max(0, Math.min(60, Math.floor(Number(yearsRaw || 0))));
    const inflation = Math.max(0, Math.min(40, Number(inflationRaw || 0)));
    const monthlyReturn = annualReturn / 100 / 12;
    const months = years * 12;
    const futureValue =
      monthlyReturn > 0
        ? monthlyInvestment * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn) * (1 + monthlyReturn)
        : monthlyInvestment * months;
    const totalInvested = monthlyInvestment * months;
    const totalProfit = Math.max(0, futureValue - totalInvested);
    const inflationFactor = Math.pow(1 + inflation / 100, years);
    const inflationAdjustedValue = inflationFactor > 0 ? futureValue / inflationFactor : futureValue;
    const futureValueNpr = toNpr(futureValue, currency);
    const totalInvestedNpr = toNpr(totalInvested, currency);
    const inflationAdjustedNpr = toNpr(inflationAdjustedValue, currency);
    const fireCompletion = Math.min(100, (futureValueNpr / FIRE_TARGET_NPR) * 100);
    const passiveIncomeNpr = futureValueNpr * 0.04 / 12;
    const growthMultiple = totalInvested > 0 ? futureValue / totalInvested : 0;
    const inflationReductionPct = futureValue > 0 ? Math.max(0, (1 - inflationAdjustedValue / futureValue) * 100) : 0;

    const yearlyRows = Array.from({ length: years + 1 }, (_, year) => {
      const yearMonths = year * 12;
      const nominalValue =
        monthlyReturn > 0
          ? monthlyInvestment * ((Math.pow(1 + monthlyReturn, yearMonths) - 1) / monthlyReturn) * (1 + monthlyReturn)
          : monthlyInvestment * yearMonths;
      const invested = monthlyInvestment * yearMonths;
      const profit = Math.max(0, nominalValue - invested);
      const realValue = nominalValue / Math.pow(1 + inflation / 100, year);
      const valueNpr = toNpr(nominalValue, currency);

      return {
        year,
        nominalValue,
        invested,
        profit,
        realValue,
        valueNpr,
        fireProgress: Math.min(100, (valueNpr / FIRE_TARGET_NPR) * 100),
      };
    });

    const leanFireYear = yearsToReach(yearlyRows, LEAN_FIRE_NPR);
    const fullFireYear = yearsToReach(yearlyRows, FULL_FIRE_NPR);
    const coastFireYear = yearsToReach(yearlyRows, 7_500_000);
    const retirementYearsCovered = NEPAL_MONTHLY_EXPENSE_NPR > 0 ? futureValueNpr / (NEPAL_MONTHLY_EXPENSE_NPR * 12) : 0;

    return {
      monthlyInvestment,
      annualReturn,
      years,
      inflation,
      futureValue,
      totalInvested,
      totalProfit,
      inflationAdjustedValue,
      futureValueNpr,
      totalInvestedNpr,
      inflationAdjustedNpr,
      fireCompletion,
      passiveIncomeNpr,
      growthMultiple,
      inflationReductionPct,
      leanFireYear,
      fullFireYear,
      coastFireYear,
      retirementYearsCovered,
      yearlyRows,
    };
  }, [currency, inflationRaw, monthlyRaw, returnRaw, yearsRaw]);

  const isEmpty = projection.monthlyInvestment <= 0 || projection.years <= 0;
  const prefix = currency === "KRW" ? "₩" : currency === "NPR" ? "रु" : "$";
  const annualSafeWithdrawal = projection.futureValueNpr * 0.04;
  const fireAnalyticsCards: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "Coast FIRE date", value: projection.coastFireYear ? `${projection.coastFireYear} years` : "Beyond horizon", icon: CalendarClock },
    { label: "Lean FIRE estimate", value: projection.leanFireYear ? `${projection.leanFireYear} years` : "Beyond horizon", icon: Gauge },
    { label: "Full FIRE estimate", value: projection.fullFireYear ? `${projection.fullFireYear} years` : "Beyond horizon", icon: Flame },
    { label: "Retirement corpus", value: formatNpr(projection.futureValueNpr), icon: WalletCards },
    { label: "Safe withdrawal", value: `${formatNpr(annualSafeWithdrawal)} / year`, icon: ShieldCheck },
  ];
  const salaryModeMonthly = 500_000;
  const salaryModeYears = 10;
  const salaryModeNpr = (() => {
    const monthlyReturn = projection.annualReturn / 100 / 12;
    const months = salaryModeYears * 12;
    const value =
      monthlyReturn > 0
        ? salaryModeMonthly * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn) * (1 + monthlyReturn)
        : salaryModeMonthly * months;
    return toNpr(value, "KRW");
  })();

  function applyPreset(preset: (typeof quickPresets)[number]) {
    setCurrency(preset.currency);
    setMonthlyRaw(String(preset.amount));
  }

  function changeCurrency(nextCurrency: Currency) {
    if (nextCurrency === currency) return;
    const amount = Math.max(0, Number(monthlyRaw || 0));
    const nprAmount = toNpr(amount, currency);
    setMonthlyRaw(String(Math.round(fromNpr(nprAmount, nextCurrency))));
    setCurrency(nextCurrency);
  }

  return (
    <main className="premium-shell min-h-screen overflow-hidden bg-[#f4fbf6] px-4 pb-28 pt-6 text-emerald-950 sm:px-6 sm:pt-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} />
            Back to Homepage
          </Link>
          <div className="flex w-fit gap-1 rounded-full border border-emerald-100 bg-white/80 p-1 shadow-sm backdrop-blur">
            {(["KRW", "NPR", "USD"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeCurrency(option)}
                className={`rounded-full px-4 py-2 text-xs font-black transition ${
                  currency === option ? "bg-emerald-700 text-white shadow" : "text-emerald-800 hover:bg-emerald-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

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
                FIRE Nepal Wealth OS
              </p>
              <h1 className="mt-4 text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                SIP Calculator
              </h1>
              <p className="font-nepali mt-3 text-xl font-semibold leading-snug text-emerald-50/72 sm:text-2xl">
                नियमित लगानी वृद्धि योजना
              </p>
              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-emerald-50/85 sm:text-lg">
                A premium long-term wealth growth dashboard for Nepali workers abroad, built to connect monthly investing,
                inflation, Korea income, and FIRE readiness.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">Growth multiple</p>
                  <motion.p key={projection.growthMultiple} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-3xl font-black">
                    {projection.growthMultiple.toFixed(1)}x
                  </motion.p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">FIRE progress</p>
                  <p className="mt-2 text-3xl font-black">{formatPct(projection.fireCompletion)}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">Passive income</p>
                  <p className="mt-2 text-2xl font-black">{formatNpr(projection.passiveIncomeNpr)}</p>
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
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">Live Wealth Projection</p>
                  <p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                    {formatCurrency(projection.futureValue, currency)}
                  </p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-emerald-800 shadow-lg">
                  <LineChart size={25} />
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-950/35 p-4">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
                  <span>NPR 3Cr FIRE target</span>
                  <span>{formatPct(projection.fireCompletion)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${projection.fireCompletion}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-3 text-sm font-bold leading-relaxed text-emerald-50/80">
                  Your money could grow {projection.growthMultiple.toFixed(1)}x. Inflation reduces purchasing power by{" "}
                  {formatPct(projection.inflationReductionPct)}.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {isLoading ? (
          <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <SkeletonCard />
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </section>
        ) : (
          <>
            <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-emerald-950">SIP Engine</h2>
                    <p className="text-sm font-bold text-slate-500">Monthly investing model with inflation and FIRE target logic.</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Live</span>
                </div>
                <div className="grid gap-4">
                  <InputField
                    label="Monthly Investment"
                    value={monthlyRaw}
                    prefix={prefix}
                    onChange={(next) => setMonthlyRaw(sanitizeDecimalInput(next))}
                  />
                  <InputField
                    label="Inflation"
                    value={inflationRaw}
                    suffix="%"
                    onChange={(next) => setInflationRaw(sanitizeDecimalInput(next))}
                  />
                  <SliderField label="Return slider" value={projection.annualReturn} min={0} max={24} step={0.5} suffix="%" onChange={setReturnRaw} />
                  <SliderField label="Year slider" value={projection.years} min={1} max={40} step={1} suffix="Y" onChange={setYearsRaw} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ResultCard label="Future Value" value={formatCurrency(projection.futureValue, currency)} hint="Projected SIP corpus." icon={TrendingUp} />
                <ResultCard label="Total Invested" value={formatCurrency(projection.totalInvested, currency)} hint="Your total contributions." icon={PiggyBank} tone="dark" />
                <ResultCard label="Total Profit" value={formatCurrency(projection.totalProfit, currency)} hint="Compounding gain." icon={Banknote} tone="lime" />
                <ResultCard label="Inflation Adjusted" value={formatCurrency(projection.inflationAdjustedValue, currency)} hint="Future buying power." icon={WalletCards} tone="gold" />
                <ResultCard label="Monthly Passive Income" value={formatNpr(projection.passiveIncomeNpr)} hint="Estimated with 4% rule." icon={Flame} />
                <ResultCard label="FIRE Completion" value={formatPct(projection.fireCompletion)} hint="Against NPR 3Cr target." icon={Target} tone="dark" />
              </div>
            </section>

            <section className="mt-6 glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-2xl font-black tracking-tight text-emerald-950">Quick Presets</h2>
                <p className="text-sm font-bold text-slate-500">Fast scenarios for Nepali workers in Korea and Nepal.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                {quickPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="group rounded-2xl border border-white/70 bg-white/70 p-4 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-[0_18px_45px_rgba(0,122,61,0.16)]"
                  >
                    <span className="block text-lg font-black text-emerald-950">{preset.label}</span>
                    <span className="mt-1 block text-xs font-bold text-slate-500">{preset.helper}</span>
                  </button>
                ))}
              </div>
            </section>

            {isEmpty ? (
              <section className="mt-6 rounded-[2rem] border border-dashed border-emerald-200 bg-white/70 p-8 text-center shadow-sm backdrop-blur">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Gem size={24} />
                </div>
                <h2 className="mt-4 text-2xl font-black text-emerald-950">Enter a monthly investment to begin.</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-relaxed text-slate-500">
                  Your charts, FIRE timeline, salary simulation, and smart insights will appear once the SIP has a
                  positive monthly amount and time horizon.
                </p>
              </section>
            ) : (
              <>
                <section className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-emerald-950">Compound Growth Chart</h2>
                        <p className="text-sm font-bold text-slate-500">Year-by-year wealth path with real value overlay.</p>
                      </div>
                      <BarChart3 className="text-emerald-700" size={24} />
                    </div>
                    <div className="h-[23rem]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projection.yearlyRows} margin={{ bottom: 0, left: 0, right: 8, top: 12 }}>
                          <defs>
                            <linearGradient id="sipGrowth" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="5%" stopColor="#007a3d" stopOpacity={0.34} />
                              <stop offset="95%" stopColor="#007a3d" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="sipReal" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="5%" stopColor="#d6a83e" stopOpacity={0.28} />
                              <stop offset="95%" stopColor="#d6a83e" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} tickFormatter={(value: number) => compactNumber(value)} />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(255,255,255,0.94)",
                              border: "1px solid rgba(0,122,61,0.16)",
                              borderRadius: "18px",
                              boxShadow: "0 18px 50px rgba(0,63,47,0.14)",
                            }}
                            formatter={(value: number | string, name: string) => [
                              formatCurrency(Number(value), currency),
                              name === "nominalValue" ? "Future value" : name === "realValue" ? "Inflation adjusted" : "Invested",
                            ]}
                            labelFormatter={(label) => `Year ${label}`}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="nominalValue" name="Future value" stroke="#007a3d" strokeWidth={3} fill="url(#sipGrowth)" animationDuration={900} />
                          <Area type="monotone" dataKey="realValue" name="Inflation adjusted" stroke="#d6a83e" strokeWidth={3} fill="url(#sipReal)" animationDuration={900} />
                          <Area type="monotone" dataKey="invested" name="Invested" stroke="#475569" strokeWidth={2} fillOpacity={0} animationDuration={900} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                    <div className="mb-5">
                      <h2 className="text-2xl font-black tracking-tight text-emerald-950">FIRE Analytics</h2>
                      <p className="text-sm font-bold text-slate-500">Milestones mapped to Nepal retirement targets.</p>
                    </div>
                    <div className="grid gap-3">
                      {fireAnalyticsCards.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                              <Icon size={19} />
                            </div>
                            <p className="font-black text-emerald-950">{label}</p>
                          </div>
                          <p className="text-right text-sm font-black text-slate-600">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-emerald-950">Profit vs Invested</h2>
                        <p className="text-sm font-bold text-slate-500">Visual split between your savings and market growth.</p>
                      </div>
                      <PiggyBank className="text-emerald-700" size={24} />
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                          { label: "Invested", value: projection.totalInvested, color: "#064e3b" },
                          { label: "Profit", value: projection.totalProfit, color: "#22c55e" },
                          { label: "Real value", value: projection.inflationAdjustedValue, color: "#d6a83e" },
                        ]}>
                          <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} tickFormatter={(value: number) => compactNumber(value)} />
                          <Tooltip
                            contentStyle={{ background: "rgba(255,255,255,0.94)", border: "1px solid rgba(0,122,61,0.16)", borderRadius: "18px" }}
                            formatter={(value: number | string) => formatCurrency(Number(value), currency)}
                          />
                          <Bar dataKey="value" radius={[14, 14, 0, 0]} animationDuration={850}>
                            {["#064e3b", "#22c55e", "#d6a83e"].map((color) => (
                              <Cell key={color} fill={color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                    <div className="mb-5">
                      <h2 className="text-2xl font-black tracking-tight text-emerald-950">FIRE Milestone Timeline</h2>
                      <p className="text-sm font-bold text-slate-500">Interactive progress markers for long-term wealth goals.</p>
                    </div>
                    <div className="space-y-4">
                      {milestoneTimeline.map((milestone) => {
                        const progress = Math.min(100, (projection.futureValueNpr / milestone.valueNpr) * 100);
                        const reached = progress >= 100;
                        return (
                          <div key={milestone.label} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                {reached ? <BadgeCheck className="text-emerald-700" size={19} /> : <Target className="text-slate-400" size={18} />}
                                <p className="font-black text-emerald-950">{milestone.label}</p>
                              </div>
                              <p className="text-xs font-black text-slate-500">{formatNpr(milestone.valueNpr)}</p>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-emerald-100">
                              <motion.div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-lime-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.75, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="dark-glass-card relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-6">
                    <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-emerald-300/15 blur-3xl" />
                    <div className="relative">
                      <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-100">
                        Korea Worker Mode
                      </p>
                      <h2 className="mt-4 text-3xl font-black tracking-tight">If you invest ₩500k monthly for 10 years</h2>
                      <p className="mt-3 text-sm font-bold leading-relaxed text-emerald-50/80">
                        At your selected {formatPct(projection.annualReturn)} annual return, this Korea salary investing
                        simulation projects a future value of {formatNpr(salaryModeNpr)} in Nepal terms.
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">KRW invested</p>
                          <p className="mt-2 text-2xl font-black">{formatCurrency(salaryModeMonthly * salaryModeYears * 12, "KRW")}</p>
                        </div>
                        <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">NPR future value</p>
                          <p className="mt-2 text-2xl font-black">{formatNpr(salaryModeNpr)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                    <div className="mb-5 flex items-center gap-2">
                      <Sparkles className="text-emerald-700" size={22} />
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-emerald-950">Smart Insights</h2>
                        <p className="text-sm font-bold text-slate-500">Clear signals for your next money decision.</p>
                      </div>
                    </div>
                    <div className="grid gap-3">
                      {[
                        `Your money could grow ${projection.growthMultiple.toFixed(1)}x.`,
                        `Inflation reduces future purchasing power by ${formatPct(projection.inflationReductionPct)}.`,
                        projection.leanFireYear
                          ? `You may reach Lean FIRE in ${projection.leanFireYear} years.`
                          : "Lean FIRE is beyond this timeline; increase monthly SIP or extend the horizon.",
                      ].map((insight) => (
                        <div key={insight} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm font-bold leading-relaxed text-emerald-950">
                          {insight}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="mt-6 glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                  <div className="mb-5">
                    <h2 className="text-2xl font-black tracking-tight text-emerald-950">Year-by-Year Wealth Graph</h2>
                    <p className="text-sm font-bold text-slate-500">Detailed SIP table for professional planning.</p>
                  </div>
                  <div className="max-h-[30rem] overflow-auto rounded-3xl border border-emerald-100/80 bg-white/75">
                    <table className="min-w-full text-left text-sm">
                      <thead className="sticky top-0 bg-emerald-950 text-xs uppercase tracking-[0.14em] text-emerald-50">
                        <tr>
                          <th className="px-4 py-3 font-black">Year</th>
                          <th className="px-4 py-3 font-black">Invested</th>
                          <th className="px-4 py-3 font-black">Profit</th>
                          <th className="px-4 py-3 font-black">Future Value</th>
                          <th className="px-4 py-3 font-black">FIRE %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100/80">
                        {projection.yearlyRows.map((row) => (
                          <tr key={row.year} className="transition hover:bg-emerald-50/75">
                            <td className="whitespace-nowrap px-4 py-3 font-black text-emerald-950">{row.year}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{formatCurrency(row.invested, currency)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-bold text-emerald-700">{formatCurrency(row.profit, currency)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{formatCurrency(row.nominalValue, currency)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-black text-amber-700">{formatPct(row.fireProgress)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </section>

      <div className="fixed inset-x-3 bottom-3 z-30 rounded-3xl border border-white/70 bg-white/85 p-3 shadow-[0_18px_60px_rgba(0,63,47,0.18)] backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">SIP Value</p>
            <p className="text-lg font-black text-emerald-950">{formatCurrency(projection.futureValue, currency)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">
            {formatPct(projection.fireCompletion)}
          </div>
        </div>
      </div>
    </main>
  );
}
