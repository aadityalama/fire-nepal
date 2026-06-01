"use client";

import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  BarChart3,
  Calculator,
  Flame,
  Gem,
  Landmark,
  LineChart,
  Mountain,
  PiggyBank,
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
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Currency = "KRW" | "NPR";

const KRW_TO_NPR = 0.1029;
const NEPAL_INFLATION_RATE = 5.8;
const FIRE_TARGET_NPR = 30_000_000;
const RETIREMENT_MONTHLY_EXPENSE_NPR = 100_000;

const quickPresets: Array<{ label: string; amount: number; currency: Currency; helper: string }> = [
  { label: "₩5M", amount: 5_000_000, currency: "KRW", helper: "First Korea savings block" },
  { label: "₩10M", amount: 10_000_000, currency: "KRW", helper: "Strong compounding base" },
  { label: "₩50M", amount: 50_000_000, currency: "KRW", helper: "Return-to-Nepal capital" },
  { label: "NPR 10 lakh", amount: 1_000_000, currency: "NPR", helper: "Nepal investment start" },
];

const milestones = [
  { label: "First NPR 10L", valueNpr: 1_000_000, icon: PiggyBank },
  { label: "NPR 50 lakh", valueNpr: 5_000_000, icon: Mountain },
  { label: "FIRE Halfway", valueNpr: 15_000_000, icon: Flame },
  { label: "FIRE Target", valueNpr: FIRE_TARGET_NPR, icon: Target },
];

function sanitizeDecimalInput(value: string) {
  const cleaned = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return `${cleaned.slice(0, dot + 1)}${cleaned.slice(dot + 1).replace(/\./g, "")}`;
}

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function compactNumber(value: number) {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return Math.round(value).toLocaleString("en-US");
}

