"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Brain,
  Check,
  ChevronRight,
  Clock,
  Flag,
  GraduationCap,
  Home,
  LineChart,
  Scale,
  Shield,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { computeWealthTotals, netWorthMonthOverMonthPercent } from "@/components/portfolio/calculations";
import { loadWealthPortfolioState } from "@/components/portfolio/storage";
import { formatNprInteger, formatPct } from "@/components/savings-tracker/savings-currency";
import { useReturnToNepalPlanner } from "@/contexts/ReturnToNepalContext";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { INSURANCE_MODULE_SYNC_EVENT } from "@/lib/cashflow/live-sync-events";
import { FALLBACK_KRW_PER_NPR } from "@/lib/exchange-rate";
import { useInsuranceEngineInputs } from "@/lib/insurance/use-insurance-engine-inputs";
import { FALLBACK_USD_PER_NPR } from "@/lib/portfolio-convert";
import {
  computeReturnAiInsights,
  computeWhatIfScenarios,
  formatReturnCountdown,
  recommendedReturnMonthYear,
} from "@/lib/return-to-nepal/return-ai-engine";
import { computeReturnChecklist, type ChecklistStatus } from "@/lib/return-to-nepal/return-checklist";
import { computeReturnRoadmap } from "@/lib/return-to-nepal/return-roadmap";
import {
  aggregateReadinessPct,
  computeReturnReadinessScores,
  type ReturnReadinessScore,
} from "@/lib/return-to-nepal/return-readiness-scores";
import { syncInsuranceSettlementFlags } from "@/lib/return-to-nepal/return-readiness-pillars";
import { loadSavingsWorkspaceState } from "@/lib/savings/savings-storage";

const PAGE_BG = "#000805";
const GLASS = "rounded-[1.35rem] border border-white/10 bg-white/[0.055] backdrop-blur-xl sm:rounded-[1.5rem]";

function StatusBadge({ status }: { status: ChecklistStatus }) {
  const styles: Record<ChecklistStatus, string> = {
    completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30",
    on_track: "bg-teal-500/15 text-teal-200 ring-teal-400/25",
    in_progress: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
    missing: "bg-rose-500/15 text-rose-200 ring-rose-400/25",
  };
  const labels: Record<ChecklistStatus, string> = {
    completed: "Completed",
    on_track: "On Track",
    in_progress: "In Progress",
    missing: "Missing",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  hintPositive,
}: {
  label: string;
  value: string;
  hint?: string;
  hintPositive?: boolean;
}) {
  return (
    <div className={`${GLASS} min-w-[148px] flex-1 p-3.5 sm:min-w-0 sm:p-4`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">{label}</p>
      <p className="mt-2 truncate text-[clamp(1rem,3.5vw,1.15rem)] font-black tracking-[-0.04em] text-white">{value}</p>
      {hint ? (
        <p className={`mt-1 text-[10px] font-bold ${hintPositive ? "text-emerald-400" : "text-emerald-100/40"}`}>{hint}</p>
      ) : null}
    </div>
  );
}

function PillarRow({ score }: { score: ReturnReadinessScore }) {
  const icon =
    score.pct >= 75 ? (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
        <Check size={13} strokeWidth={3} />
      </span>
    ) : (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
      </span>
    );
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon}
        <span className="truncate text-sm font-bold text-white/90">{score.label}</span>
      </div>
      <span className="shrink-0 text-sm font-black tabular-nums text-emerald-300">{score.pct}%</span>
    </div>
  );
}

function RoadmapIcon({ icon }: { icon: "shield" | "home" | "chart" | "education" | "flag" }) {
  const props = { size: 16, className: "text-emerald-400" };
  switch (icon) {
    case "shield":
      return <Shield {...props} />;
    case "home":
      return <Home {...props} />;
    case "education":
      return <GraduationCap {...props} />;
    case "flag":
      return <Flag {...props} />;
    default:
      return <LineChart {...props} />;
  }
}

