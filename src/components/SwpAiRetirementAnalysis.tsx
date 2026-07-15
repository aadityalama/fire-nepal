"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  BadgeCheck,
  Brain,
  ChevronDown,
  ClipboardList,
  Crown,
  Flame,
  Gauge,
  HandCoins,
  HeartPulse,
  Landmark,
  Lightbulb,
  MessageSquareText,
  PiggyBank,
  Route,
  Scale,
  ShieldCheck,
  Sprout,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  buildSwpRetirementAnalysis,
  formatSwpCurrency,
  type SwpAnalysisInputs,
  type SwpSimulationResult,
  type SwpTone,
} from "@/lib/swp-calculator";

type AccentKey = "emerald" | "amber" | "red" | "sky";

const ACCENT: Record<
  AccentKey,
  { soft: string; grad: string; ring: string; chipText: string; dot: string }
> = {
  emerald: {
    soft: "border-emerald-200/80 bg-emerald-50/80 text-emerald-900",
    grad: "from-emerald-600 to-emerald-500",
    ring: "#059669",
    chipText: "text-emerald-700",
    dot: "text-emerald-600",
  },
  amber: {
    soft: "border-amber-200/80 bg-amber-50/80 text-amber-900",
    grad: "from-amber-500 to-amber-400",
    ring: "#d97706",
    chipText: "text-amber-700",
    dot: "text-amber-600",
  },
  red: {
    soft: "border-red-200/80 bg-red-50/80 text-red-900",
    grad: "from-red-600 to-rose-500",
    ring: "#dc2626",
    chipText: "text-red-700",
    dot: "text-red-600",
  },
  sky: {
    soft: "border-sky-200/80 bg-sky-50/80 text-sky-900",
    grad: "from-sky-500 to-cyan-400",
    ring: "#0284c7",
    chipText: "text-sky-700",
    dot: "text-sky-600",
  },
};

const TONE_ACCENT: Record<SwpTone, AccentKey> = {
  positive: "emerald",
  warning: "amber",
  info: "sky",
};

const TONE_ICON: Record<SwpTone, LucideIcon> = {
  positive: BadgeCheck,
  warning: AlertTriangle,
  info: Lightbulb,
};

function Ne({ children, className = "" }: Readonly<{ children: ReactNode; className?: string }>) {
  return <span className={`font-nepali ${className}`}>{children}</span>;
}

