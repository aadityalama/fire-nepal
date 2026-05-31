"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Gauge,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { SavingsRingProgress } from "@/components/savings-tracker/SavingsRingProgress";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { useFireTheme } from "@/contexts/FireThemeContext";

type RiskLevel = "stable" | "moderate" | "high";

const KRW_TO_NPR = 0.1029;
const MONTHS = ["Now", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"];
const BUCKET_COLORS = ["#10b981", "#14b8a6", "#84cc16", "#f59e0b"];

const riskProfiles: Record<RiskLevel, { label: string; recommendedMonths: number; bufferPct: number; helper: string }> = {
  stable: {
    label: "Stable job",
    recommendedMonths: 6,
    bufferPct: 0.08,
    helper: "Regular salary, low dependents",
  },
  moderate: {
    label: "Family support",
    recommendedMonths: 8,
    bufferPct: 0.14,
    helper: "Remittance + family duties",
  },
  high: {
    label: "Return-ready",
    recommendedMonths: 12,
    bufferPct: 0.22,
    helper: "Visa/job risk or Nepal return",
  },
};

const emergencyBuckets = [
  { name: "Cash in Korea", value: 185_000, note: "Instant access" },
  { name: "Nepal bank", value: 155_000, note: "Family liquidity" },
  { name: "Digital wallet", value: 45_000, note: "First 72 hours" },
  { name: "Reserve gap", value: 215_000, note: "To target" },
];

function sanitizeIntegerInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function formatNpr(value: number) {
  return new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "NPR",
  }).format(Math.round(value));
}

function formatKrw(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "KRW",
  }).format(Math.round(value));
}

function formatMonths(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mo`;
}

function parseNumber(value: string) {
  return Math.max(0, Number(value || 0));
}

function MotionCard({
  children,
  className = "",
  delay = 0,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}>) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`wealth-glass ${className}`}
    >
      {children}
    </motion.section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  prefix,
  helper,
}: Readonly<{
  label: string;
  value: string;
  onChange: (next: string) => void;
  prefix: string;
  helper: string;
}>) {
  return (
    <label className="block rounded-2xl border border-emerald-200/70 bg-white/80 p-4 shadow-sm transition focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:ring-emerald-400/10">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">{label}</span>
      <span className="mt-3 flex items-center gap-2">
        <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{prefix}</span>
        <input
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(sanitizeIntegerInput(event.target.value))}
          className="min-w-0 flex-1 bg-transparent text-right text-2xl font-black tracking-tight text-slate-950 outline-none placeholder:text-emerald-200 dark:text-white sm:text-3xl"
          placeholder="0"
        />
      </span>
      <span className="mt-2 block text-xs font-semibold leading-relaxed text-slate-500 dark:text-zinc-500">{helper}</span>
    </label>
  );
}

function ChartSkeleton({ light }: { light: boolean }) {
  return (
    <div className={`wealth-chart-card flex h-[240px] flex-col justify-end gap-3 p-4 ${light ? "border-slate-200/80" : ""}`}>
      <div className={`h-3 w-32 rounded-full ${light ? "bg-slate-200/90" : "bg-white/10"}`} />
      <div className="flex flex-1 items-end gap-2">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className={`flex-1 rounded-t-lg motion-safe:animate-pulse ${light ? "bg-emerald-200/55" : "bg-emerald-500/20"}`}
            style={{ height: `${32 + ((index * 19) % 58)}%`, animationDelay: `${index * 70}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
}: Readonly<{
  label: string;
  value: string;
  hint: string;
  icon: typeof ShieldCheck;
}>) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
      className="wealth-glass flex min-h-[148px] flex-col justify-between p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700/90 dark:text-emerald-300/75">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <Icon size={21} />
        </div>
      </div>
      <p className="text-xs font-semibold leading-relaxed text-slate-500 dark:text-zinc-400">{hint}</p>
    </motion.article>
  );
}

