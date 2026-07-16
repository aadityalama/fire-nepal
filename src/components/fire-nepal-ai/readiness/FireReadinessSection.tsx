\"use client\";

import { Brain, Clock, FileDown, LineChart, ShieldAlert, Sparkles, TrendingUp } from \"lucide-react\";
import { useMemo, useRef, useCallback } from \"react\";
import { FireAiGlassCard } from \"@/components/fire-nepal-ai/ui/FireAiGlassCard\";
import { CircularProgress } from \"@/components/fire-nepal-ai/ui/CircularProgress\";
import { AiProgressBar } from \"@/components/fire-nepal-ai/ui/AiProgressBar\";
import { useFireCalculator } from \"@/components/FireCalculatorContext\";
import html2canvas from \"html2canvas\";
import jsPDF from \"jspdf\";

function numberSafe(n?: number | null): number {
  if (!n || Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return n;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/** Dynamic strings localized for Nepali summary; simple template for now. */
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
  const years = yearsToFire <= 0 ? \"अहिले\" : `${yearsToFire.toFixed(1)} वर्ष`;
  const income = new Intl.NumberFormat(\"ne-NP\").format(Math.round(swrMonthlyIncomeNpr));
  return `तपाईंको FIRE तयारी स्कोर ${rounded}/100 छ। अनुमानित आर्थिक स्वतन्त्रता ${years} पछि सम्भव छ। सुरक्षित निकासी दर अनुसार महिनामा करिब रु ${income} निष्क्रिय आम्दानी सम्भावित छ। खर्च नियन्त्रण र बचत दर बढाउँदा लक्ष्य छिटो पुग्नेछ।`;
}

export function FireReadinessSection() {
  const {
    result,
    wealthResult,
    wealthParams,
    projection,
    horizonGrowthPct,
    formatMoney,
  } = useFireCalculator();

  // Derived values — memoized, reusing base engine outputs only.
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
    const savingsMomentum = clamp01(numberSafe(horizonGrowthPct ?? 0) / 120); // 120%+ 10y gain ~ strong
    const swrMonthly = (numberSafe(wealthParams.safeWithdrawalRatePct) / 100 / 12) * proj;
    const years = numberSafe(result.yearsToFire);
    const solvencyBonus = wealthResult.depletionAge === null ? 0.1 : 0; // solvent through horizon
    const shortfall = wealthResult.perpetualShortfall ? 0.12 : 0; // penalty

    // Readiness score blends multiple memoized signals
    const readiness =
      100 *
      clamp01(
        0.55 * progress + // direct FIRE progress weight
          0.25 * savingsMomentum + // momentum from growth path
          0.10 * (years > 0 ? Math.max(0, 1 - years / 35) : 1) + // closer years gets higher
          solvencyBonus -
          shortfall,
      );

    // Crude probability proxy using blended indicators (not Monte Carlo to avoid duplicate calcs)
    const probability =
      100 *
      clamp01(
        0.6 * progress + 0.25 * (years > 0 ? Math.max(0, 1 - years / 40) : 1) + 0.15 * (solvencyBonus > 0 ? 1 : 0.6),
      );

    const remainingWealth =
      wealthResult.depletionAge === null
        ? wealthResult.peakWealthNpr
        : Math.max(0, wealthResult.peakWealthNpr - (proj - 0)); // show post-FIRE cushion proxy

    const riskGap = req > 0 ? Math.max(0, 1 - proj / req) : 1; // fraction below target
    const riskShortfallPct = Math.round(100 * riskGap);
    const riskVolatilityTag =
      numberSafe(wealthParams.annualReturnPct) >= 14
        ? \"High return assumption\"
        : numberSafe(wealthParams.annualReturnPct) <= 6
          ? \"Conservative return\"
          : \"Balanced return\";

    const recs: string[] = [];
    if (years > 0) recs.push(\"बचत दर 5–15% ले बढाउँदा FIRE छिटो पुग्छ।\");
    if (riskGap > 0.2) recs.push(\"खर्च घटाउने वा आय बढाउने कदम सोच्नुहोस्।\");
    if (wealthResult.perpetualShortfall) recs.push(\"SWR घटाएर दीर्घकालीन स्थायित्व बढाउनुस्।\");
    if ((horizonGrowthPct ?? 0) < 20) recs.push(\"दीर्घकालीन वृद्धि बढाउन SIP जस्ता योजनाहरू विचार गर्नुस्।\");

    const timelineItems = [
      { label: \"Now\", value: projection.currentAge, accent: \"emerald\" as const },
      { label: \"FIRE\", value: Math.round(wealthResult.fireAgeYears), accent: \"cyan\" as const },
      { label: \"Peak\", value: Math.round(wealthResult.peakWealthAge), accent: \"amber\" as const },
      ...(wealthResult.depletionAge ? [{ label: \"Deplete\", value: Math.round(wealthResult.depletionAge), accent: \"rose\" as const }] : []),
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
    const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: \"#ffffff\" });
    const imgData = canvas.toDataURL(\"image/png\");
    const pdf = new jsPDF({ orientation: \"portrait\", unit: \"pt\", format: \"a4\" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    const x = (pageWidth - w) / 2;
    const y = 24;
    pdf.addImage(imgData, \"PNG\", x, y, w, h, undefined, \"FAST\");
    pdf.save(\"fire-readiness-report.pdf\");
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

  return (
    <div className=\"mt-4 space-y-4 sm:mt-5\">
      <div className=\"flex items-center justify-between gap-2\">
        <div className=\"flex items-center gap-2\">
          <div className=\"grid h-9 w-9 place-items-center rounded-xl bg-emerald-600/10 text-emerald-700\">
            <Brain size={18} />
          </div>
          <h3 className=\"text-lg font-black tracking-tight text-emerald-950 sm:text-xl\">🧠 AI FIRE Readiness Analysis</h3>
        </div>
        <button
          onClick={handleDownloadPdf}
          className=\"inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-emerald-50 sm:text-sm\"
        >
          <FileDown size={14} /> Download PDF
        </button>
      </div>

      <div ref={reportRef} className=\"grid gap-3 sm:grid-cols-2 lg:grid-cols-3\">
        {/* 1. FIRE Readiness Score — Hero card */}
        <FireAiGlassCard className=\"lg:col-span-1\">
          <div className=\"flex items-center justify-between\">
            <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">FIRE Readiness Score</p>
            <Sparkles size={16} className=\"text-emerald-700\" />
          </div>
          <div className=\"mt-3 flex items-center gap-4\">
            <CircularProgress value={readinessScore} max={100} size={96} />
            <div className=\"min-w-0\">
              <p className=\"text-sm font-bold text-slate-600\">Overall readiness</p>
              <p className=\"text-2xl font-black text-emerald-900\">{readinessScore}%</p>
              <AiProgressBar className=\"mt-2\" value={readinessScore} />
            </div>
          </div>
          <p className=\"mt-3 text-sm font-semibold leading-relaxed text-slate-600\">
            Progress vs target, savings momentum, and solvency signals combined.
          </p>
        </FireAiGlassCard>

        {/* 2. Years to FIRE */}
        <FireAiGlassCard>
          <div className=\"flex items-center justify-between\">
            <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">Years to FIRE</p>
            <Clock size={16} className=\"text-emerald-700\" />
          </div>
          <p className=\"mt-2 text-3xl font-black text-emerald-900\">
            {yearsToFire <= 0 ? \"Ready now\" : `${yearsToFire.toFixed(1)} years`}
          </p>
          <p className=\"mt-2 text-sm font-semibold text-slate-600\">
            FIRE age ~ {Math.round(wealthResult.fireAgeYears)} · Peak wealth ~ {Math.round(wealthResult.peakWealthAge)}
          </p>
        </FireAiGlassCard>

        {/* 3. Financial Independence Probability */}
        <FireAiGlassCard>
          <div className=\"flex items-center justify-between\">
            <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">Financial Independence Probability</p>
            <TrendingUp size={16} className=\"text-emerald-700\" />
          </div>
          <div className=\"mt-2\">
            <AiProgressBar value={probabilityPct} />
          </div>
          <p className=\"mt-2 text-sm font-semibold text-slate-600\">
            Blend of progress, years, and solvency. Adjust inputs for instant updates.
          </p>
        </FireAiGlassCard>

        {/* 4. Retirement Income Analysis */}
        <FireAiGlassCard>
          <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">Retirement Income Analysis</p>
          <p className=\"mt-2 text-2xl font-black text-emerald-900\">
            {formatMoney(passiveAtSWRMonthlyNpr)} <span className=\"text-sm font-bold text-slate-500\">/ month at SWR</span>
          </p>
          <p className=\"mt-2 text-sm font-semibold text-slate-600\">
            SWR {wealthParams.safeWithdrawalRatePct}% · Expense inflation {wealthParams.expenseInflationAnnualPct}%/yr
          </p>
        </FireAiGlassCard>

        {/* 5. Remaining Wealth Projection */}
        <FireAiGlassCard>
          <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">Remaining Wealth Projection</p>
          <p className=\"mt-2 text-2xl font-black text-emerald-900\">{formatMoney(remainingWealthNpr)}</p>
          <p className=\"mt-2 text-sm font-semibold text-slate-600\">
            Peak balance ~ {formatMoney(wealthResult.peakWealthNpr)} · Solvent through ~ {wealthResult.solventThroughAge}
          </p>
        </FireAiGlassCard>

        {/* 6. FIRE Journey Timeline */}
        <FireAiGlassCard className=\"lg:col-span-2\">
          <div className=\"mb-2 flex items-center justify-between\">
            <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">FIRE Journey Timeline</p>
            <LineChart size={16} className=\"text-emerald-700\" />
          </div>
          <div className=\"relative mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2\">
            {timelineItems.map(({ label, value, accent }) => (
              <div key={label} className=\"contents\">
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full text-white ${
                    accent === \"emerald\"
                      ? \"bg-emerald-600\"
                      : accent === \"cyan\"
                        ? \"bg-cyan-600\"
                        : accent === \"amber\"
                          ? \"bg-amber-600\"
                          : \"bg-rose-600\"
                  }`}
                >
                  {value}
                </div>
                <div className=\"rounded-xl border border-emerald-200 bg-white/80 p-2.5 text-sm font-bold text-emerald-900\">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </FireAiGlassCard>

        {/* 7. Risk Analysis */}
        <FireAiGlassCard>
          <div className=\"flex items-center justify-between\">
            <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">Risk Analysis</p>
            <ShieldAlert size={16} className=\"text-emerald-700\" />
          </div>
          <div className=\"mt-2 space-y-2\">
            <AiProgressBar value={100 - riskShortfallPct} label=\"Target coverage\" />
            <p className=\"text-sm font-semibold text-slate-600\">
              {riskVolatilityTag} · Shortfall {riskShortfallPct}% vs target corpus
            </p>
          </div>
        </FireAiGlassCard>

        {/* 8. AI Recommendations */}
        <FireAiGlassCard className=\"lg:col-span-2\">
          <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">AI Recommendations</p>
          <ul className=\"mt-2 list-disc space-y-1.5 pl-5 text-sm font-semibold text-slate-700\">
            {recommendations.length === 0 ? <li>Inputs look consistent — keep monitoring savings momentum.</li> : null}
            {recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </FireAiGlassCard>

        {/* 9. Personalized Nepali Explanation */}
        <FireAiGlassCard>
          <p className=\"text-xs font-black uppercase tracking-wide text-slate-500\">व्यक्तिगत नेपाली व्याख्या</p>
          <p className=\"mt-2 text-sm font-semibold leading-relaxed text-slate-700\">{nepaliSummary}</p>
        </FireAiGlassCard>

        {/* 10. Download FIRE Readiness PDF Report — button also in header; show inline for PDF capture */}
        <FireAiGlassCard className=\"lg:col-span-3\">
          <div className=\"flex flex-wrap items-center justify-between gap-2\">
            <p className=\"text-sm font-black text-emerald-900\">FIRE Readiness PDF Report</p>
            <button
              onClick={handleDownloadPdf}
              className=\"inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-black text-emerald-800 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-emerald-50 sm:text-sm\"
            >
              <FileDown size={14} /> Download
            </button>
          </div>
          <p className=\"mt-2 text-sm font-semibold text-slate-600\">
            Exports this analysis with your current inputs, including score, timeline, and guidance.
          </p>
        </FireAiGlassCard>
      </div>
    </div>
  );
}

