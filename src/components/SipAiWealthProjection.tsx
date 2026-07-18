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
  FileDown,
  Flame,
  Gauge,
  Landmark,
  Lightbulb,
  LineChart,
  MessageSquareText,
  PiggyBank,
  Route,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
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
import {
  buildSipWealthProjectionAnalysis,
  formatSipCurrency,
  type SipInputs,
  type SipProjectionResult,
  type SipRiskLevel,
  type SipTone,
} from "@/lib/sip-calculator";
import { downloadSipWealthReportPdf } from "@/lib/sip-report";

type AccentKey = "emerald" | "amber" | "red" | "sky";

const ACCENT: Record<
  AccentKey,
  { soft: string; grad: string; ring: string; chipText: string; dot: string }
> = {
  emerald: {
    soft: "border-emerald-300/90 bg-emerald-50/95 text-emerald-950",
    grad: "from-emerald-800 to-emerald-600",
    ring: "#047857",
    chipText: "text-emerald-800",
    dot: "text-emerald-800",
  },
  amber: {
    soft: "border-amber-300/90 bg-amber-50/95 text-amber-950",
    grad: "from-amber-600 to-amber-500",
    ring: "#d97706",
    chipText: "text-amber-800",
    dot: "text-amber-700",
  },
  red: {
    soft: "border-red-300/90 bg-red-50/95 text-red-950",
    grad: "from-red-700 to-rose-600",
    ring: "#dc2626",
    chipText: "text-red-800",
    dot: "text-red-700",
  },
  sky: {
    soft: "border-sky-300/90 bg-sky-50/95 text-sky-950",
    grad: "from-sky-700 to-cyan-500",
    ring: "#0284c7",
    chipText: "text-sky-800",
    dot: "text-sky-700",
  },
};

const TONE_ACCENT: Record<SipTone, AccentKey> = {
  positive: "emerald",
  warning: "amber",
  info: "sky",
};

const TONE_ICON: Record<SipTone, LucideIcon> = {
  positive: BadgeCheck,
  warning: AlertTriangle,
  info: Lightbulb,
};

const RISK_ACCENT: Record<SipRiskLevel, AccentKey> = {
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
          <span className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-gray-500">
            चरण {step}
          </span>
          <span className="block text-[0.95rem] font-black leading-tight text-emerald-900 sm:text-base">
            {title}
          </span>
          <Ne className="block text-[0.72rem] font-semibold leading-snug text-gray-500">{nepaliLabel}</Ne>
        </span>
        {chip ? <span className="hidden shrink-0 sm:block">{chip}</span> : null}
        <ChevronDown
          size={20}
          className={`shrink-0 text-emerald-800 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
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
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.72rem] font-black ${a.soft}`}>
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
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-white/90 px-4 py-3">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={18} className="shrink-0 text-emerald-800" />
        <span className="min-w-0">
          <span className="block text-[0.8rem] font-bold leading-tight text-gray-700">{label}</span>
          <Ne className="block text-[0.68rem] font-semibold leading-tight text-gray-500">{nepaliLabel}</Ne>
        </span>
      </span>
      <span className="shrink-0 text-right text-sm font-black text-emerald-900">{value}</span>
    </div>
  );
}

function Paragraph({ children }: Readonly<{ children: ReactNode }>) {
  return <Ne className="block text-[0.9rem] font-semibold leading-relaxed text-gray-700">{children}</Ne>;
}

