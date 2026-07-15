"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import {
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Crown,
  Download,
  FileText,
  Gauge,
  Gem,
  GitCompare,
  HandCoins,
  Landmark,
  Loader2,
  Printer,
  RotateCcw,
  Route,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Line } from "react-chartjs-2";
import {
  formatSwpCurrency,
  type SwpAnalysisInputs,
  type SwpSimulationResult,
} from "@/lib/swp-calculator";
import {
  buildSwpDashboardModel,
  formatSwpMultiple,
  runSwpFromInputs,
  type SwpDashboardModel,
  type SwpGoalStatus,
} from "@/lib/swp-dashboard";
import {
  downloadSwpReportPdf,
  printSwpReportPdf,
  shareSwpReportPdf,
} from "@/lib/swp-report";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type AccentKey = "emerald" | "amber" | "red";

const ACCENT: Record<AccentKey, { grad: string; soft: string; text: string; ring: string }> = {
  emerald: {
    grad: "from-emerald-600 to-emerald-500",
    soft: "border-emerald-200/80 bg-emerald-50/80 text-emerald-900",
    text: "text-emerald-700",
    ring: "#059669",
  },
  amber: {
    grad: "from-amber-500 to-amber-400",
    soft: "border-amber-200/80 bg-amber-50/80 text-amber-900",
    text: "text-amber-700",
    ring: "#d97706",
  },
  red: {
    grad: "from-red-600 to-rose-500",
    soft: "border-red-200/80 bg-red-50/80 text-red-900",
    text: "text-red-700",
    ring: "#dc2626",
  },
};

const GOAL_ACCENT: Record<SwpGoalStatus, AccentKey> = {
  "on-track": "emerald",
  attention: "amber",
  "off-track": "red",
};

function Ne({ children, className = "" }: Readonly<{ children: ReactNode; className?: string }>) {
  return <span className={`font-nepali ${className}`}>{children}</span>;
}

