"use client";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Brain,
  ChevronDown,
  ClipboardList,
  Crown,
  Flame,
  Gauge,
  HandCoins,
  Landmark,
  Lightbulb,
  MessageSquareText,
  PiggyBank,
  Route,
  Scale,
  ShieldAlert,
  Sparkles,
  Sprout,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useFireCalculator } from "@/components/FireCalculatorContext";
import {
  buildFireFinancialAdvisorAnalysis,
  type FireAdvisorRiskLevel,
  type FireAdvisorTone,
} from "@/lib/fire-ai-advisor";

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

const TONE_ACCENT: Record<FireAdvisorTone, AccentKey> = {
  positive: "emerald",
  warning: "amber",
  info: "sky",
};

const TONE_ICON: Record<FireAdvisorTone, LucideIcon> = {
  positive: BadgeCheck,
  warning: AlertTriangle,
  info: Lightbulb,
};

const RISK_ACCENT: Record<FireAdvisorRiskLevel, AccentKey> = {
  low: "emerald",
  moderate: "amber",
  high: "red",
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

function fmtNe(n: number): string {
  return `रु ${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
}

export function FireAiFinancialAdvisor() {
  const { result, wealthResult, projection, wealthParams, horizonGrowthPct } = useFireCalculator();

  const analysis = useMemo(
    () =>
      buildFireFinancialAdvisorAnalysis(
        result,
        wealthResult,
        projection,
        wealthParams,
        horizonGrowthPct,
      ),
    [result, wealthResult, projection, wealthParams, horizonGrowthPct],
  );

  const scoreAccent: AccentKey =
    analysis.score.band === "excellent" || analysis.score.band === "good"
      ? "emerald"
      : analysis.score.band === "moderate"
        ? "amber"
        : "red";
  const distanceAccent: AccentKey =
    analysis.distance.aheadOfPlan === true
      ? "emerald"
      : analysis.distance.aheadOfPlan === false
        ? "amber"
        : "sky";
  const passiveAccent: AccentKey = analysis.passiveIncome.sufficient ? "emerald" : "amber";
  const remainingAccent: AccentKey = analysis.remaining.likelyRemain ? "emerald" : "red";
  const inflationAccent: AccentKey = analysis.inflation.beatsInflation ? "emerald" : "amber";
  const verdictAccent: AccentKey = scoreAccent;

  return (
    <section className="animate-fade-in mt-2" aria-label="AI FIRE Financial Advisor">
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
                🧠 AI FIRE Financial Advisor
              </h2>
              <Ne className="mt-1.5 block text-lg font-semibold leading-snug text-emerald-50/80 sm:text-xl">
                नेपालीमा विस्तृत व्यक्तिगत विश्लेषण
              </Ne>
            </div>
          </div>
          <Ne className="mt-4 block max-w-2xl text-[0.95rem] font-semibold leading-relaxed text-emerald-50/85">
            यो तपाईंको व्यक्तिगत AI वित्तीय सल्लाहकार हो। माथिको ड्यासबोर्डको नतिजाअनुसार तपाईंको FIRE योजना
            सरल नेपालीमा बुझाउँछ — र इनपुट परिवर्तन गर्ने बित्तिकै आफैँ अपडेट हुन्छ।
          </Ne>
        </div>
      </div>

      {!analysis.hasData ? (
        <div className="glass-card mt-5 flex items-center gap-4 rounded-[1.5rem] p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 text-white">
            <ClipboardList size={24} />
          </span>
          <div>
            <p className="text-base font-black text-emerald-950">Enter your FIRE plan to unlock advice</p>
            <Ne className="mt-1 block text-[0.88rem] font-semibold leading-relaxed text-slate-600">
              माथि बचत, मासिक बचत र खर्च हाल्नुहोस् — AI ले तुरुन्तै विस्तृत व्यक्तिगत विश्लेषण तयार गर्नेछ।
            </Ne>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3">
            {/* 1. Your FIRE plan */}
            <AnalysisCard
              step={1}
              icon={ClipboardList}
              accent="emerald"
              title="Your FIRE Plan"
              nepaliLabel="तपाईंको FIRE योजना"
              defaultOpen
              chip={
                <Chip accent="emerald">
                  <Target size={13} /> Age {analysis.plan.targetRetirementAge}
                </Chip>
              }
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoRow
                  icon={Wallet}
                  label="Current savings"
                  nepaliLabel="हालको बचत"
                  value={fmtNe(analysis.plan.currentSavings)}
                />
                <InfoRow
                  icon={PiggyBank}
                  label="Monthly savings"
                  nepaliLabel="मासिक बचत"
                  value={fmtNe(analysis.plan.monthlySavings)}
                />
                <InfoRow
                  icon={Gauge}
                  label="Current age"
                  nepaliLabel="हालको उमेर"
                  value={`${analysis.plan.currentAge} yrs`}
                />
                <InfoRow
                  icon={Target}
                  label="Target retirement"
                  nepaliLabel="लक्षित रिटायरमेन्ट"
                  value={`~${analysis.plan.targetRetirementAge} yrs`}
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Annual return"
                  nepaliLabel="वार्षिक प्रतिफल"
                  value={`${analysis.plan.annualReturnPct}%`}
                />
                <InfoRow
                  icon={Flame}
                  label="Inflation"
                  nepaliLabel="मुद्रास्फीति"
                  value={`${analysis.plan.inflationPct}%`}
                />
                <InfoRow
                  icon={HandCoins}
                  label="Safe Withdrawal Rate"
                  nepaliLabel="सुरक्षित निकासी दर"
                  value={`${analysis.plan.safeWithdrawalRatePct}%`}
                />
              </div>
              <div className="mt-4">
                <Paragraph>{analysis.plan.summaryNe}</Paragraph>
              </div>
            </AnalysisCard>

            {/* 2. Distance to FIRE */}
            <AnalysisCard
              step={2}
              icon={Route}
              accent={distanceAccent}
              title="How Far From FIRE?"
              nepaliLabel="तपाईं FIRE लक्ष्यबाट कति टाढा हुनुहुन्छ"
              chip={
                <Chip accent={distanceAccent}>
                  {analysis.distance.yearsRemaining <= 0
                    ? "Ready"
                    : `${analysis.distance.yearsRemaining.toFixed(1)} yrs left`}
                </Chip>
              }
            >
              <div className="grid gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                    Estimated FIRE Age
                  </p>
                  <p className={`mt-1 text-2xl font-black ${ACCENT[distanceAccent].chipText}`}>
                    {analysis.distance.fireAge}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                    Years Remaining
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-700">
                    {analysis.distance.yearsRemaining <= 0
                      ? "0"
                      : analysis.distance.yearsRemaining.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                    Current Progress
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-800">{analysis.distance.progressPct}%</p>
                </div>
              </div>
              <div className="mt-4">
                <Paragraph>{analysis.distance.explanationNe}</Paragraph>
              </div>
            </AnalysisCard>

            {/* 3. FIRE Readiness Score */}
            <AnalysisCard
              step={3}
              icon={Gauge}
              accent={scoreAccent}
              title="FIRE Readiness Score"
              nepaliLabel="FIRE तयारी स्कोर"
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
                  <div className="mt-3">
                    <Paragraph>{analysis.score.whyNe}</Paragraph>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-emerald-700">
                    Strengths · बलियो पक्ष
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.score.strengthsNe.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <BadgeCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                        <Ne className="text-[0.82rem] font-semibold leading-snug text-slate-700">{s}</Ne>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-amber-700">
                    Weaknesses · कमजोरी
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.score.weaknessesNe.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                        <Ne className="text-[0.82rem] font-semibold leading-snug text-slate-700">{s}</Ne>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnalysisCard>

            {/* 4. Passive income */}
            <AnalysisCard
              step={4}
              icon={Scale}
              accent={passiveAccent}
              title="Passive Income Analysis"
              nepaliLabel="निष्क्रिय आम्दानी विश्लेषण"
              chip={
                <Chip accent={passiveAccent}>
                  {analysis.passiveIncome.sufficient ? "Sufficient" : "Gap"} ·{" "}
                  {analysis.passiveIncome.coveragePct}%
                </Chip>
              }
            >
              <div className="grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-emerald-700/80">
                    Expected Passive Income
                  </p>
                  <Ne className="block text-[0.62rem] font-semibold text-emerald-700/60">
                    अपेक्षित निष्क्रिय आम्दानी
                  </Ne>
                  <p className="mt-1 text-xl font-black text-emerald-800">
                    {fmtNe(analysis.passiveIncome.expectedMonthly)}
                    <span className="text-xs font-bold text-slate-500"> /mo</span>
                  </p>
                </div>
                <div className="grid place-items-center">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                    VS
                  </span>
                </div>
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-center">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-amber-700/80">
                    Required Retirement Expense
                  </p>
                  <Ne className="block text-[0.62rem] font-semibold text-amber-700/60">
                    आवश्यक रिटायरमेन्ट खर्च
                  </Ne>
                  <p className="mt-1 text-xl font-black text-amber-800">
                    {fmtNe(analysis.passiveIncome.requiredMonthly)}
                    <span className="text-xs font-bold text-slate-500"> /mo</span>
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Paragraph>{analysis.passiveIncome.explanationNe}</Paragraph>
              </div>
            </AnalysisCard>

            {/* 5. Wealth growth story */}
            <AnalysisCard
              step={5}
              icon={Sprout}
              accent="emerald"
              title="Wealth Growth Story"
              nepaliLabel="सम्पत्ति वृद्धिको कथा"
              chip={
                <Chip accent="emerald">
                  <Sparkles size={13} /> Compound
                </Chip>
              }
            >
              <ul className="grid gap-2.5">
                {analysis.wealthGrowth.storyNe.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-2xl border border-emerald-100/80 bg-emerald-50/50 px-4 py-3"
                  >
                    <Sprout size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                    <Ne className="text-[0.86rem] font-semibold leading-relaxed text-slate-700">{line}</Ne>
                  </li>
                ))}
              </ul>
            </AnalysisCard>

            {/* 6. Remaining wealth */}
            <AnalysisCard
              step={6}
              icon={Landmark}
              accent={remainingAccent}
              title="Remaining Wealth"
              nepaliLabel="बाँकी सम्पत्ति"
              chip={
                <Chip accent={remainingAccent}>
                  {analysis.remaining.likelyRemain ? "Likely remains" : "At risk"}
                </Chip>
              }
            >
              <div className="rounded-2xl border border-emerald-100/80 bg-white/70 p-5 text-center">
                <p className="text-[0.68rem] font-black uppercase tracking-wide text-slate-400">
                  Estimated Remaining Wealth
                </p>
                <p className={`mt-1 text-3xl font-black ${ACCENT[remainingAccent].chipText}`}>
                  {fmtNe(analysis.remaining.estimatedWealth)}
                </p>
              </div>
              <div className="mt-3">
                <Paragraph>{analysis.remaining.explanationNe}</Paragraph>
              </div>
              <ul className="mt-3 grid gap-2">
                {analysis.remaining.bulletsNe.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-emerald-100/70 bg-white/60 px-3 py-2.5"
                  >
                    <PiggyBank size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                    <Ne className="text-[0.82rem] font-semibold leading-snug text-slate-700">{line}</Ne>
                  </li>
                ))}
              </ul>
            </AnalysisCard>

            {/* 7. Inflation */}
            <AnalysisCard
              step={7}
              icon={Flame}
              accent={inflationAccent}
              title="Inflation Analysis"
              nepaliLabel="मुद्रास्फीति विश्लेषण"
              chip={
                <Chip accent={inflationAccent}>
                  Real {analysis.inflation.realReturnPct.toFixed(1)}%
                </Chip>
              }
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

            {/* 8. Risk analysis */}
            <AnalysisCard
              step={8}
              icon={ShieldAlert}
              accent="amber"
              title="Risk Analysis"
              nepaliLabel="जोखिम विश्लेषण"
              defaultOpen
              chip={
                <Chip accent="amber">
                  <Activity size={13} /> 4 factors
                </Chip>
              }
            >
              <div className="grid gap-2.5">
                {analysis.risks.map((risk) => {
                  const accent = RISK_ACCENT[risk.level];
                  return (
                    <div key={risk.id} className={`rounded-2xl border p-4 ${ACCENT[accent].soft}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xl">{risk.emoji}</span>
                        <span className="text-sm font-black text-emerald-950">{risk.labelEn}</span>
                        <Ne className="text-xs font-semibold text-slate-500">({risk.labelNe})</Ne>
                        <span className={`ml-auto text-xs font-black ${ACCENT[accent].chipText}`}>
                          {risk.emoji}{" "}
                          {risk.level === "low" ? "Low" : risk.level === "moderate" ? "Moderate" : "High"}
                        </span>
                      </div>
                      <Ne className="mt-2 block text-[0.84rem] font-semibold leading-relaxed text-slate-700">
                        {risk.explanationNe}
                      </Ne>
                    </div>
                  );
                })}
              </div>
            </AnalysisCard>

            {/* 9. Recommendations */}
            <AnalysisCard
              step={9}
              icon={Lightbulb}
              accent="emerald"
              title="FIRE Nepal AI Recommendations"
              nepaliLabel="FIRE Nepal AI सिफारिसहरू"
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

            {/* 10. FIRE journey story */}
            <AnalysisCard
              step={10}
              icon={Route}
              accent="sky"
              title="FIRE Journey Story"
              nepaliLabel="FIRE यात्रको कथा"
              defaultOpen
              chip={
                <Chip accent="sky">
                  <Sparkles size={13} /> Personal
                </Chip>
              }
            >
              <div className="relative overflow-hidden rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50/90 to-emerald-50/70 p-5">
                <Ne className="block whitespace-pre-line text-[0.95rem] font-semibold leading-relaxed text-slate-700">
                  {analysis.journeyStoryNe}
                </Ne>
              </div>
            </AnalysisCard>

            {/* 11. Simple Nepali summary */}
            <AnalysisCard
              step={11}
              icon={MessageSquareText}
              accent="emerald"
              title="Simple Nepali Summary"
              nepaliLabel="सरल नेपाली सारांश"
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

          {/* 12. Final AI Verdict — premium hero */}
          <div className="dark-glass-card relative mt-5 overflow-hidden rounded-[1.8rem] p-6 text-white sm:p-8">
            <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-amber-300/15 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/90 to-yellow-300/90 px-3 py-1 text-[0.65rem] font-black uppercase tracking-wide text-emerald-950">
                  <Crown size={12} /> Premium Verdict
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">
                🎉 FIRE Nepal AI Verdict
              </h3>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={`text-xl font-black sm:text-2xl ${
                    verdictAccent === "emerald"
                      ? "text-emerald-200"
                      : verdictAccent === "amber"
                        ? "text-amber-200"
                        : "text-rose-200"
                  }`}>
                    {analysis.verdict.labelEn}
                  </p>
                  <Ne className="mt-1 block text-base font-semibold text-emerald-50/75">
                    {analysis.verdict.labelNe}
                  </Ne>
                </div>
                <div className="rounded-[1.4rem] bg-white/10 px-6 py-4 text-center ring-1 ring-white/15 backdrop-blur">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-emerald-100/70">
                    Probability of Financial Independence
                  </p>
                  <p className="mt-1 text-5xl font-black tracking-tight text-white sm:text-6xl">
                    {analysis.verdict.probabilityPct}%
                  </p>
                </div>
              </div>
              <Ne className="mt-5 block max-w-3xl text-[0.95rem] font-semibold leading-relaxed text-emerald-50/90">
                {analysis.verdict.whyNe}
              </Ne>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
