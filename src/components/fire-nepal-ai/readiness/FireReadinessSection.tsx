"use client";

import { Brain, Clock, FileDown, LineChart, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { useMemo, useRef, useCallback, type ReactNode } from "react";
import { CircularProgress } from "@/components/fire-nepal-ai/ui/CircularProgress";
import { AiProgressBar } from "@/components/fire-nepal-ai/ui/AiProgressBar";
import { useFireCalculator } from "@/components/FireCalculatorContext";
import { getRemainingWealthNpr } from "@/lib/fire-calculator-model";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

function numberSafe(n?: number | null): number {
  if (!n || Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return n;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function buildNepaliSummary({
  readinessScore,
  yearsToFire,
  swrMonthlyIncomeNpr,
}: {
  readinessScore: number;
  yearsToFire: number;
  swrMonthlyIncomeNpr: number;
}): string {
  const rounded = Math.round(readinessScore);
  const years = yearsToFire <= 0 ? "अहिले" : `${yearsToFire.toFixed(1)} वर्ष`;
  const income = new Intl.NumberFormat("ne-NP").format(Math.round(swrMonthlyIncomeNpr));
  return `तपाईंको FIRE तयारी स्कोर ${rounded}/100 छ। अनुमानित आर्थिक स्वतन्त्रता ${years} पछि सम्भव छ। सुरक्षित निकासी दर अनुसार महिनामा करिब रु ${income} निष्क्रिय आम्दानी सम्भावित छ। खर्च नियन्त्रण र बचत दर बढाउँदा लक्ष्य छिटो पुग्नेछ।`;
}

/** SWP AI Retirement Analysis surface — high-opacity glass, dark type hierarchy. */
function ReadinessCard({
  children,
  className = "",
}: Readonly<{ children: ReactNode; className?: string }>) {
  return (
    <div
      className={`rounded-2xl border border-emerald-200/90 bg-white p-4 shadow-[0_8px_32px_rgba(0,63,47,0.10)] backdrop-blur-xl sm:rounded-[1.35rem] sm:p-5 dark:border-emerald-300/40 dark:bg-white dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

export function FireReadinessSection() {
  const { result, wealthResult, wealthParams, projection, horizonGrowthPct, formatMoney } = useFireCalculator();

  const {
    readinessScore,
    yearsToFire,
    probabilityPct,
    passiveAtSWRMonthlyNpr,
    remainingWealthNpr,
    riskShortfallPct,
    riskVolatilityTag,
    recommendations,
    timelineItems,
  } = useMemo(() => {
    const req = numberSafe(result.requiredCorpusNpr);
    const proj = numberSafe(result.projectedCorpusNpr);
    const progress = req > 0 ? Math.min(1, proj / req) : 0;
    const savingsMomentum = clamp01(numberSafe(horizonGrowthPct ?? 0) / 120);
    const swrMonthly = (numberSafe(wealthParams.safeWithdrawalRatePct) / 100 / 12) * proj;
    const years = numberSafe(result.yearsToFire);
    const solvencyBonus = wealthResult.depletionAge === null ? 0.1 : 0;
    const shortfall = wealthResult.perpetualShortfall ? 0.12 : 0;

    const readiness =
      100 * clamp01(0.55 * progress + 0.25 * savingsMomentum + 0.1 * (years > 0 ? Math.max(0, 1 - years / 35) : 1) + solvencyBonus - shortfall);

    const probability = 100 * clamp01(0.6 * progress + 0.25 * (years > 0 ? Math.max(0, 1 - years / 40) : 1) + 0.15 * (solvencyBonus > 0 ? 1 : 0.6));

    const remainingWealth = getRemainingWealthNpr(wealthResult);
    const riskGap = req > 0 ? Math.max(0, 1 - proj / req) : 1;
    const riskShortfallPct = Math.round(100 * riskGap);
    const riskVolatilityTag =
      numberSafe(wealthParams.annualReturnPct) >= 14
        ? "High return assumption"
        : numberSafe(wealthParams.annualReturnPct) <= 6
          ? "Conservative return"
          : "Balanced return";

    const recs: string[] = [];
    if (years > 0) recs.push("बचत दर 5–15% ले बढाउँदा FIRE छिटो पुग्छ।");
    if (riskGap > 0.2) recs.push("खर्च घटाउने वा आय बढाउने कदम सोच्नुहोस्।");
    if (wealthResult.perpetualShortfall) recs.push("SWR घटाएर दीर्घकालीन स्थायित्व बढाउनुस्।");
    if ((horizonGrowthPct ?? 0) < 20) recs.push("दीर्घकालीन वृद्धि बढाउन SIP जस्ता योजनाहरू विचार गर्नुस्।");

    const timelineItems = [
      { label: "Now", value: projection.currentAge, accent: "emerald" as const },
      { label: "FIRE", value: Math.round(wealthResult.fireAgeYears), accent: "cyan" as const },
      { label: "Peak", value: Math.round(wealthResult.peakWealthAge), accent: "amber" as const },
      ...(wealthResult.depletionAge
        ? [{ label: "Deplete", value: Math.round(wealthResult.depletionAge), accent: "rose" as const }]
        : []),
    ];

    return {
      readinessScore: Math.round(readiness),
      yearsToFire: years,
      probabilityPct: Math.round(probability),
      passiveAtSWRMonthlyNpr: swrMonthly,
      remainingWealthNpr: remainingWealth,
      riskShortfallPct,
      riskVolatilityTag,
      recommendations: recs,
      timelineItems,
    };
  }, [result, wealthResult, wealthParams, projection, horizonGrowthPct]);

  const reportRef = useRef<HTMLDivElement | null>(null);
  const handleDownloadPdf = useCallback(async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageWidth - w) / 2;
    const y = 24;
    pdf.addImage(imgData, "PNG", x, y, w, h, undefined, "FAST");
    pdf.save("fire-readiness-report.pdf");
  }, []);

  const nepaliSummary = useMemo(
    () =>
      buildNepaliSummary({
        readinessScore,
        yearsToFire,
        swrMonthlyIncomeNpr: passiveAtSWRMonthlyNpr,
      }),
    [readinessScore, yearsToFire, passiveAtSWRMonthlyNpr],
  );

  const pdfBtn =
    "inline-flex items-center gap-2 rounded-xl border border-emerald-300/90 bg-white/95 px-3 py-2 text-xs font-black text-[#064E3B] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-emerald-50 sm:text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
            <Brain size={18} strokeWidth={2.25} />
          </div>
          <h3 className="text-lg font-black tracking-tight text-[#064E3B] sm:text-xl">
            🧠 AI FIRE Readiness Analysis
          </h3>
        </div>
        <button type="button" onClick={handleDownloadPdf} className={pdfBtn}>
          <FileDown size={14} /> Download PDF
        </button>
      </div>

      <div ref={reportRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ReadinessCard className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">FIRE Readiness Score</p>
            <Sparkles size={16} className="text-emerald-800" />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <CircularProgress value={readinessScore} max={100} size={96} tone="light" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#374151]">Overall readiness</p>
              <p className="text-2xl font-black text-[#064E3B]">{readinessScore}%</p>
              <AiProgressBar className="mt-2" value={readinessScore} tone="light" />
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#374151]">
            Progress vs target, savings momentum, and solvency signals combined.
          </p>
        </ReadinessCard>

        <ReadinessCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">Years to FIRE</p>
            <Clock size={16} className="text-emerald-800" />
          </div>
          <p className="mt-2 text-3xl font-black text-[#064E3B]">
            {yearsToFire <= 0 ? "Ready now" : `${yearsToFire.toFixed(1)} years`}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#374151]">
            FIRE age ~ {Math.round(wealthResult.fireAgeYears)} · Peak wealth ~ {Math.round(wealthResult.peakWealthAge)}
          </p>
        </ReadinessCard>

        <ReadinessCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">
              Financial Independence Probability
            </p>
            <TrendingUp size={16} className="text-emerald-800" />
          </div>
          <div className="mt-2">
            <AiProgressBar value={probabilityPct} tone="light" />
          </div>
          <p className="mt-2 text-sm font-semibold text-[#374151]">
            Blend of progress, years, and solvency. Adjust inputs for instant updates.
          </p>
        </ReadinessCard>

        <ReadinessCard>
          <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">Retirement Income Analysis</p>
          <p className="mt-2 text-2xl font-black text-[#064E3B]">
            {formatMoney(passiveAtSWRMonthlyNpr)}{" "}
            <span className="text-sm font-bold text-[#6B7280]">/ month at SWR</span>
          </p>
          <p className="mt-2 text-sm font-semibold text-[#374151]">
            SWR {wealthParams.safeWithdrawalRatePct}% · Expense inflation {wealthParams.expenseInflationAnnualPct}%/yr
          </p>
        </ReadinessCard>

        <ReadinessCard>
          <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">Remaining Wealth Projection</p>
          <p className="mt-2 text-2xl font-black text-[#064E3B]">{formatMoney(remainingWealthNpr)}</p>
          <p className="mt-2 text-sm font-semibold text-[#374151]">
            End of horizon (age {Math.round(wealthResult.solventThroughAge)}) · Peak ~{" "}
            {formatMoney(wealthResult.peakWealthNpr)}
          </p>
        </ReadinessCard>

        <ReadinessCard className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">FIRE Journey Timeline</p>
            <LineChart size={16} className="text-emerald-800" />
          </div>
          <div className="relative mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
            {timelineItems.map(({ label, value, accent }) => (
              <div key={label} className="contents">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black text-white shadow-sm ${
                    accent === "emerald"
                      ? "bg-gradient-to-br from-emerald-800 to-emerald-600"
                      : accent === "cyan"
                        ? "bg-gradient-to-br from-teal-700 to-cyan-600"
                        : accent === "amber"
                          ? "bg-gradient-to-br from-amber-600 to-amber-500"
                          : "bg-gradient-to-br from-rose-700 to-rose-500"
                  }`}
                >
                  {value}
                </div>
                <div className="rounded-xl border border-emerald-200/90 bg-white/90 p-2.5 text-sm font-bold text-[#064E3B]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </ReadinessCard>

        <ReadinessCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">Risk Analysis</p>
            <ShieldAlert size={16} className="text-emerald-800" />
          </div>
          <div className="mt-2 space-y-2">
            <AiProgressBar value={100 - riskShortfallPct} label="Target coverage" tone="light" />
            <p className="text-sm font-semibold text-[#374151]">
              {riskVolatilityTag} · Shortfall {riskShortfallPct}% vs target corpus
            </p>
          </div>
        </ReadinessCard>

        <ReadinessCard className="lg:col-span-2">
          <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">AI Recommendations</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm font-semibold text-[#374151]">
            {recommendations.length === 0 ? <li>Inputs look consistent — keep monitoring savings momentum.</li> : null}
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </ReadinessCard>

        <ReadinessCard>
          <p className="text-xs font-black uppercase tracking-wide text-[#4B5563]">व्यक्तिगत नेपाली व्याख्या</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#374151]">{nepaliSummary}</p>
        </ReadinessCard>

        <ReadinessCard className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-[#064E3B]">FIRE Readiness PDF Report</p>
            <button type="button" onClick={handleDownloadPdf} className={pdfBtn}>
              <FileDown size={14} /> Download
            </button>
          </div>
          <p className="mt-2 text-sm font-semibold text-[#374151]">
            Exports this analysis with your current inputs, including score, timeline, and guidance.
          </p>
        </ReadinessCard>
      </div>
    </div>
  );
}