function AnalysisCard({
  step,
  icon: Icon,
  accent,
  title,
  nepaliLabel,
  chip,
  defaultOpen = false,
  children,
}: Readonly<{
  step: number;
  icon: LucideIcon;
  accent: AccentKey;
  title: string;
  nepaliLabel: string;
  chip?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}>) {
  const [open, setOpen] = useState(defaultOpen);
  const a = ACCENT[accent];
  return (
    <div className="glass-card overflow-hidden rounded-[1.5rem]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-emerald-50/40 sm:gap-4 sm:p-5"
      >
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${a.grad} text-white shadow-md shadow-emerald-950/10`}
        >
          <Icon size={24} strokeWidth={2.1} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-slate-400">
            चरण {step}
          </span>
          <span className="block text-[0.95rem] font-black leading-tight text-emerald-950 sm:text-base">
            {title}
          </span>
          <Ne className="block text-[0.72rem] font-semibold leading-snug text-slate-400">{nepaliLabel}</Ne>
        </span>
        {chip ? <span className="hidden shrink-0 sm:block">{chip}</span> : null}
        <ChevronDown
          size={20}
          className={`shrink-0 text-emerald-600 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-500 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-emerald-100/70 px-4 pb-5 pt-4 sm:px-5">
            {chip ? <div className="mb-3 sm:hidden">{chip}</div> : null}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ accent, children }: Readonly<{ accent: AccentKey; children: ReactNode }>) {
  const a = ACCENT[accent];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.72rem] font-black ${a.soft}`}
    >
      {children}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  nepaliLabel,
  value,
}: Readonly<{ icon: LucideIcon; label: string; nepaliLabel: string; value: string }>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100/80 bg-white/70 px-4 py-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={18} className="shrink-0 text-emerald-600" />
        <span className="min-w-0">
          <span className="block text-[0.8rem] font-bold leading-tight text-slate-600">{label}</span>
          <Ne className="block text-[0.68rem] font-semibold leading-tight text-slate-400">{nepaliLabel}</Ne>
        </span>
      </span>
      <span className="shrink-0 text-right text-sm font-black text-emerald-900">{value}</span>
    </div>
  );
}

function Paragraph({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Ne className="block text-[0.9rem] font-semibold leading-relaxed text-slate-700">{children}</Ne>
  );
}

export function SwpAiRetirementAnalysis({
  result,
  inputs,
}: Readonly<{
  result: SwpSimulationResult;
  inputs: SwpAnalysisInputs;
}>) {
  const analysis = useMemo(
    () => buildSwpRetirementAnalysis(result, inputs),
    [result, inputs],
  );
  const fmt = (n: number) => formatSwpCurrency(n);

  const scoreAccent: AccentKey =
    analysis.score.band === "excellent" || analysis.score.band === "good"
      ? "emerald"
      : analysis.score.band === "moderate"
        ? "amber"
        : "red";
  const withdrawalAccent: AccentKey =
    analysis.withdrawal.safety === "verySafe" || analysis.withdrawal.safety === "safe"
      ? "emerald"
      : analysis.withdrawal.safety === "moderate"
        ? "amber"
        : "red";
  const cashflowAccent: AccentKey = analysis.cashflow.growingFaster ? "emerald" : "amber";
  const riskAccent: AccentKey =
    analysis.risk.level === "low" ? "emerald" : analysis.risk.level === "medium" ? "amber" : "red";
  const survivalAccent: AccentKey = analysis.survival.survivesFullHorizon ? "emerald" : "red";

  const journey = analysis.wealthJourney;
  const journeyMax = Math.max(
    1,
    journey.initialInvestment,
    journey.totalGrowth,
    journey.totalWithdrawals,
    journey.remainingPortfolio,
  );
  const journeyNodes: {
    icon: LucideIcon;
    grad: string;
    label: string;
    nepaliLabel: string;
    value: number;
  }[] = [
    {
      icon: Wallet,
      grad: "from-emerald-700 to-emerald-600",
      label: "Initial Investment",
      nepaliLabel: "प्रारम्भिक लगानी",
      value: journey.initialInvestment,
    },
    {
      icon: Sprout,
      grad: "from-emerald-600 to-lime-500",
      label: "Total Investment Growth",
      nepaliLabel: "कुल लगानी वृद्धि",
      value: journey.totalGrowth,
    },
    {
      icon: HandCoins,
      grad: "from-amber-500 to-amber-400",
      label: "Total Withdrawals",
      nepaliLabel: "कुल निकासी",
      value: journey.totalWithdrawals,
    },
    {
      icon: Landmark,
      grad: "from-emerald-800 to-emerald-600",
      label: "Remaining Portfolio",
      nepaliLabel: "बाँकी Portfolio",
      value: journey.remainingPortfolio,
    },
  ];

  return (
    <section className="animate-fade-in mt-10">
      {/* Advisor hero */}
      <div className="dark-glass-card relative overflow-hidden rounded-[2rem] p-6 text-white sm:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400/90 to-yellow-300/90 px-3.5 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-950 shadow-md">
              <Crown size={15} strokeWidth={2.5} /> Premium
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-black text-emerald-100 ring-1 ring-white/15">
              <Activity size={14} /> Auto-updating
            </span>
          </div>
          <div className="mt-5 flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400/30 to-lime-300/20 text-emerald-50 ring-1 ring-white/20 backdrop-blur">
              <Brain size={34} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-black leading-[1.1] tracking-[-0.03em] sm:text-3xl">
                🧠 AI Retirement Analysis
              </h2>
              <Ne className="mt-1.5 block text-lg font-semibold leading-snug text-emerald-50/80 sm:text-xl">
                नेपालीमा विस्तृत विश्लेषण
              </Ne>
            </div>
          </div>
          <Ne className="mt-4 block max-w-2xl text-[0.95rem] font-semibold leading-relaxed text-emerald-50/85">
            यो तपाईंको व्यक्तिगत AI वित्तीय सल्लाहकार हो। तपाईंले हालेको विवरण अनुसार तपाईंको Retirement योजना
            कति सुरक्षित छ भन्ने सरल नेपालीमा बुझाउँछ — र विवरण परिवर्तन गर्ने बित्तिकै आफैँ अपडेट हुन्छ।
          </Ne>
        </div>
      </div>

      {!analysis.hasData ? (
        <div className="glass-card mt-5 flex items-center gap-4 rounded-[1.5rem] p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white">
            <ClipboardList size={24} />
          </span>
          <div>
            <p className="text-base font-black text-emerald-950">Enter your plan to unlock the analysis</p>
            <Ne className="mt-1 block text-[0.88rem] font-semibold leading-relaxed text-slate-600">
              माथि प्रारम्भिक लगानी र मासिक निकासी हाल्नुहोस् — AI ले तुरुन्तै तपाईंको विस्तृत विश्लेषण
              तयार गर्नेछ।
            </Ne>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3">
            {/* 1. Your plan */}
            <AnalysisCard
              step={1}
              icon={ClipboardList}
              accent="emerald"
              title="Your Plan"
              nepaliLabel="तपाईंको योजना"
              defaultOpen
              chip={
                <Chip accent="emerald">
                  <Gauge size={13} /> {analysis.plan.horizonYears} yr plan
                </Chip>
              }
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoRow
                  icon={Wallet}
                  label="Initial Investment"
                  nepaliLabel="प्रारम्भिक लगानी"
                  value={fmt(analysis.plan.initial)}
                />
                <InfoRow
                  icon={HandCoins}
                  label="Monthly Withdrawal"
                  nepaliLabel="मासिक निकासी"
                  value={fmt(analysis.plan.monthly)}
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Expected Annual Return"
                  nepaliLabel="अपेक्षित वार्षिक प्रतिफल"
                  value={`${analysis.plan.annualReturnPct}%`}
                />
                <InfoRow
                  icon={Flame}
                  label="Inflation"
                  nepaliLabel="मुद्रास्फीति"
                  value={`${analysis.plan.annualInflationPct}%`}
                />
                <InfoRow
                  icon={Route}
                  label="Investment Horizon"
                  nepaliLabel="लगानी अवधि"
                  value={`${analysis.plan.horizonYears} years`}
                />
              </div>
              <div className="mt-4">
                <Paragraph>{analysis.plan.summaryNe}</Paragraph>
              </div>
            </AnalysisCard>

            {/* 2. Sustainability score */}
            <AnalysisCard
              step={2}
              icon={Gauge}
              accent={scoreAccent}
              title="How Safe Is Your Plan?"
              nepaliLabel="योजना कति सुरक्षित छ?"
              chip={
                <Chip accent={scoreAccent}>
                  {analysis.score.value} · {analysis.score.labelEn}
                </Chip>
              }
            >
              <div className="flex flex-col items-center gap-5 sm:flex-row">
                <div
                  className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(${ACCENT[scoreAccent].ring} ${Math.min(
                      360,
                      analysis.score.value * 3.6,
                    )}deg, #e2f5eb 0deg)`,
                  }}
                >
                  <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center shadow-inner">
                    <div>
                      <p className={`text-3xl font-black leading-none ${ACCENT[scoreAccent].chipText}`}>
                        {analysis.score.value}
                      </p>
                      <p className="mt-0.5 text-[0.6rem] font-black uppercase tracking-wide text-slate-400">
                        / 100
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-lg font-black ${ACCENT[scoreAccent].chipText}`}>
                      {analysis.score.labelEn}
                    </span>
                    <Ne className={`text-sm font-black ${ACCENT[scoreAccent].chipText}`}>
                      ({analysis.score.labelNe})
                    </Ne>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[0.68rem] font-bold text-slate-500">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5">90–100 Excellent</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5">70–89 Good</span>
                    <span className="rounded-md bg-amber-50 px-2 py-0.5">50–69 Moderate</span>
                    <span className="rounded-md bg-red-50 px-2 py-0.5">&lt;50 Risky</span>
                  </div>
                  <div className="mt-3">
                    <Paragraph>{analysis.score.explanationNe}</Paragraph>
                  </div>
                </div>
              </div>
            </AnalysisCard>

            {/* 3. Withdrawal safety */}
            <AnalysisCard
              step={3}
              icon={ShieldCheck}
              accent={withdrawalAccent}
              title="Withdrawal Safety Analysis"
              nepaliLabel="निकासी सुरक्षा विश्लेषण"
              chip={<Chip accent={withdrawalAccent}>{analysis.withdrawal.ratePct.toFixed(2)}%</Chip>}
            >
              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                    Initial Withdrawal Rate
                  </p>
                  <p className={`mt-1 text-2xl font-black ${ACCENT[withdrawalAccent].chipText}`}>
                    {analysis.withdrawal.ratePct.toFixed(2)}%
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">4% Rule</p>
                  <p className="mt-1 text-2xl font-black text-slate-700">4.00%</p>
                </div>
                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">Verdict</p>
                  <Ne className={`mt-1 block text-lg font-black ${ACCENT[withdrawalAccent].chipText}`}>
                    {analysis.withdrawal.labelNe}
                  </Ne>
                </div>
              </div>
              <p className="mt-3 text-[0.8rem] font-bold text-slate-500">
                4% नियम अनुसार सुरक्षित मासिक निकासी: {" "}
                <span className="font-black text-emerald-800">
                  {fmt(analysis.withdrawal.recommendedMonthlyAt4Pct)}
                </span>
              </p>
              <div className="mt-3">
                <Paragraph>{analysis.withdrawal.explanationNe}</Paragraph>
              </div>
            </AnalysisCard>

            {/* 4. Monthly income vs withdrawal */}
            <AnalysisCard
              step={4}
              icon={Scale}
              accent={cashflowAccent}
              title="Monthly Income vs Withdrawal"
              nepaliLabel="मासिक प्रतिफल र निकासी"
              chip={
                <Chip accent={cashflowAccent}>
                  {analysis.cashflow.growingFaster ? (
                    <>
                      <TrendingUp size={13} /> Growing
                    </>
                  ) : (
                    <>
                      <TrendingDown size={13} /> Draining
                    </>
                  )}
                </Chip>
              }
            >
              <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-emerald-700/80">
                    Est. Monthly Return
                  </p>
                  <Ne className="block text-[0.62rem] font-semibold text-emerald-700/60">अनुमानित मासिक प्रतिफल</Ne>
                  <p className="mt-1 text-xl font-black text-emerald-800">{fmt(analysis.cashflow.monthlyReturn)}</p>
                </div>
                <div className="grid place-items-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">VS</span>
                </div>
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-amber-700/80">
                    Monthly Withdrawal
                  </p>
                  <Ne className="block text-[0.62rem] font-semibold text-amber-700/60">मासिक निकासी</Ne>
                  <p className="mt-1 text-xl font-black text-amber-800">{fmt(analysis.cashflow.monthlyWithdrawal)}</p>
                </div>
              </div>
              <div className="mt-3">
                <Paragraph>{analysis.cashflow.explanationNe}</Paragraph>
              </div>
            </AnalysisCard>

            {/* 5. Inflation impact */}
            <AnalysisCard
              step={5}
              icon={Flame}
              accent="amber"
              title="Inflation Impact"
              nepaliLabel="मुद्रास्फीतिको प्रभाव"
              chip={<Chip accent="amber">{analysis.plan.annualInflationPct}% / yr</Chip>}
            >
              <ul className="grid gap-2.5">
                {analysis.inflation.explanationNe.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-100/80 bg-amber-50/50 px-4 py-3"
                  >
                    <Flame size={16} className="mt-0.5 shrink-0 text-amber-500" />
                    <Ne className="text-[0.86rem] font-semibold leading-relaxed text-slate-700">{line}</Ne>
                  </li>
                ))}
              </ul>
            </AnalysisCard>

            {/* 6. Investment survival */}
            <AnalysisCard
              step={6}
              icon={HeartPulse}
              accent={survivalAccent}
              title="Investment Survival"
              nepaliLabel="लगानीको आयु"
              chip={
                <Chip accent={survivalAccent}>
                  {analysis.survival.survivesFullHorizon
                    ? `${analysis.survival.horizonYears}+ yrs`
                    : `~${Math.floor(analysis.survival.survivalYears)} yrs`}
                </Chip>
              }
            >
              <div
                className={`flex items-center gap-3 rounded-2xl border p-4 ${ACCENT[survivalAccent].soft}`}
              >
                <HeartPulse size={26} className={`shrink-0 ${ACCENT[survivalAccent].dot}`} />
                <Ne className="text-[0.95rem] font-black leading-snug">{analysis.survival.statusNe}</Ne>
              </div>
              <p className="mt-3 text-[0.85rem] font-bold text-slate-500">
                Model horizon: <span className="font-black text-emerald-800">{analysis.survival.horizonYears} years</span>
                {" · "}
                Survival: <span className="font-black text-emerald-800">{analysis.survival.survivalYearsDisplay}</span>
              </p>
            </AnalysisCard>

            {/* 7. Risk analysis */}
            <AnalysisCard
              step={7}
              icon={Activity}
              accent={riskAccent}
              title="Risk Analysis"
              nepaliLabel="जोखिम विश्लेषण"
              chip={
                <Chip accent={riskAccent}>
                  {analysis.risk.emoji} {analysis.risk.labelNe}
                </Chip>
              }
            >
              <div className={`flex items-center gap-3 rounded-2xl border p-4 ${ACCENT[riskAccent].soft}`}>
                <span className="text-2xl">{analysis.risk.emoji}</span>
                <Ne className="text-lg font-black">{analysis.risk.labelNe}</Ne>
              </div>
              <div className="mt-3">
                <Paragraph>{analysis.risk.explanationNe}</Paragraph>
              </div>
            </AnalysisCard>

            {/* 8. AI recommendation */}
            <AnalysisCard
              step={8}
              icon={Lightbulb}
              accent="emerald"
              title="FIRE Nepal AI Recommendation"
              nepaliLabel="FIRE Nepal AI सिफारिस"
              defaultOpen
              chip={
                <Chip accent="emerald">
                  <Lightbulb size={13} /> {analysis.recommendations.length} tips
                </Chip>
              }
            >
              <div className="grid gap-2.5">
                {analysis.recommendations.map((rec, i) => {
                  const accent = TONE_ACCENT[rec.tone];
                  const Icon = TONE_ICON[rec.tone];
                  return (
                    <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${ACCENT[accent].soft}`}>
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${ACCENT[accent].grad} text-white shadow-sm`}
                      >
                        <Icon size={17} strokeWidth={2.3} />
                      </span>
                      <div className="min-w-0">
                        <Ne className="block text-[0.92rem] font-black leading-snug">{rec.titleNe}</Ne>
                        <Ne className="mt-0.5 block text-[0.82rem] font-semibold leading-relaxed text-slate-600">
                          {rec.detailNe}
                        </Ne>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnalysisCard>

            {/* 9. Simple summary */}
            <AnalysisCard
              step={9}
              icon={MessageSquareText}
              accent="emerald"
              title="Simple Summary"
              nepaliLabel="सरल सारांश"
              defaultOpen
              chip={
                <Chip accent="emerald">
                  <MessageSquareText size={13} /> सारांश
                </Chip>
              }
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 p-5 text-white shadow-md shadow-emerald-950/10">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <MessageSquareText size={22} className="relative text-emerald-100" />
                <Ne className="relative mt-2 block text-[1rem] font-semibold leading-relaxed">
                  {analysis.summaryNe}
                </Ne>
              </div>
            </AnalysisCard>
          </div>

          {/* 10. Remaining portfolio after horizon (premium feature) */}
          <div className="dark-glass-card relative mt-5 overflow-hidden rounded-[1.8rem] p-6 text-white sm:p-8">
            <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-amber-300/15 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/90 to-yellow-300/80 text-emerald-950 shadow-md">
                  <PiggyBank size={26} strokeWidth={2.1} />
                </span>
                <div>
                  <h3 className="text-lg font-black leading-tight sm:text-xl">Remaining Portfolio</h3>
                  <Ne className="block text-sm font-semibold text-emerald-50/70">
                    लगानी अवधि पछि बाँकी सम्पत्ति
                  </Ne>
                </div>
                <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/90 to-yellow-300/90 px-3 py-1 text-[0.65rem] font-black uppercase tracking-wide text-emerald-950 sm:inline-flex">
                  <Crown size={12} /> Premium
                </span>
              </div>

              <div className="mt-5 rounded-[1.4rem] bg-white/10 p-5 text-center ring-1 ring-white/15 backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/70">
                  💰 Estimated Remaining Wealth
                </p>
                <p className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {fmt(analysis.remaining.value)}
                </p>
              </div>

              <Ne className="mt-5 block text-[0.95rem] font-semibold leading-relaxed text-emerald-50/90">
                {analysis.remaining.headlineNe}
              </Ne>
              <Ne className="mt-2 block text-[0.88rem] font-semibold leading-relaxed text-emerald-50/70">
                {analysis.remaining.meaningNe}
              </Ne>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {analysis.remaining.bulletsNe.map((line, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10"
                  >
                    <BadgeCheck size={17} className="mt-0.5 shrink-0 text-emerald-300" />
                    <Ne className="text-[0.85rem] font-semibold leading-relaxed text-emerald-50/90">{line}</Ne>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 11. Wealth journey timeline (premium feature) */}
          <div className="glass-card mt-5 rounded-[1.8rem] p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white shadow-md">
                <Route size={26} strokeWidth={2.1} />
              </span>
              <div>
                <h3 className="text-lg font-black leading-tight text-emerald-950 sm:text-xl">Wealth Journey</h3>
                <Ne className="block text-sm font-semibold text-slate-400">सम्पत्तिको यात्रा</Ne>
              </div>
            </div>

            <div className="mt-6">
              {journeyNodes.map((node, i) => {
                const Icon = node.icon;
                const widthPct = Math.max(6, Math.round((node.value / journeyMax) * 100));
                return (
                  <div key={node.label}>
                    <div className="flex items-center gap-4">
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${node.grad} text-white shadow-md shadow-emerald-950/10`}
                      >
                        <Icon size={22} strokeWidth={2.1} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <div className="min-w-0">
                            <p className="text-[0.9rem] font-black leading-tight text-emerald-950">{node.label}</p>
                            <Ne className="block text-[0.7rem] font-semibold leading-tight text-slate-400">
                              {node.nepaliLabel}
                            </Ne>
                          </div>
                          <p className="text-base font-black text-emerald-800">{fmt(node.value)}</p>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-50">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${node.grad} transition-all duration-700`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    {i < journeyNodes.length - 1 ? (
                      <div className="my-1 ml-6 flex h-7 items-center">
                        <ArrowDown size={18} className="text-emerald-300" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <p className="mt-5 rounded-2xl bg-emerald-50/70 px-4 py-3 text-center text-[0.8rem] font-bold text-emerald-800">
              प्रारम्भिक लगानी + कुल वृद्धि − कुल निकासी = बाँकी Portfolio
            </p>
          </div>
        </>
      )}
    </section>
  );
}