function HeroFlightPath() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-80" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="rtn-flight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
          <stop offset="50%" stopColor="#34d399" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <motion.path
        d="M 20 140 Q 120 60, 220 90 T 380 50"
        fill="none"
        stroke="url(#rtn-flight)"
        strokeWidth="2"
        strokeDasharray="6 8"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
      />
      <motion.circle
        r="5"
        fill="#ffffff"
        initial={{ opacity: 0 }}
        animate={{
          opacity: [0.4, 1, 1, 0.4],
          cx: [20, 120, 220, 300, 360, 20],
          cy: [140, 70, 90, 60, 50, 140],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

export function ReturnToNepalPlannerDashboard() {
  const { user } = useProductAuth();
  const { effectiveState, snapshot, live, patch, state } = useReturnToNepalPlanner();
  const { inputs: insuranceInputs, tick: insuranceTick } = useInsuranceEngineInputs();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const synced = syncInsuranceSettlementFlags(state.settlementChecklist, insuranceInputs);
    const same =
      synced.length === state.settlementChecklist.length && synced.every((id) => state.settlementChecklist.includes(id));
    if (!same) patch({ settlementChecklist: synced });
  }, [insuranceInputs, insuranceTick, patch, state.settlementChecklist]);

  useEffect(() => {
    const onInsurance = () => patch({ settlementChecklist: syncInsuranceSettlementFlags(state.settlementChecklist, insuranceInputs) });
    window.addEventListener(INSURANCE_MODULE_SYNC_EVENT, onInsurance);
    return () => window.removeEventListener(INSURANCE_MODULE_SYNC_EVENT, onInsurance);
  }, [insuranceInputs, patch, state.settlementChecklist]);

  const portfolio = useMemo(() => {
    void insuranceTick;
    return loadWealthPortfolioState(user?.id);
  }, [insuranceTick, user?.id]);

  const wealth = useMemo(
    () => computeWealthTotals(portfolio, FALLBACK_KRW_PER_NPR, FALLBACK_USD_PER_NPR),
    [portfolio],
  );

  const nwMomPct = useMemo(
    () => netWorthMonthOverMonthPercent(portfolio.netWorthHistory ?? []),
    [portfolio.netWorthHistory],
  );

  const readinessScores = useMemo(
    () => computeReturnReadinessScores(effectiveState, snapshot, insuranceInputs, wealth.investableNpr, wealth.liabilitiesNpr),
    [effectiveState, snapshot, insuranceInputs, wealth.investableNpr, wealth.liabilitiesNpr],
  );

  const readinessPct = useMemo(() => aggregateReadinessPct(readinessScores), [readinessScores]);

  const checklist = useMemo(
    () => computeReturnChecklist(effectiveState, snapshot, insuranceInputs, wealth.investableNpr, wealth.liabilitiesNpr),
    [effectiveState, snapshot, insuranceInputs, wealth.investableNpr, wealth.liabilitiesNpr],
  );

  const roadmap = useMemo(() => {
    const goals = loadSavingsWorkspaceState().goals;
    return computeReturnRoadmap(goals, snapshot, snapshot.estimatedReturnYear);
  }, [snapshot]);

  const scenarios = useMemo(
    () => computeWhatIfScenarios(effectiveState, snapshot, insuranceInputs, wealth.investableNpr, wealth.liabilitiesNpr),
    [effectiveState, snapshot, insuranceInputs, wealth.investableNpr, wealth.liabilitiesNpr],
  );

  const aiInsights = useMemo(
    () => computeReturnAiInsights(effectiveState, snapshot, readinessPct, wealth.investableNpr, wealth.liabilitiesNpr),
    [effectiveState, snapshot, readinessPct, wealth.investableNpr, wealth.liabilitiesNpr],
  );

  const primaryInsight = aiInsights.find((i) => i.id === "save-more") ?? aiInsights[0];
  const recommendedDate = recommendedReturnMonthYear(snapshot.estimatedReturnYear);
  const countdown = formatReturnCountdown(snapshot.estimatedReturnYear);
  const cityLabel = effectiveState.city.charAt(0).toUpperCase() + effectiveState.city.slice(1);
  const householdLabel = `Family of ${effectiveState.adults + effectiveState.children}`;

  const riskColors = {
    high: "text-rose-400 bg-rose-500/15 ring-rose-400/25",
    moderate: "text-amber-300 bg-amber-500/15 ring-amber-400/25",
    low: "text-emerald-300 bg-emerald-500/15 ring-emerald-400/25",
    very_safe: "text-teal-200 bg-teal-500/15 ring-teal-400/25",
  } as const;

  if (!mounted) {
    return <div className="min-h-screen" style={{ background: PAGE_BG }} />;
  }

  return (
    <div className="min-h-screen pb-28 text-white" style={{ background: PAGE_BG }}>
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        {/* Header */}
        <header className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/portfolio"
              className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white/80 transition hover:border-emerald-400/30 hover:bg-white/[0.1]"
              aria-label="Back to portfolio"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">Return to Nepal Planner</h1>
              <p className="mt-0.5 text-sm font-semibold text-emerald-100/50">
                Your path to a financially free life in Nepal 🇳🇵
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-black text-emerald-200"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              AI Analysis
            </button>
            <button
              type="button"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06]"
              aria-label="Notifications"
            >
              <Bell size={18} className="text-white/70" />
              {checklist.filter((c) => c.status === "in_progress" || c.status === "missing").length > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black">
                  {checklist.filter((c) => c.status !== "completed").length}
                </span>
              ) : null}
            </button>
          </div>
        </header>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative mb-5 overflow-hidden rounded-[1.5rem] border border-white/10 sm:mb-6 sm:rounded-[1.75rem]"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(0,8,5,0.55) 0%, rgba(0,8,5,0.75) 45%, rgba(0,8,5,0.92) 100%), radial-gradient(ellipse at 70% 20%, rgba(16,185,129,0.25) 0%, transparent 55%), linear-gradient(180deg, #0c2e24 0%, #041a14 40%, #000805 100%)",
            }}
          />
          <HeroFlightPath />
          <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300/70">Recommended Return Date</p>
              <p className="mt-2 text-[clamp(1.75rem,5vw,2.5rem)] font-black tracking-tight text-emerald-300">{recommendedDate}</p>
              <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-bold text-white/90 backdrop-blur-md">
                <Clock size={14} className="text-emerald-400" />
                {countdown}
              </span>
              <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-white/55">
                Based on your income, savings, investments, pension, expenses and Nepal cost of living.
              </p>
            </div>
            <div className="flex flex-col items-start lg:items-end">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-100/45">Return Readiness</p>
              <p className="mt-1 text-5xl font-black tabular-nums tracking-tight text-white sm:text-6xl">{readinessPct}%</p>
              <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-emerald-300">
                <Check size={16} strokeWidth={3} />
                {readinessPct >= 70 ? "You are on the right track!" : "Building momentum — keep saving."}
              </p>
              <div className="mt-4 w-full max-w-xs">
                <div className="mb-1 flex justify-between text-[10px] font-bold text-white/40">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${readinessPct}%` }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* KPI strip */}
        <div className="-mx-4 mb-5 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
          <KpiCard
            label="Net Worth"
            value={formatNprInteger(live.netWorthNpr)}
            hint={nwMomPct != null ? `${formatPct(nwMomPct)} vs last month` : "From portfolio"}
            hintPositive={nwMomPct != null && nwMomPct >= 0}
          />
          <KpiCard
            label="Monthly Passive Income"
            value={formatNprInteger(live.passiveMonthlyNpr)}
            hint="Investments + FD + dividends"
            hintPositive
          />
          <KpiCard
            label="Nepal Monthly Cost"
            value={formatNprInteger(snapshot.monthlyNepalLivingNpr || live.nepalColMonthlyNpr)}
            hint={`${cityLabel} · ${householdLabel}`}
          />
          <KpiCard
            label="Emergency Fund"
            value={`${snapshot.emergencyReserveMonths.toFixed(1)} Mo`}
            hint={snapshot.emergencyReserveMonths >= effectiveState.emergencyMonthsTarget ? "On track" : "Build runway"}
            hintPositive={snapshot.emergencyReserveMonths >= effectiveState.emergencyMonthsTarget}
          />
          <KpiCard
            label="FIRE Progress"
            value={live.fireProgressPct != null ? `${Math.round(live.fireProgressPct)}%` : "—"}
            hint={live.savingsRatePct != null ? `${live.savingsRatePct.toFixed(1)}% savings rate` : "Add cashflow data"}
            hintPositive
          />
        </div>

        {/* Middle row */}
        <div className="mb-5 grid gap-4 lg:grid-cols-2 lg:gap-5">
          <div className={`${GLASS} p-5 sm:p-6`}>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-100/45">Return Readiness Overview</h2>
            <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
              <div
                className="relative mx-auto grid h-36 w-36 shrink-0 place-items-center rounded-full sm:mx-0"
                style={{
                  background: `conic-gradient(#10b981 ${readinessPct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
                }}
              >
                <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-[#00120d] text-center">
                  <span className="text-3xl font-black text-white">{readinessPct}%</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400/80">Return Ready</span>
                </div>
              </div>
              <div className="min-w-0 flex-1 divide-y divide-white/[0.06]">
                {readinessScores.map((score) => (
                  <PillarRow key={score.id} score={score} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className={`${GLASS} flex flex-1 flex-col p-5 sm:p-6`}>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald-400" />
                <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-100/45">AI Financial Insight</h2>
              </div>
              <p className="mt-4 flex-1 text-base font-semibold leading-relaxed text-white/85">
                {primaryInsight?.body ?? snapshot.aiHeadline}
              </p>
              <Link
                href="/fire-ai"
                className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-xs font-black text-white transition hover:border-emerald-400/30"
              >
                View Detailed Analysis
                <ChevronRight size={14} />
              </Link>
            </div>

            <Link
              href="/fire-ai"
              className="group relative overflow-hidden rounded-[1.35rem] border border-emerald-500/35 bg-gradient-to-br from-emerald-600/30 via-emerald-500/15 to-transparent p-5 transition hover:border-emerald-400/50 sm:rounded-[1.5rem] sm:p-6"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30">
                  <Brain size={22} />
                </span>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Can I Return to Nepal Today?</h3>
                  <p className="mt-1 text-sm font-semibold text-emerald-100/60">
                    Let AI analyze your complete financial picture and tell you.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Roadmap + Checklist */}
        <div className="mb-5 grid gap-4 lg:grid-cols-2 lg:gap-5">
          <div className={`${GLASS} p-5 sm:p-6`}>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-100/45">Your Road to Nepal</h2>
            <div className="mt-5 space-y-0">
              {roadmap.map((milestone, index) => (
                <div key={`${milestone.year}-${milestone.label}`} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full ring-2 ${
                        milestone.status === "completed"
                          ? "bg-emerald-500/20 ring-emerald-400 text-emerald-300"
                          : milestone.status === "in_progress"
                            ? "bg-amber-500/15 ring-amber-400/60 text-amber-300"
                            : "bg-white/5 ring-white/20 text-white/40"
                      }`}
                    >
                      {milestone.status === "completed" ? <Check size={14} strokeWidth={3} /> : <RoadmapIcon icon={milestone.icon} />}
                    </span>
                    {index < roadmap.length - 1 ? <span className="my-1 w-px flex-1 bg-gradient-to-b from-emerald-500/40 to-white/10 min-h-[28px]" /> : null}
                  </div>
                  <div className="pb-5">
                    <p className="text-xs font-black text-emerald-400/80">{milestone.year}</p>
                    <p className="text-sm font-bold text-white">{milestone.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${GLASS} p-5 sm:p-6`}>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-100/45">Return Checklist</h2>
            <ul className="mt-4 space-y-3">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{item.label}</p>
                    <p className="text-[11px] font-semibold text-white/40">{item.detail}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* What-if scenarios */}
        <section className={`${GLASS} p-5 sm:p-6`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-100/45">What If Scenarios</h2>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-black text-white/80"
            >
              <Scale size={14} />
              Compare Scenarios
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.year}
                className={`rounded-2xl border p-4 ${
                  scenario.recommended
                    ? "border-emerald-500/40 bg-emerald-500/[0.08] ring-1 ring-emerald-400/20"
                    : "border-white/[0.08] bg-black/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-white">{scenario.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ring-1 ${riskColors[scenario.risk]}`}>
                    {scenario.recommended ? "Recommended" : scenario.riskLabel}
                  </span>
                </div>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="font-semibold text-white/45">Readiness</dt>
                    <dd className="font-black text-emerald-300">{scenario.readinessPct}%</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-white/45">Monthly Gap</dt>
                    <dd className="font-black text-white">{formatNprInteger(scenario.monthlyGapNpr)}</dd>
                  </div>
                  {scenario.requiredSavingsNpr > 0 ? (
                    <div className="flex justify-between">
                      <dt className="font-semibold text-white/45">Required Corpus</dt>
                      <dd className="font-black text-white/80">{formatNprInteger(scenario.requiredSavingsNpr)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources footer */}
        <footer className="mt-6 flex flex-wrap items-center justify-center gap-2 pb-4 text-center">
          <p className="text-[11px] font-semibold text-white/35">
            Auto-calculated from {live.dataSources.length > 0 ? live.dataSources.join(" · ") : "your FIRE Nepal workspace"}
          </p>
          <span className="text-white/20">·</span>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: "/cashflow-dashboard", label: "Income", icon: Wallet },
              { href: "/cost-of-living", label: "COL", icon: Home },
              { href: "/portfolio", label: "Portfolio", icon: TrendingUp },
              { href: "/savings-tracker", label: "Savings", icon: Shield },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-emerald-200/70 transition hover:border-emerald-400/25"
              >
                <Icon size={11} />
                {label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