export function EmergencyFundDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const chartId = useId().replace(/:/g, "");
  const [chartsReady, setChartsReady] = useState(false);
  const [monthlyExpenseRaw, setMonthlyExpenseRaw] = useState("100000");
  const [currentFundRaw, setCurrentFundRaw] = useState("420000");
  const [monthlySaveRaw, setMonthlySaveRaw] = useState("45000");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderate");

  useEffect(() => {
    const id = window.setTimeout(() => setChartsReady(true), 520);
    return () => window.clearTimeout(id);
  }, []);

  const analytics = useMemo(() => {
    const monthlyExpense = parseNumber(monthlyExpenseRaw);
    const currentFund = parseNumber(currentFundRaw);
    const monthlySave = parseNumber(monthlySaveRaw);
    const risk = riskProfiles[riskLevel];
    const recommendedFund = monthlyExpense * risk.recommendedMonths * (1 + risk.bufferPct);
    const gap = Math.max(0, recommendedFund - currentFund);
    const runwayMonths = monthlyExpense > 0 ? currentFund / monthlyExpense : 0;
    const readiness = recommendedFund > 0 ? Math.min(100, (currentFund / recommendedFund) * 100) : 100;
    const monthsToTarget = monthlySave > 0 ? Math.ceil(gap / monthlySave) : 0;
    const stressRunway = monthlyExpense > 0 ? currentFund / (monthlyExpense * 1.25) : 0;
    const nextMilestone = Math.min(100, Math.ceil(readiness / 10) * 10);

    const projection = MONTHS.map((label, index) => {
      const fund = Math.min(recommendedFund, currentFund + monthlySave * index);
      return {
        label,
        fund,
        target: recommendedFund,
        readiness: recommendedFund > 0 ? Math.min(100, (fund / recommendedFund) * 100) : 100,
      };
    });

    const scenarios = [
      { name: "Job loss", months: runwayMonths, target: risk.recommendedMonths },
      { name: "Medical", months: currentFund / Math.max(1, monthlyExpense + 35_000), target: 4 },
      { name: "Return buffer", months: stressRunway, target: risk.recommendedMonths },
    ];

    return {
      monthlyExpense,
      currentFund,
      monthlySave,
      recommendedFund,
      gap,
      runwayMonths,
      readiness,
      monthsToTarget,
      stressRunway,
      nextMilestone,
      projection,
      scenarios,
    };
  }, [currentFundRaw, monthlyExpenseRaw, monthlySaveRaw, riskLevel]);

  const tickColor = light ? "#64748b" : "#a1a1aa";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";
  const tooltipBg = light ? "rgba(255,255,255,0.96)" : "rgba(3, 8, 6, 0.94)";
  const tooltipBorder = light ? "rgba(16, 185, 129, 0.25)" : "rgba(52, 211, 153, 0.2)";
  const axisProps = {
    stroke: tickColor,
    tick: { fill: tickColor, fontSize: 11, fontWeight: 700 },
    tickLine: false,
    axisLine: { stroke: gridColor },
  } as const;

  return (
    <WealthDashboardShell
      brand={{ tagline: "Emergency OS", iconGradient: "from-emerald-400 to-teal-300" }}
      footerNote="Emergency fund planner uses demo KRW/NPR assumptions. Production data can stay local and private."
    >
      <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
        <Link
          href="/"
          className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-black shadow-sm backdrop-blur-md transition duration-300 active:scale-[0.98] sm:text-sm ${
            light
              ? "border-emerald-200/90 bg-white/95 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/90"
              : "border-emerald-400/18 bg-white/[0.06] text-emerald-50/95 hover:border-teal-300/35 hover:bg-white/10"
          }`}
        >
          <ArrowLeft size={15} /> Back to FIRE Nepal
        </Link>
        <div className={`flex items-center gap-2 text-[11px] font-bold sm:text-xs ${light ? "text-emerald-800/80" : "text-emerald-200/70"}`}>
          <BellRing size={14} className={light ? "text-emerald-600" : "text-lime-300"} />
          Safety fund analytics
        </div>
      </div>

      <div className="wealth-dash-flow flex flex-col gap-5 scroll-smooth lg:gap-6">
        <DashboardSectionHeader
          accent="teal"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200/90">
              <ShieldCheck size={12} className="text-emerald-600 dark:text-emerald-300" />
              Emergency fund
            </span>
          }
          title="Emergency fund command center"
          subtitle="Track safety runway, liquidity, stress scenarios, and Nepal-return readiness from one mobile-friendly dashboard."
        />

        <MotionCard className="relative overflow-hidden p-5 sm:p-6 lg:p-7">
          <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/15" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_340px] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">
                Readiness score
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950 dark:text-white sm:text-5xl">
                {Math.round(analytics.readiness)}% protected
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400 sm:text-base">
                You have {formatMonths(analytics.runwayMonths)} of baseline runway and {formatMonths(analytics.stressRunway)} under a 25% expense shock.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MetricTile label="Current fund" value={formatNpr(analytics.currentFund)} hint={`≈ ${formatKrw(analytics.currentFund / KRW_TO_NPR)}`} icon={WalletCards} />
                <MetricTile label="Target fund" value={formatNpr(analytics.recommendedFund)} hint={`${riskProfiles[riskLevel].recommendedMonths} months + buffer`} icon={Gauge} />
                <MetricTile label="Gap to close" value={formatNpr(analytics.gap)} hint={analytics.gap === 0 ? "Fully funded" : `${analytics.monthsToTarget} months at current pace`} icon={PiggyBank} />
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-emerald-200/70 bg-white/75 p-5 shadow-inner dark:border-white/10 dark:bg-black/20">
              <SavingsRingProgress pct={analytics.readiness} label="Funded" sublabel="score" size={176} stroke={12} />
              <div className="mt-5 rounded-2xl bg-emerald-500/10 p-4 text-center">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">Next milestone</p>
                <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">{analytics.nextMilestone}% readiness</p>
              </div>
            </div>
          </div>
        </MotionCard>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <MotionCard className="p-4 sm:p-5" delay={0.05}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">Planner inputs</p>
                <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Tune your buffer</h3>
              </div>
              <Sparkles className="text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="grid gap-3">
              <NumberInput label="Monthly essential cost" value={monthlyExpenseRaw} onChange={setMonthlyExpenseRaw} prefix="रु" helper="Rent, food, family support, insurance" />
              <NumberInput label="Current emergency fund" value={currentFundRaw} onChange={setCurrentFundRaw} prefix="रु" helper="Liquid cash you can access quickly" />
              <NumberInput label="Monthly top-up" value={monthlySaveRaw} onChange={setMonthlySaveRaw} prefix="रु" helper="Amount dedicated only to safety fund" />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {(Object.keys(riskProfiles) as RiskLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskLevel(level)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    riskLevel === level
                      ? "border-emerald-400 bg-emerald-500/12 text-emerald-950 shadow-sm dark:text-white"
                      : "border-slate-200/80 bg-white/60 text-slate-600 hover:border-emerald-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400"
                  }`}
                >
                  <span className="block text-sm font-black">{riskProfiles[level].label}</span>
                  <span className="mt-1 block text-xs font-semibold leading-snug">{riskProfiles[level].helper}</span>
                </button>
              ))}
            </div>
          </MotionCard>

          <MotionCard className="p-4 sm:p-5" delay={0.1}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">Emergency analytics</p>
                <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">Scenario coverage</h3>
              </div>
              <ArrowUpRight className="text-emerald-600 dark:text-emerald-300" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {analytics.scenarios.map((scenario) => {
                const pct = Math.min(100, (scenario.months / scenario.target) * 100);
                return (
                  <div key={scenario.name} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{scenario.name}</p>
                    <p className="mt-2 text-2xl font-black text-emerald-700 dark:text-emerald-200">{formatMonths(scenario.months)}</p>
                    <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-zinc-500">Target {formatMonths(scenario.target)}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-500/10 p-4 dark:border-emerald-400/15">
              <div className="flex gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300" size={20} />
                <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-zinc-300">
                  Keep two weeks in instant-access cash, one month in Korea banking, and the rest in a Nepal account your family can reach.
                </p>
              </div>
            </div>
          </MotionCard>
        </div>

        {chartsReady ? (
          <div className="grid gap-4 xl:grid-cols-3">
            <MotionCard className="wealth-chart-card p-3 sm:p-4" delay={0.12}>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">Funding path</p>
              <p className="mb-3 text-sm font-bold text-slate-600 dark:text-zinc-400">Emergency fund vs target</p>
              <div className="h-[220px] w-full min-w-0 sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.projection} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`${chartId}-fund`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={(value) => `${Math.round(Number(value) / 1000)}K`} width={42} />
                    <Tooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 14, fontSize: 12, fontWeight: 700 }}
                      formatter={(value: number) => [formatNpr(value), "Fund"]}
                    />
                    <Area type="monotone" dataKey="fund" stroke="#10b981" strokeWidth={2.25} fill={`url(#${chartId}-fund)`} animationDuration={900} />
                    <Line type="monotone" dataKey="target" stroke="#a3e635" strokeDasharray="6 5" strokeWidth={2} dot={false} animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </MotionCard>

            <MotionCard className="wealth-chart-card p-3 sm:p-4" delay={0.16}>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">Liquidity mix</p>
              <p className="mb-3 text-sm font-bold text-slate-600 dark:text-zinc-400">Where the buffer sits</p>
              <div className="h-[220px] w-full min-w-0 sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={emergencyBuckets} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4} animationDuration={900}>
                      {emergencyBuckets.map((entry, index) => (
                        <Cell key={entry.name} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 14, fontSize: 12, fontWeight: 700 }}
                      formatter={(value: number) => formatNpr(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </MotionCard>

            <MotionCard className="wealth-chart-card p-3 sm:p-4" delay={0.2}>
              <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">Readiness lift</p>
              <p className="mb-3 text-sm font-bold text-slate-600 dark:text-zinc-400">Score over the next 8 months</p>
              <div className="h-[220px] w-full min-w-0 sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.projection} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="label" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={(value) => `${Math.round(Number(value))}%`} width={38} />
                    <Tooltip
                      contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 14, fontSize: 12, fontWeight: 700 }}
                      formatter={(value: number) => [`${Math.round(value)}%`, "Readiness"]}
                    />
                    <Bar dataKey="readiness" fill="#10b981" radius={[10, 10, 4, 4]} animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </MotionCard>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            <ChartSkeleton light={light} />
            <ChartSkeleton light={light} />
            <ChartSkeleton light={light} />
          </div>
        )}

        <MotionCard className="p-4 sm:p-5" delay={0.24}>
          <div className="grid gap-4 md:grid-cols-3">
            {([
              ["Auto reminder", "Top up safety fund on salary day before discretionary spending.", CalendarClock],
              ["KRW/NPR lens", `Current fund is about ${formatKrw(analytics.currentFund / KRW_TO_NPR)} at demo rate.`, TrendingUp],
              ["Route status", "/emergency-fund is a dedicated stable dashboard route.", ShieldCheck],
            ] satisfies Array<[string, string, typeof ShieldCheck]>).map(([title, body, Icon]) => (
              <div key={String(title)} className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <Icon className="text-emerald-600 dark:text-emerald-300" size={21} />
                <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500 dark:text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>
    </WealthDashboardShell>
  );
}