function compactNumber(value: number) {
  if (value >= 10_000_000) return `${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return Math.round(value).toLocaleString("en-US");
}

export function SipAiWealthProjection({
  result,
  inputs,
}: Readonly<{
  result: SipProjectionResult;
  inputs: SipInputs;
}>) {
  const analysis = useMemo(() => buildSipWealthProjectionAnalysis(result, inputs), [result, inputs]);
  const fmt = (n: number) => formatSipCurrency(n, analysis.currency);

  const scoreAccent: AccentKey =
    analysis.score.band === "excellent" || analysis.score.band === "good"
      ? "emerald"
      : analysis.score.band === "moderate"
        ? "amber"
        : "red";
  const goalAccent: AccentKey =
    analysis.goal.band === "excellent" || analysis.goal.band === "onTrack"
      ? "emerald"
      : analysis.goal.band === "needsImprovement"
        ? "amber"
        : "red";
  const inflationAccent: AccentKey = analysis.inflation.beatsInflation ? "emerald" : "amber";

  const journeyMax = Math.max(1, ...analysis.journey.map((n) => n.value));

  const handlePdf = async () => {
    await downloadSipWealthReportPdf(analysis, result);
  };

  return (
    <section className="animate-fade-in mt-8" aria-label="AI Wealth Projection">
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
            <button
              type="button"
              onClick={handlePdf}
              className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-black text-emerald-50 transition hover:bg-white/15"
            >
              <FileDown size={14} /> PDF Report
            </button>
          </div>
          <div className="mt-5 flex items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-emerald-400/30 to-lime-300/20 text-emerald-50 ring-1 ring-white/20 backdrop-blur">
              <Brain size={34} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-black leading-[1.1] tracking-[-0.03em] sm:text-3xl">
                📈 AI Wealth Projection
              </h2>
              <Ne className="mt-1.5 block text-lg font-semibold leading-snug text-emerald-50/80 sm:text-xl">
                नेपालीमा विस्तृत विश्लेषण
              </Ne>
            </div>
          </div>
          <Ne className="mt-4 block max-w-2xl text-[0.95rem] font-semibold leading-relaxed text-emerald-50/85">
            यो तपाईंको व्यक्तिगत AI सम्पत्ति सल्लाहकार हो। माथिको SIP विवरणअनुसार तपाईंको दीर्घकालीन सम्पत्ति योजना
            सरल नेपालीमा बुझाउँछ — र इनपुट परिवर्तन गर्ने बित्तिकै आफैँ अपडेट हुन्छ।
          </Ne>
        </div>
      </div>

      {!analysis.hasData ? (
        <div className="glass-card mt-5 flex items-center gap-4 rounded-[1.5rem] p-6">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-600 text-white">
            <ClipboardList size={24} />
          </span>
          <div>
            <p className="text-base font-black text-emerald-900">Enter your SIP plan to unlock the analysis</p>
            <Ne className="mt-1 block text-[0.88rem] font-semibold leading-relaxed text-gray-700">
              माथि मासिक लगानी र अवधि हाल्नुहोस् — AI ले तुरुन्तै विस्तृत सम्पत्ति विश्लेषण तयार गर्नेछ।
            </Ne>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3">
            <AnalysisCard
              step={1}
              icon={ClipboardList}
              accent="emerald"
              title="Your SIP Plan"
              nepaliLabel="तपाईंको SIP योजना"
              defaultOpen
              chip={
                <Chip accent="emerald">
                  <Target size={13} /> {analysis.plan.years} yr plan
                </Chip>
              }
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                <InfoRow
                  icon={Wallet}
                  label="Monthly investment"
                  nepaliLabel="मासिक लगानी"
                  value={fmt(analysis.plan.monthlyInvestment)}
                />
                <InfoRow
                  icon={Route}
                  label="Investment period"
                  nepaliLabel="लगानी अवधि"
                  value={`${analysis.plan.years} years`}
                />
                <InfoRow
                  icon={TrendingUp}
                  label="Expected annual return"
                  nepaliLabel="अपेक्षित वार्षिक प्रतिफल"
                  value={`${analysis.plan.annualReturnPct}%`}
                />
                <InfoRow
                  icon={Flame}
                  label="Inflation"
                  nepaliLabel="मुद्रास्फीति"
                  value={`${analysis.plan.inflationPct}%`}
                />
                <InfoRow
                  icon={PiggyBank}
                  label="Total invested"
                  nepaliLabel="कुल लगानी"
                  value={fmt(analysis.plan.totalInvested)}
                />
                <InfoRow
                  icon={Landmark}
                  label="Future value"
                  nepaliLabel="भविष्य मूल्य"
                  value={fmt(analysis.plan.futureValue)}
                />
              </div>
              <div className="mt-4">
                <Paragraph>{analysis.plan.summaryNe}</Paragraph>
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={2}
              icon={Gauge}
              accent={scoreAccent}
              title="Wealth Projection Score"
              nepaliLabel="सम्पत्ति प्रक्षेपण स्कोर"
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
                      <p className="mt-0.5 text-[0.6rem] font-black uppercase tracking-wide text-gray-500">
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
                <div className="rounded-2xl border border-emerald-300/90 bg-emerald-50/90 p-4">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-emerald-800">
                    Strengths · बलियो पक्ष
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.score.strengthsNe.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <BadgeCheck size={15} className="mt-0.5 shrink-0 text-emerald-800" />
                        <Ne className="text-[0.82rem] font-semibold leading-snug text-gray-700">{s}</Ne>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-amber-300/90 bg-amber-50/90 p-4">
                  <p className="text-[0.68rem] font-black uppercase tracking-wide text-amber-800">
                    Weaknesses · कमजोरी
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {analysis.score.weaknessesNe.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-700" />
                        <Ne className="text-[0.82rem] font-semibold leading-snug text-gray-700">{s}</Ne>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={3}
              icon={TrendingUp}
              accent="emerald"
              title="Future Wealth Projection"
              nepaliLabel="भविष्यको सम्पत्ति प्रक्षेपण"
              chip={
                <Chip accent="emerald">
                  <Sparkles size={13} /> {analysis.futureWealth.growthMultiple.toFixed(1)}x
                </Chip>
              }
            >
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Future Value", ne: "भविष्य मूल्य", value: fmt(analysis.futureWealth.futureValue) },
                  { label: "Total Invested", ne: "कुल लगानी", value: fmt(analysis.futureWealth.totalInvested) },
                  {
                    label: "Estimated Profit",
                    ne: "अनुमानित नाफा",
                    value: fmt(analysis.futureWealth.estimatedProfit),
                  },
                  { label: "CAGR", ne: "वृद्धि दर", value: `${analysis.futureWealth.cagrPct.toFixed(1)}%` },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-emerald-200/90 bg-white/90 p-4 text-center"
                  >
                    <p className="text-[0.68rem] font-black uppercase tracking-wide text-gray-500">{card.label}</p>
                    <Ne className="block text-[0.62rem] font-semibold text-gray-500">{card.ne}</Ne>
                    <p className="mt-1 text-lg font-black text-emerald-900 sm:text-xl">{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Paragraph>{analysis.futureWealth.explanationNe}</Paragraph>
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={4}
              icon={Sparkles}
              accent="emerald"
              title="Compound Interest Story"
              nepaliLabel="चक्रवृद्धि ब्याजको कथा"
              chip={
                <Chip accent="emerald">
                  <Sparkles size={13} /> Compound
                </Chip>
              }
            >
              <ul className="grid gap-2.5">
                {analysis.compoundStoryNe.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/80 px-4 py-3"
                  >
                    <Sparkles size={16} className="mt-0.5 shrink-0 text-emerald-800" />
                    <Ne className="text-[0.86rem] font-semibold leading-relaxed text-gray-700">{line}</Ne>
                  </li>
                ))}
              </ul>
            </AnalysisCard>

            <AnalysisCard
              step={5}
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
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3"
                  >
                    <Flame size={16} className="mt-0.5 shrink-0 text-amber-700" />
                    <Ne className="text-[0.86rem] font-semibold leading-relaxed text-gray-700">{line}</Ne>
                  </li>
                ))}
              </ul>
            </AnalysisCard>

            <AnalysisCard
              step={6}
              icon={Target}
              accent={goalAccent}
              title="Goal Achievement Probability"
              nepaliLabel="लक्ष्य प्राप्तिको सम्भावना"
              chip={
                <Chip accent={goalAccent}>
                  {analysis.goal.emoji} {analysis.goal.labelEn}
                </Chip>
              }
            >
              <div className={`flex items-center gap-3 rounded-2xl border p-4 ${ACCENT[goalAccent].soft}`}>
                <span className="text-2xl">{analysis.goal.emoji}</span>
                <div>
                  <p className="text-lg font-black">{analysis.goal.labelEn}</p>
                  <Ne className="block text-sm font-semibold">{analysis.goal.labelNe}</Ne>
                </div>
                <p className={`ml-auto text-3xl font-black ${ACCENT[goalAccent].chipText}`}>
                  {analysis.goal.probabilityPct}%
                </p>
              </div>
              <div className="mt-3">
                <Paragraph>{analysis.goal.whyNe}</Paragraph>
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={7}
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
                        <span className="text-sm font-black text-emerald-900">{risk.labelEn}</span>
                        <Ne className="text-xs font-semibold text-gray-500">({risk.labelNe})</Ne>
                        <span className={`ml-auto text-xs font-black ${ACCENT[accent].chipText}`}>
                          {risk.level === "low" ? "Low" : risk.level === "moderate" ? "Moderate" : "High"}
                        </span>
                      </div>
                      <Ne className="mt-2 block text-[0.84rem] font-semibold leading-relaxed text-gray-700">
                        {risk.explanationNe}
                      </Ne>
                    </div>
                  );
                })}
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={8}
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
                        <Ne className="mt-0.5 block text-[0.82rem] font-semibold leading-relaxed text-gray-700">
                          {rec.detailNe}
                        </Ne>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={9}
              icon={Route}
              accent="sky"
              title="Wealth Journey Timeline"
              nepaliLabel="सम्पत्तिको यात्रा"
              defaultOpen
              chip={
                <Chip accent="sky">
                  <Route size={13} /> Age path
                </Chip>
              }
            >
              <div className="mt-1">
                {analysis.journey.map((node, i) => {
                  const widthPct = Math.max(6, Math.round((node.value / journeyMax) * 100));
                  const grad =
                    node.kind === "start"
                      ? "from-emerald-800 to-emerald-600"
                      : node.kind === "freedom"
                        ? "from-amber-500 to-yellow-400"
                        : node.kind === "horizon"
                          ? "from-emerald-700 to-lime-500"
                          : "from-sky-700 to-cyan-500";
                  return (
                    <div key={`${node.age}-${node.labelEn}`}>
                      <div className="flex items-center gap-4">
                        <span
                          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${grad} text-sm font-black text-white shadow-md`}
                        >
                          {node.age}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <div className="min-w-0">
                              <p className="text-[0.9rem] font-black leading-tight text-emerald-900">
                                Age {node.age} · {node.labelEn}
                              </p>
                              <Ne className="block text-[0.7rem] font-semibold leading-tight text-gray-500">
                                {node.labelNe}
                              </Ne>
                            </div>
                            <p className="text-base font-black text-emerald-800">{fmt(node.value)}</p>
                          </div>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${grad} transition-all duration-700`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {i < analysis.journey.length - 1 ? (
                        <div className="my-1 ml-6 flex h-7 items-center">
                          <ArrowDown size={18} className="text-emerald-300" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={10}
              icon={Landmark}
              accent="emerald"
              title="Remaining Wealth"
              nepaliLabel="बाँकी / अन्तिम सम्पत्ति"
              chip={
                <Chip accent="emerald">
                  <PiggyBank size={13} /> Legacy
                </Chip>
              }
            >
              <div className="rounded-2xl border border-emerald-200/90 bg-white/90 p-5 text-center">
                <p className="text-[0.68rem] font-black uppercase tracking-wide text-gray-500">
                  Expected Final Wealth
                </p>
                <p className="mt-1 text-3xl font-black text-emerald-900">{fmt(analysis.remaining.finalWealth)}</p>
              </div>
              <Ne className="mt-3 block text-[0.95rem] font-black leading-snug text-emerald-900">
                {analysis.remaining.headlineNe}
              </Ne>
              <ul className="mt-3 grid gap-2">
                {analysis.remaining.bulletsNe.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-xl border border-emerald-200/90 bg-white/90 px-3 py-2.5"
                  >
                    <PiggyBank size={15} className="mt-0.5 shrink-0 text-emerald-800" />
                    <Ne className="text-[0.82rem] font-semibold leading-snug text-gray-700">{line}</Ne>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Paragraph>{analysis.remaining.meaningNe}</Paragraph>
              </div>
            </AnalysisCard>

            <AnalysisCard
              step={11}
              icon={MessageSquareText}
              accent="emerald"
              title="Personalized Nepali Summary"
              nepaliLabel="व्यक्तिगत नेपाली सारांश"
              defaultOpen
              chip={
                <Chip accent="emerald">
                  <MessageSquareText size={13} /> सारांश
                </Chip>
              }
            >
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-600 p-5 text-white shadow-md shadow-emerald-950/10">
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <MessageSquareText size={22} className="relative text-emerald-100" />
                <Ne className="relative mt-2 block text-[1rem] font-semibold leading-relaxed">
                  {analysis.summaryNe}
                </Ne>
              </div>
            </AnalysisCard>
          </div>

          {/* Charts */}
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="glass-card rounded-[1.5rem] p-4 sm:p-5 lg:col-span-2">
              <div className="mb-3 flex items-center gap-2">
                <LineChart size={18} className="text-emerald-800" />
                <div>
                  <p className="text-sm font-black text-emerald-900">📈 Wealth Growth Chart</p>
                  <Ne className="block text-xs font-semibold text-gray-500">सम्पत्ति वृद्धि चार्ट</Ne>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.chartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sipAiGrowth" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#064E3B" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#064E3B" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="age"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#4B5563", fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#4B5563", fontSize: 11, fontWeight: 700 }}
                      tickFormatter={(v: number) => compactNumber(v)}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(255,255,255,0.96)",
                        border: "1px solid rgba(6,78,59,0.18)",
                        borderRadius: "16px",
                      }}
                      formatter={(value: number | string) => fmt(Number(value))}
                      labelFormatter={(label) => `Age ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="futureValue"
                      name="Future value"
                      stroke="#064E3B"
                      strokeWidth={3}
                      fill="url(#sipAiGrowth)"
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-[1.5rem] p-4 sm:p-5">
              <div className="mb-3">
                <p className="text-sm font-black text-emerald-900">📊 Invested vs Growth</p>
                <Ne className="block text-xs font-semibold text-gray-500">लगानी बनाम वृद्धि</Ne>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { label: "Invested", value: analysis.futureWealth.totalInvested },
                      { label: "Growth", value: analysis.futureWealth.estimatedProfit },
                    ]}
                  >
                    <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#4B5563", fontSize: 11, fontWeight: 700 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#4B5563", fontSize: 11, fontWeight: 700 }} tickFormatter={(v: number) => compactNumber(v)} />
                    <Tooltip
                      contentStyle={{ background: "rgba(255,255,255,0.96)", borderRadius: "16px" }}
                      formatter={(value: number | string) => fmt(Number(value))}
                    />
                    <Bar dataKey="value" fill="#059669" radius={[12, 12, 0, 0]} animationDuration={850} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-[1.5rem] p-4 sm:p-5 lg:col-span-3">
              <div className="mb-3 flex items-center gap-2">
                <Flame size={18} className="text-amber-700" />
                <div>
                  <p className="text-sm font-black text-emerald-900">📉 Inflation-adjusted Wealth</p>
                  <Ne className="block text-xs font-semibold text-gray-500">मुद्रास्फीति समायोजित सम्पत्ति</Ne>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analysis.chartSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sipAiReal" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="sipAiNom" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#d7efe4" strokeDasharray="3 3" />
                    <XAxis dataKey="age" tickLine={false} axisLine={false} tick={{ fill: "#4B5563", fontSize: 11, fontWeight: 700 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: "#4B5563", fontSize: 11, fontWeight: 700 }} tickFormatter={(v: number) => compactNumber(v)} />
                    <Tooltip
                      contentStyle={{ background: "rgba(255,255,255,0.96)", borderRadius: "16px" }}
                      formatter={(value: number | string, name: string) => [
                        fmt(Number(value)),
                        name === "inflationAdjusted" ? "Real value" : "Nominal",
                      ]}
                      labelFormatter={(label) => `Age ${label}`}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="futureValue" name="Nominal" stroke="#059669" strokeWidth={2.5} fill="url(#sipAiNom)" animationDuration={900} />
                    <Area type="monotone" dataKey="inflationAdjusted" name="Inflation adjusted" stroke="#d97706" strokeWidth={2.5} fill="url(#sipAiReal)" animationDuration={900} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Final AI Verdict */}
          <div className="dark-glass-card relative mt-5 overflow-hidden rounded-[1.8rem] p-6 text-white sm:p-8">
            <div className="absolute -right-14 -top-16 h-52 w-52 rounded-full bg-amber-300/15 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/90 to-yellow-300/90 px-3 py-1 text-[0.65rem] font-black uppercase tracking-wide text-emerald-950">
                  <Crown size={12} /> Premium Verdict
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{analysis.verdict.labelEn}</h3>
              <Ne className="mt-1 block text-base font-semibold text-emerald-50/75">{analysis.verdict.labelNe}</Ne>
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <Ne className="max-w-2xl text-[0.95rem] font-semibold leading-relaxed text-emerald-50/90">
                  {analysis.verdict.whyNe}
                </Ne>
                <div className="rounded-[1.4rem] bg-white/10 px-6 py-4 text-center ring-1 ring-white/15 backdrop-blur">
                  <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-emerald-100/70">
                    Probability of Long-term Wealth Creation
                  </p>
                  <p className="mt-1 text-5xl font-black tracking-tight text-white sm:text-6xl">
                    {analysis.verdict.probabilityPct}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