function formatCurrency(value: number, currency: Currency) {
  const locale = currency === "KRW" ? "ko-KR" : "en-NP";
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

function toNpr(value: number, currency: Currency) {
  return currency === "KRW" ? value * KRW_TO_NPR : value;
}

function fromNpr(value: number, currency: Currency) {
  return currency === "KRW" ? value / KRW_TO_NPR : value;
}

function SkeletonCard({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <div className={`overflow-hidden rounded-[2rem] border border-white/70 bg-white/65 p-5 shadow-sm backdrop-blur ${className}`}>
      <div className="h-4 w-28 animate-pulse rounded-full bg-emerald-100" />
      <div className="mt-5 h-9 w-44 animate-pulse rounded-2xl bg-emerald-100" />
      <div className="mt-4 h-24 animate-pulse rounded-3xl bg-gradient-to-br from-emerald-50 to-white" />
    </div>
  );
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

function StatCard({
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
  tone?: "emerald" | "gold" | "slate" | "green";
}>) {
  const toneClass =
    tone === "gold"
      ? "from-amber-400 to-yellow-300 text-amber-950"
      : tone === "slate"
        ? "from-slate-900 to-emerald-900 text-white"
        : tone === "green"
          ? "from-lime-300 to-emerald-400 text-emerald-950"
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

export function LumpsumCalculatorDashboard() {
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [amountRaw, setAmountRaw] = useState("10000000");
  const [returnRaw, setReturnRaw] = useState("12");
  const [yearsRaw, setYearsRaw] = useState("15");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 280);
    return () => window.clearTimeout(timer);
  }, []);

  const projection = useMemo(() => {
    const principal = Math.max(0, Number(amountRaw || 0));
    const annualReturn = Math.max(0, Math.min(60, Number(returnRaw || 0)));
    const years = Math.max(0, Math.min(60, Math.floor(Number(yearsRaw || 0))));
    const growthFactor = Math.pow(1 + annualReturn / 100, years);
    const inflationFactor = Math.pow(1 + NEPAL_INFLATION_RATE / 100, years);
    const futureValue = principal * growthFactor;
    const totalProfit = Math.max(0, futureValue - principal);
    const inflationAdjustedValue = inflationFactor > 0 ? futureValue / inflationFactor : futureValue;
    const principalNpr = toNpr(principal, currency);
    const futureValueNpr = toNpr(futureValue, currency);
    const inflationAdjustedNpr = toNpr(inflationAdjustedValue, currency);
    const fireProgress = Math.min(100, (futureValueNpr / FIRE_TARGET_NPR) * 100);
    const annualExpenseNpr = RETIREMENT_MONTHLY_EXPENSE_NPR * 12;
    const retirementYearsCovered = annualExpenseNpr > 0 ? futureValueNpr / annualExpenseNpr : 0;
    const passiveMonthlyIncomeNpr = futureValueNpr * 0.04 / 12;

    const yearlyRows = Array.from({ length: years + 1 }, (_, year) => {
      const nominalValue = principal * Math.pow(1 + annualReturn / 100, year);
      const realValue = nominalValue / Math.pow(1 + NEPAL_INFLATION_RATE / 100, year);
      const profit = Math.max(0, nominalValue - principal);

      return {
        year,
        nominalValue,
        profit,
        realValue,
        inflationDrag: Math.max(0, nominalValue - realValue),
        fireProgress: Math.min(100, (toNpr(nominalValue, currency) / FIRE_TARGET_NPR) * 100),
      };
    });

    return {
      principal,
      annualReturn,
      years,
      futureValue,
      totalProfit,
      inflationAdjustedValue,
      principalNpr,
      futureValueNpr,
      inflationAdjustedNpr,
      fireProgress,
      retirementYearsCovered,
      passiveMonthlyIncomeNpr,
      yearlyRows,
    };
  }, [amountRaw, currency, returnRaw, yearsRaw]);

  const isEmpty = projection.principal <= 0 || projection.years <= 0;
  const targetGapNpr = Math.max(0, FIRE_TARGET_NPR - projection.futureValueNpr);
  const targetGap = fromNpr(targetGapNpr, currency);
  const retirementProjectionCards: Array<{ label: string; value: string; icon: LucideIcon }> = [
    { label: "Nepal Value", value: formatNpr(projection.futureValueNpr), icon: Landmark },
    { label: "Real Value", value: formatNpr(projection.inflationAdjustedNpr), icon: WalletCards },
    { label: "Years Covered", value: `${projection.retirementYearsCovered.toFixed(1)} yrs`, icon: Flame },
  ];

  function applyPreset(preset: (typeof quickPresets)[number]) {
    setCurrency(preset.currency);
    setAmountRaw(String(preset.amount));
  }

  function changeCurrency(nextCurrency: Currency) {
    if (nextCurrency === currency) return;
    const currentAmount = Math.max(0, Number(amountRaw || 0));
    setAmountRaw(String(Math.round(nextCurrency === "KRW" ? currentAmount / KRW_TO_NPR : currentAmount * KRW_TO_NPR)));
    setCurrency(nextCurrency);
  }

  return (
    <main className="premium-shell min-h-screen overflow-hidden bg-[#f4fbf6] px-4 pb-24 pt-6 text-emerald-950 sm:px-6 sm:pt-8 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-5">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/75 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <ArrowLeft size={16} />
            Back to Homepage
          </Link>
        </div>

        <section className="dark-glass-card relative overflow-hidden rounded-[2rem] p-5 text-white sm:p-7 lg:p-9">
          <div className="absolute -left-24 top-8 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-lime-300/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                <Sparkles size={14} />
                Premium FIRE Nepal Tool
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                Lumpsum Calculator for serious wealth compounding.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-emerald-50/85 sm:text-lg">
                Model one-time KRW or NPR investments, inflation-adjusted wealth, FIRE readiness, and Nepal retirement
                coverage in one polished dashboard.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                {quickPresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white/15"
                  >
                    <span className="block text-sm font-black text-white">{preset.label}</span>
                    <span className="mt-1 block text-xs font-bold text-emerald-50/75">{preset.helper}</span>
                  </button>
                ))}
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
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-100">Projected Value</p>
                  <p className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                    {formatCurrency(projection.futureValue, currency)}
                  </p>
                </div>
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-emerald-800 shadow-lg">
                  <Calculator size={25} />
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-950/35 p-4">
                <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
                  <span>FIRE target progress</span>
                  <span>{formatPct(projection.fireProgress)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-lime-300 to-yellow-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${projection.fireProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-3 text-sm font-bold leading-relaxed text-emerald-50/80">
                  At {formatPct(projection.annualReturn)} for {projection.years} years, your capital could cover{" "}
                  {projection.retirementYearsCovered.toFixed(1)} years of NPR 100K/month retirement expenses.
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
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-emerald-950">Investment Inputs</h2>
                    <p className="text-sm font-bold text-slate-500">One-time investment, return rate, and time horizon.</p>
                  </div>
                  <div className="rounded-full border border-emerald-100 bg-white/80 p-1 shadow-sm backdrop-blur">
                    {(["KRW", "NPR"] as const).map((option) => (
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
                <div className="grid gap-4">
                  <InputField
                    label="One-time Investment"
                    value={amountRaw}
                    prefix={currency === "KRW" ? "₩" : "रु"}
                    onChange={(next) => setAmountRaw(sanitizeDecimalInput(next))}
                  />
                  <InputField
                    label="Expected Annual Return"
                    value={returnRaw}
                    suffix="%"
                    onChange={(next) => setReturnRaw(sanitizeDecimalInput(next))}
                  />
                  <InputField
                    label="Investment Years"
                    value={yearsRaw}
                    suffix="yrs"
                    inputMode="numeric"
                    onChange={(next) => setYearsRaw(sanitizeIntegerInput(next))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard
                  label="Future Value"
                  value={formatCurrency(projection.futureValue, currency)}
                  hint="Nominal compounded value before inflation."
                  icon={TrendingUp}
                />
                <StatCard
                  label="Total Profit"
                  value={formatCurrency(projection.totalProfit, currency)}
                  hint="Investment gain above your principal."
                  icon={Banknote}
                  tone="green"
                />
                <StatCard
                  label="Inflation Adjusted"
                  value={formatCurrency(projection.inflationAdjustedValue, currency)}
                  hint={`Real value after ${formatPct(NEPAL_INFLATION_RATE)} Nepal inflation.`}
                  icon={WalletCards}
                  tone="gold"
                />
                <StatCard
                  label="FIRE Gap"
                  value={formatCurrency(targetGap, currency)}
                  hint="Remaining gap to NPR 3Cr target."
                  icon={Target}
                  tone="slate"
                />
              </div>
            </section>

            {isEmpty ? (
              <section className="mt-6 rounded-[2rem] border border-dashed border-emerald-200 bg-white/70 p-8 text-center shadow-sm backdrop-blur">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Gem size={24} />
                </div>
                <h2 className="mt-4 text-2xl font-black text-emerald-950">Enter an amount and timeline to begin.</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-relaxed text-slate-500">
                  Your compound growth chart, inflation graph, and FIRE tracker will appear once the investment model has
                  a positive starting amount and at least one year.
                </p>
              </section>
            ) : (
              <>
                <section className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
                  <div className="glass-card soft-gradient-border rounded-[2rem] p-4 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-emerald-950">Compound Growth Visualization</h2>
                        <p className="text-sm font-bold text-slate-500">Animated nominal, profit, and real-value curve.</p>
                      </div>
                      <LineChart className="text-emerald-700" size={24} />
                    </div>
                    <div className="h-[22rem]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projection.yearlyRows} margin={{ bottom: 0, left: 0, right: 8, top: 12 }}>
                          <defs>
                            <linearGradient id="lumpsumGrowth" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="5%" stopColor="#007a3d" stopOpacity={0.34} />
                              <stop offset="95%" stopColor="#007a3d" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="realGrowth" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="5%" stopColor="#d6a83e" stopOpacity={0.28} />
                              <stop offset="95%" stopColor="#d6a83e" stopOpacity={0.02} />
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
                            contentStyle={{
                              background: "rgba(255,255,255,0.92)",
                              border: "1px solid rgba(0,122,61,0.16)",
                              borderRadius: "18px",
                              boxShadow: "0 18px 50px rgba(0,63,47,0.14)",
                            }}
                            formatter={(value: number | string, name: string) => [
                              formatCurrency(Number(value), currency),
                              name === "nominalValue" ? "Future value" : name === "realValue" ? "Inflation adjusted" : "Profit",
                            ]}
                            labelFormatter={(label) => `Year ${label}`}
                          />
                          <Legend />
                          <Area type="monotone" dataKey="nominalValue" name="Future value" stroke="#007a3d" strokeWidth={3} fill="url(#lumpsumGrowth)" animationDuration={900} />
                          <Area type="monotone" dataKey="realValue" name="Inflation adjusted" stroke="#d6a83e" strokeWidth={3} fill="url(#realGrowth)" animationDuration={900} />
                          <Area type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} fillOpacity={0} animationDuration={900} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                    <div className="mb-5">
                      <h2 className="text-2xl font-black tracking-tight text-emerald-950">FIRE Target Tracker</h2>
                      <p className="text-sm font-bold text-slate-500">Mapped to a premium NPR 3Cr Nepal retirement corpus.</p>
                    </div>
                    <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white shadow-2xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">Progress</p>
                          <p className="mt-1 text-4xl font-black">{formatPct(projection.fireProgress)}</p>
                        </div>
                        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/12 text-lime-200">
                          <Flame size={29} />
                        </div>
                      </div>
                      <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/15">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-lime-300 via-emerald-300 to-yellow-300"
                          initial={{ width: 0 }}
                          animate={{ width: `${projection.fireProgress}%` }}
                          transition={{ duration: 0.85, ease: "easeOut" }}
                        />
                      </div>
                      <p className="mt-4 text-sm font-bold leading-relaxed text-emerald-50/80">
                        Projected Nepal value: {formatNpr(projection.futureValueNpr)}. Estimated 4% monthly passive
                        income: {formatNpr(projection.passiveMonthlyIncomeNpr)}.
                      </p>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {milestones.map(({ label, valueNpr, icon: Icon }) => {
                        const reached = projection.futureValueNpr >= valueNpr;
                        return (
                          <div key={label} className="flex items-center justify-between rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
                            <div className="flex items-center gap-3">
                              <div className={`grid h-10 w-10 place-items-center rounded-2xl ${reached ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                                <Icon size={19} />
                              </div>
                              <div>
                                <p className="font-black text-emerald-950">{label}</p>
                                <p className="text-xs font-bold text-slate-500">{formatNpr(valueNpr)}</p>
                              </div>
                            </div>
                            {reached ? <BadgeCheck className="text-emerald-700" size={21} /> : <span className="text-xs font-black text-slate-400">Locked</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-emerald-950">Inflation Impact Graph</h2>
                        <p className="text-sm font-bold text-slate-500">Nominal wealth versus Nepal purchasing power drag.</p>
                      </div>
                      <BarChart3 className="text-emerald-700" size={24} />
                    </div>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projection.yearlyRows.filter((row) => row.year === 0 || row.year % Math.max(1, Math.ceil(projection.years / 8)) === 0 || row.year === projection.years)}>
                          <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }} />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
                            tickFormatter={(value: number) => compactNumber(value)}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(255,255,255,0.92)",
                              border: "1px solid rgba(0,122,61,0.16)",
                              borderRadius: "18px",
                            }}
                            formatter={(value: number | string, name: string) => [
                              formatCurrency(Number(value), currency),
                              name === "inflationDrag" ? "Inflation drag" : "Real value",
                            ]}
                            labelFormatter={(label) => `Year ${label}`}
                          />
                          <Legend />
                          <Bar dataKey="realValue" name="Inflation adjusted" fill="#007a3d" radius={[12, 12, 0, 0]} animationDuration={850} />
                          <Bar dataKey="inflationDrag" name="Inflation drag" fill="#d6a83e" radius={[12, 12, 0, 0]} animationDuration={850} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass-card soft-gradient-border rounded-[2rem] p-5 sm:p-6">
                    <div className="mb-5">
                      <h2 className="text-2xl font-black tracking-tight text-emerald-950">Nepal Retirement Projection</h2>
                      <p className="text-sm font-bold text-slate-500">A practical lens for return-to-Nepal planning.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {retirementProjectionCards.map(({ label, value, icon: Icon }) => (
                        <div key={String(label)} className="rounded-3xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur transition hover:-translate-y-1">
                          <Icon className="mb-3 text-emerald-700" size={22} />
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                          <p className="mt-2 text-xl font-black text-emerald-950">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 max-h-[28rem] overflow-auto rounded-3xl border border-emerald-100/80 bg-white/75">
                      <table className="min-w-full text-left text-sm">
                        <thead className="sticky top-0 bg-emerald-950 text-xs uppercase tracking-[0.14em] text-emerald-50">
                          <tr>
                            <th className="px-4 py-3 font-black">Year</th>
                            <th className="px-4 py-3 font-black">Future Value</th>
                            <th className="px-4 py-3 font-black">Profit</th>
                            <th className="px-4 py-3 font-black">Real Value</th>
                            <th className="px-4 py-3 font-black">FIRE %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-100/80">
                          {projection.yearlyRows.map((row) => (
                            <tr key={row.year} className="transition hover:bg-emerald-50/75">
                              <td className="whitespace-nowrap px-4 py-3 font-black text-emerald-950">{row.year}</td>
                              <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{formatCurrency(row.nominalValue, currency)}</td>
                              <td className="whitespace-nowrap px-4 py-3 font-bold text-emerald-700">{formatCurrency(row.profit, currency)}</td>
                              <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-700">{formatCurrency(row.realValue, currency)}</td>
                              <td className="whitespace-nowrap px-4 py-3 font-black text-amber-700">{formatPct(row.fireProgress)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