function ModuleShell({
  step,
  icon: Icon,
  title,
  nepaliLabel,
  action,
  children,
}: Readonly<{
  step: number;
  icon: LucideIcon;
  title: string;
  nepaliLabel: string;
  action?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section className="glass-card rounded-[1.6rem] p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-md shadow-emerald-950/10">
          <Icon size={22} strokeWidth={2.1} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-slate-400">
            Module {step}
          </span>
          <h3 className="text-base font-black leading-tight text-emerald-950 sm:text-lg">{title}</h3>
          <Ne className="block text-[0.72rem] font-semibold leading-snug text-slate-400">{nepaliLabel}</Ne>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Module 5: What-If simulator (isolated so a `key` remount resets    */
/*  its local sliders whenever the underlying plan changes).           */
/* ------------------------------------------------------------------ */

function Slider({
  label,
  nepaliLabel,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: Readonly<{
  label: string;
  nepaliLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}>) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0">
          <span className="text-[0.78rem] font-bold text-slate-600">{label}</span>
          <Ne className="ml-1.5 text-[0.66rem] font-semibold text-slate-400">{nepaliLabel}</Ne>
        </span>
        <span className="shrink-0 text-[0.82rem] font-black text-emerald-800">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`What-if ${label}`}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-emerald-100 accent-emerald-600"
      />
    </div>
  );
}

function WhatIfSimulator({
  base,
  baseResult,
}: Readonly<{ base: SwpAnalysisInputs; baseResult: SwpSimulationResult }>) {
  const [sim, setSim] = useState<SwpAnalysisInputs>(base);
  const fmt = (n: number) => formatSwpCurrency(n);

  const simResult = useMemo(() => runSwpFromInputs(sim), [sim]);
  const dirty =
    sim.initial !== base.initial ||
    sim.monthly !== base.monthly ||
    sim.annualReturnPct !== base.annualReturnPct ||
    sim.annualInflationPct !== base.annualInflationPct ||
    sim.horizonYears !== base.horizonYears;

  const endingDelta = simResult.endingBalanceNominal - baseResult.endingBalanceNominal;
  const scoreDelta = simResult.sustainabilityScore - baseResult.sustainabilityScore;

  const initialMax = Math.max(1_000_000, Math.round((base.initial || 10_000_000) * 2));
  const monthlyMax = Math.max(100_000, Math.round((base.monthly || 100_000) * 3));

  const set = (patch: Partial<SwpAnalysisInputs>) => setSim((s) => ({ ...s, ...patch }));

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-4">
        <Slider
          label="Initial investment"
          nepaliLabel="प्रारम्भिक लगानी"
          value={Math.min(sim.initial, initialMax)}
          min={0}
          max={initialMax}
          step={Math.max(1, Math.round(initialMax / 200))}
          display={fmt(sim.initial)}
          onChange={(v) => set({ initial: v })}
        />
        <Slider
          label="Monthly withdrawal"
          nepaliLabel="मासिक निकासी"
          value={Math.min(sim.monthly, monthlyMax)}
          min={0}
          max={monthlyMax}
          step={Math.max(1, Math.round(monthlyMax / 200))}
          display={fmt(sim.monthly)}
          onChange={(v) => set({ monthly: v })}
        />
        <Slider
          label="Expected annual return"
          nepaliLabel="अपेक्षित प्रतिफल"
          value={sim.annualReturnPct}
          min={0}
          max={20}
          step={0.5}
          display={`${sim.annualReturnPct}%`}
          onChange={(v) => set({ annualReturnPct: v })}
        />
        <Slider
          label="Inflation"
          nepaliLabel="मुद्रास्फीति"
          value={sim.annualInflationPct}
          min={0}
          max={15}
          step={0.5}
          display={`${sim.annualInflationPct}%`}
          onChange={(v) => set({ annualInflationPct: v })}
        />
        <Slider
          label="Investment horizon"
          nepaliLabel="लगानी अवधि"
          value={sim.horizonYears}
          min={1}
          max={60}
          step={1}
          display={`${sim.horizonYears} yrs`}
          onChange={(v) => set({ horizonYears: v })}
        />
        <button
          type="button"
          onClick={() => setSim(base)}
          disabled={!dirty}
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={14} /> Reset to my plan
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-[1.4rem] bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white">
        <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-emerald-200/70">
          Simulated outcome
        </p>
        <div>
          <p className="text-[0.72rem] font-bold text-emerald-100/70">Remaining portfolio</p>
          <p className="text-2xl font-black tracking-tight">{fmt(Math.max(0, simResult.endingBalanceNominal))}</p>
          {dirty ? (
            <p className={`text-[0.72rem] font-bold ${endingDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {endingDelta >= 0 ? "+" : "−"}
              {fmt(Math.abs(endingDelta))} vs your plan
            </p>
          ) : (
            <p className="text-[0.72rem] font-bold text-emerald-200/60">matches your current plan</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <p className="text-[0.62rem] font-bold text-emerald-100/70">Score</p>
            <p className="text-lg font-black">{simResult.sustainabilityScore}</p>
            {dirty ? (
              <p className={`text-[0.62rem] font-bold ${scoreDelta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {scoreDelta >= 0 ? "+" : "−"}
                {Math.abs(scoreDelta)}
              </p>
            ) : null}
          </div>
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <p className="text-[0.62rem] font-bold text-emerald-100/70">Survival</p>
            <p className="text-sm font-black leading-tight">
              {simResult.depletionMonth === null
                ? `${sim.horizonYears}y+`
                : simResult.survivalYearsDisplay}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Module 7: PDF report actions                                       */
/* ------------------------------------------------------------------ */

function ReportModule({ model }: Readonly<{ model: SwpDashboardModel }>) {
  const [busy, setBusy] = useState<null | "download" | "print" | "share">(null);
  const [status, setStatus] = useState<string | null>(null);

  const run = async (action: "download" | "print" | "share") => {
    if (busy) return;
    setBusy(action);
    setStatus(null);
    try {
      if (action === "download") {
        await downloadSwpReportPdf(model);
        setStatus("Report downloaded.");
      } else if (action === "print") {
        await printSwpReportPdf(model);
        setStatus("Opened print dialog.");
      } else {
        const res = await shareSwpReportPdf(model);
        setStatus(res === "shared" ? "Shared successfully." : res === "downloaded" ? "Sharing unavailable — downloaded instead." : "Share cancelled.");
      }
    } catch {
      setStatus("Something went wrong generating the report.");
    } finally {
      setBusy(null);
    }
  };

  const actions: { key: "download" | "print" | "share"; icon: LucideIcon; label: string }[] = [
    { key: "download", icon: Download, label: "Download" },
    { key: "print", icon: Printer, label: "Print" },
    { key: "share", icon: Share2, label: "Share" },
  ];

  const contents = [
    "Plan summary & goal status",
    "Sustainability & withdrawal safety",
    "Best / expected / worst scenarios",
    "Legacy wealth & recommendations",
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <p className="text-[0.9rem] font-bold leading-relaxed text-slate-600">
          Generate a polished, print-ready retirement report with your full plan, scenario comparison and
          recommendations — ready to save, print or share with family and advisors.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {contents.map((c) => (
            <li key={c} className="flex items-center gap-2 text-[0.82rem] font-semibold text-slate-700">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" /> {c}
            </li>
          ))}
        </ul>
        {status ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800">
            <CheckCircle2 size={13} /> {status}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2.5 rounded-[1.4rem] border border-emerald-100 bg-white/70 p-4">
        <div className="flex items-center gap-2 text-emerald-800">
          <FileText size={18} />
          <p className="text-sm font-black">Retirement Report PDF</p>
        </div>
        {actions.map((a) => {
          const Icon = a.icon;
          const isBusy = busy === a.key;
          const primary = a.key === "download";
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => run(a.key)}
              disabled={busy !== null}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                primary
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md shadow-emerald-950/10 hover:brightness-105"
                  : "border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main dashboard                                                     */
/* ------------------------------------------------------------------ */

export function SwpDashboardV2({
  result,
  inputs,
}: Readonly<{
  result: SwpSimulationResult;
  inputs: SwpAnalysisInputs;
}>) {
  const model = useMemo(
    () => buildSwpDashboardModel(result, inputs),
    [result, inputs],
  );
  const fmt = (n: number) => formatSwpCurrency(n);
  const inputsKey = `${inputs.initial}-${inputs.monthly}-${inputs.annualReturnPct}-${inputs.annualInflationPct}-${inputs.horizonYears}`;

  const goalAccent = GOAL_ACCENT[model.goal.status];

  const chartData = useMemo(() => {
    return {
      labels: model.timeline.map((p) => `Y${p.year}`),
      datasets: [
        {
          label: "Portfolio balance",
          data: model.timeline.map((p) => Math.round(p.balance)),
          borderColor: "#047857",
          backgroundColor: "rgba(4, 120, 87, 0.14)",
          fill: true,
          tension: 0.38,
          pointRadius: 0,
          pointHoverRadius: 5,
          borderWidth: 2.5,
        },
      ],
    };
  }, [model.timeline]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(6, 78, 59, 0.94)",
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            label: (ctx: { raw: unknown }) => ` ${fmt(Number(ctx.raw ?? 0))}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#94a3b8", maxTicksLimit: 10, autoSkip: true } },
        y: {
          grid: { color: "rgba(6, 78, 59, 0.06)" },
          ticks: { color: "#94a3b8", callback: (v: string | number) => fmt(Number(v)) },
        },
      },
    }),
    [],
  );

  const journeyStats: { icon: LucideIcon; label: string; nepaliLabel: string; value: number; grad: string }[] = [
    {
      icon: Wallet,
      label: "Initial",
      nepaliLabel: "प्रारम्भिक",
      value: model.analysis.wealthJourney.initialInvestment,
      grad: "from-emerald-700 to-emerald-600",
    },
    {
      icon: TrendingUp,
      label: "Growth",
      nepaliLabel: "वृद्धि",
      value: model.analysis.wealthJourney.totalGrowth,
      grad: "from-emerald-600 to-lime-500",
    },
    {
      icon: HandCoins,
      label: "Withdrawn",
      nepaliLabel: "निकासी",
      value: model.analysis.wealthJourney.totalWithdrawals,
      grad: "from-amber-500 to-amber-400",
    },
    {
      icon: Landmark,
      label: "Remaining",
      nepaliLabel: "बाँकी",
      value: model.analysis.wealthJourney.remainingPortfolio,
      grad: "from-emerald-800 to-emerald-600",
    },
  ];

  return (
    <section className="animate-fade-in mt-10">
      {/* Header */}
      <div className="dark-glass-card relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8">
        <div className="absolute -left-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-10 h-56 w-56 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400/90 to-yellow-300/90 px-3.5 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-950 shadow-md">
              <Crown size={15} strokeWidth={2.5} /> Premium
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-black text-emerald-100 ring-1 ring-white/15">
              <Sparkles size={14} /> Live dashboard
            </span>
          </div>
          <div className="mt-5 flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400/30 to-lime-300/20 text-emerald-50 ring-1 ring-white/20 backdrop-blur">
              <Gauge size={34} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-black leading-[1.1] tracking-[-0.03em] sm:text-3xl">
                SWP Dashboard v2
              </h2>
              <Ne className="mt-1.5 block text-lg font-semibold leading-snug text-emerald-50/80 sm:text-xl">
                तपाईंको Retirement नियन्त्रण केन्द्र
              </Ne>
            </div>
          </div>
          <Ne className="mt-4 block max-w-2xl text-[0.95rem] font-semibold leading-relaxed text-emerald-50/85">
            एउटै लगानी इन्जिनबाट चल्ने प्रिमियम ड्यासबोर्ड — लक्ष्य स्थिति, परिदृश्य तुलना, What-If
            सिमुलेटर र पेशेवर PDF रिपोर्ट। कुनै पनि विवरण परिवर्तन गर्ने बित्तिकै सबै मोड्युल आफैँ अपडेट हुन्छन्।
          </Ne>
        </div>
      </div>

      {!model.hasData ? (
        <div className="glass-card mt-5 flex items-center gap-4 rounded-[1.5rem] p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white">
            <Target size={24} />
          </span>
          <div>
            <p className="text-base font-black text-emerald-950">Enter your plan to open the dashboard</p>
            <Ne className="mt-1 block text-[0.88rem] font-semibold leading-relaxed text-slate-600">
              माथि प्रारम्भिक लगानी र मासिक निकासी हाल्नुहोस् — सम्पूर्ण ड्यासबोर्ड तुरुन्तै सक्रिय हुनेछ।
            </Ne>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-4">
          {/* Module 1: Retirement Goal Status */}
          <ModuleShell step={1} icon={Target} title="Retirement Goal Status" nepaliLabel="Retirement लक्ष्य स्थिति">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <div
                className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(${ACCENT[goalAccent].ring} ${Math.min(
                    360,
                    model.goal.progressPct * 3.6,
                  )}deg, #e2f5eb 0deg)`,
                }}
              >
                <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner">
                  <div>
                    <p className={`text-2xl font-black leading-none ${ACCENT[goalAccent].text}`}>
                      {model.goal.progressPct}%
                    </p>
                    <p className="mt-0.5 text-[0.55rem] font-black uppercase tracking-wide text-slate-400">
                      horizon
                    </p>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-black ${ACCENT[goalAccent].soft}`}
                >
                  <Target size={15} /> {model.goal.labelEn}
                  <Ne>({model.goal.labelNe})</Ne>
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                    Score {model.analysis.score.value}/100
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">
                    {model.analysis.withdrawal.ratePct.toFixed(2)}% withdrawal
                  </span>
                </div>
                <Ne className="mt-3 block text-[0.9rem] font-semibold leading-relaxed text-slate-700">
                  {model.goal.detailNe}
                </Ne>
              </div>
            </div>
          </ModuleShell>

          {/* Module 2: Remaining Portfolio Hero Card */}
          <section className="dark-glass-card relative overflow-hidden rounded-[1.8rem] p-6 text-white sm:p-8">
            <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-amber-300/15 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/90 to-yellow-300/80 text-emerald-950 shadow-md">
                  <Gem size={22} strokeWidth={2.1} />
                </span>
                <div>
                  <span className="text-[0.6rem] font-black uppercase tracking-[0.15em] text-emerald-100/60">
                    Module 2
                  </span>
                  <h3 className="text-lg font-black leading-tight sm:text-xl">Remaining Portfolio</h3>
                  <Ne className="block text-sm font-semibold text-emerald-50/70">बाँकी Portfolio</Ne>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/60">
                    Estimated remaining wealth
                  </p>
                  <p className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">{fmt(model.legacy.value)}</p>
                  {model.legacy.hasLegacy ? (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-emerald-200">
                      <ArrowUpRight size={15} /> {formatSwpMultiple(model.legacy.multipleOfInitial)} your initial investment
                    </p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:w-auto">
                  <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                    <p className="text-[0.62rem] font-bold text-emerald-100/70">Total withdrawn</p>
                    <p className="text-sm font-black">{fmt(model.analysis.wealthJourney.totalWithdrawals)}</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                    <p className="text-[0.62rem] font-bold text-emerald-100/70">Total growth</p>
                    <p className="text-sm font-black">{fmt(model.analysis.wealthJourney.totalGrowth)}</p>
                  </div>
                </div>
              </div>
              <Ne className="mt-4 block text-[0.9rem] font-semibold leading-relaxed text-emerald-50/80">
                {model.analysis.remaining.meaningNe}
              </Ne>
            </div>
          </section>

          {/* Module 3: Wealth Journey Visualization */}
          <ModuleShell step={3} icon={Route} title="Wealth Journey Visualization" nepaliLabel="सम्पत्तिको यात्रा">
            <div className="h-64 w-full min-h-[14rem]">
              <Line data={chartData} options={chartOptions} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {journeyStats.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-2xl border border-emerald-100/80 bg-white/70 p-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${s.grad} text-white`}
                    >
                      <Icon size={16} />
                    </span>
                    <p className="mt-2 text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                      {s.label}
                    </p>
                    <Ne className="block text-[0.6rem] font-semibold text-slate-400">{s.nepaliLabel}</Ne>
                    <p className="mt-0.5 text-sm font-black text-emerald-900">{fmt(s.value)}</p>
                  </div>
                );
              })}
            </div>
          </ModuleShell>

          {/* Module 4: Scenario Comparison */}
          <ModuleShell
            step={4}
            icon={GitCompare}
            title="Scenario Comparison"
            nepaliLabel="परिदृश्य तुलना (उत्कृष्ट · अपेक्षित · प्रतिकूल)"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {model.scenarios.map((s) => {
                const accent: AccentKey =
                  s.key === "best" ? "emerald" : s.key === "expected" ? "emerald" : "amber";
                const highlighted = s.key === "expected";
                return (
                  <div
                    key={s.key}
                    className={`rounded-2xl border p-4 ${
                      highlighted
                        ? "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-300/50"
                        : "border-emerald-100/80 bg-white/70"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-black text-emerald-950">{s.labelEn}</p>
                      {highlighted ? (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[0.6rem] font-black uppercase text-white">
                          Your plan
                        </span>
                      ) : null}
                    </div>
                    <Ne className="block text-[0.66rem] font-semibold text-slate-400">{s.labelNe}</Ne>
                    <p className={`mt-2 text-2xl font-black tracking-tight ${ACCENT[accent].text}`}>
                      {fmt(s.endingBalance)}
                    </p>
                    <p className="text-[0.68rem] font-bold text-slate-500">remaining @ {s.annualReturnPct}% return</p>
                    <div className="mt-3 flex items-center justify-between border-t border-emerald-100/70 pt-2 text-[0.72rem] font-bold text-slate-600">
                      <span>
                        Survival:{" "}
                        <span className="font-black text-emerald-800">
                          {s.survivesFullHorizon ? `${model.inputs.horizonYears}y+` : s.survivalYearsDisplay}
                        </span>
                      </span>
                      <span className="font-black text-emerald-800">{s.sustainabilityScore}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ModuleShell>

          {/* Module 5: Interactive What-If Simulator */}
          <ModuleShell
            step={5}
            icon={SlidersHorizontal}
            title="Interactive What-If Simulator"
            nepaliLabel="What-If सिमुलेटर"
          >
            <WhatIfSimulator key={inputsKey} base={inputs} baseResult={result} />
          </ModuleShell>

          {/* Module 6: Legacy Wealth Section */}
          <ModuleShell step={6} icon={Landmark} title="Legacy Wealth" nepaliLabel="विरासत सम्पत्ति">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <Ne className="block text-[0.95rem] font-black leading-relaxed text-emerald-950">
                  {model.legacy.headlineNe}
                </Ne>
                <Ne className="mt-2 block text-[0.88rem] font-semibold leading-relaxed text-slate-600">
                  {model.legacy.detailNe}
                </Ne>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {model.legacy.bulletsNe.map((b, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-2xl border border-emerald-100/80 bg-emerald-50/50 px-3.5 py-2.5"
                    >
                      <Gem size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                      <Ne className="text-[0.82rem] font-semibold leading-relaxed text-slate-700">{b}</Ne>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3 rounded-[1.4rem] bg-gradient-to-br from-emerald-700 to-emerald-500 p-5 text-white">
                <div className="flex items-center gap-2 text-emerald-100">
                  <Coins size={18} />
                  <p className="text-[0.7rem] font-black uppercase tracking-wide">Legacy value</p>
                </div>
                <p className="text-3xl font-black tracking-tight">{fmt(model.legacy.value)}</p>
                {model.legacy.hasLegacy ? (
                  <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                    <p className="text-[0.62rem] font-bold text-emerald-100/80">Could provide (4% rule)</p>
                    <p className="text-lg font-black">{fmt(model.legacy.annualLegacyIncome)}/yr</p>
                  </div>
                ) : null}
              </div>
            </div>
          </ModuleShell>

          {/* Module 7: Professional Retirement PDF Report */}
          <ModuleShell
            step={7}
            icon={FileText}
            title="Professional Retirement Report"
            nepaliLabel="पेशेवर Retirement रिपोर्ट (PDF)"
          >
            <ReportModule model={model} />
          </ModuleShell>
        </div>
      )}
    </section>
  );
}
