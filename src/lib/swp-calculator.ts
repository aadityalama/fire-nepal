export type SwpCurrency = "KRW" | "NPR";

export interface SwpInputs {
  initialCorpus: number;
  monthlyWithdrawal: number;
  annualReturnPct: number;
  annualInflationPct: number;
  horizonYears: number;
}

export interface SwpYearPoint {
  year: number;
  /** End-of-year balance when withdrawals grow with inflation. */
  balanceWithInflation: number;
  /** End-of-year balance when monthly withdrawal stays constant. */
  balanceFlatWithdrawal: number;
  /** Sum of withdrawals during that year (inflation path). */
  withdrawalsNominal: number;
  /** Sum of withdrawals that year on the flat path (always W0 × months). */
  withdrawalsFlat: number;
}

export interface SwpSimulationResult {
  yearly: SwpYearPoint[];
  depletionMonth: number | null;
  depletionMonthFlat: number | null;
  totalWithdrawalsNominal: number;
  totalWithdrawalsFlat: number;
  endingBalanceNominal: number;
  endingBalanceFlat: number;
  survivalYears: number;
  survivalYearsDisplay: string;
  initialWithdrawalRatePct: number;
  sustainabilityScore: number;
  safetyLevel: "safe" | "caution" | "risk";
}

const MONTHS_PER_YEAR = 12;

function monthlyReturnFactor(annualReturnPct: number): number {
  return annualReturnPct / 100 / MONTHS_PER_YEAR;
}

/** Per-month growth factor for withdrawals from annual CPI-style inflation. */
function withdrawalGrowthFactorPerMonth(annualInflationPct: number): number {
  return Math.pow(1 + annualInflationPct / 100, 1 / MONTHS_PER_YEAR) - 1;
}

function simulate(
  initial: number,
  monthlyWithdrawal0: number,
  annualReturnPct: number,
  annualInflationPct: number,
  horizonYears: number,
  growWithdrawalsWithInflation: boolean,
): {
  monthEndBalance: number[];
  depletionMonth: number | null;
  totalWithdrawals: number;
} {
  const months = Math.max(0, Math.round(horizonYears * MONTHS_PER_YEAR));
  const r = monthlyReturnFactor(annualReturnPct);
  const g = withdrawalGrowthFactorPerMonth(annualInflationPct);

  let balance = Math.max(0, initial);
  let totalWithdrawals = 0;
  let depletionMonth: number | null = null;

  const monthEndBalance: number[] = [balance];

  for (let month = 1; month <= months; month++) {
    const withdrawal =
      monthlyWithdrawal0 * (growWithdrawalsWithInflation ? Math.pow(1 + g, month - 1) : 1);

    balance = balance * (1 + r) - withdrawal;
    totalWithdrawals += withdrawal;

    if (balance <= 0 && depletionMonth === null) {
      depletionMonth = month;
      balance = 0;
    }

    monthEndBalance.push(balance);
    if (depletionMonth !== null) break;
  }

  return { monthEndBalance, depletionMonth, totalWithdrawals };
}

function buildYearlySeries(
  monthEndBalance: number[],
  monthlyWithdrawal0: number,
  annualInflationPct: number,
  horizonYears: number,
  growWithdrawals: boolean,
): Pick<SwpYearPoint, "year" | "balanceWithInflation" | "withdrawalsNominal">[] {
  const g = withdrawalGrowthFactorPerMonth(annualInflationPct);
  const totalMonths = Math.round(horizonYears * MONTHS_PER_YEAR);
  const years = Math.max(1, Math.ceil(totalMonths / MONTHS_PER_YEAR));
  const out: Pick<SwpYearPoint, "year" | "balanceWithInflation" | "withdrawalsNominal">[] = [];

  for (let y = 1; y <= years; y++) {
    const endMonth = Math.min(y * MONTHS_PER_YEAR, monthEndBalance.length - 1);
    const startMonth = (y - 1) * MONTHS_PER_YEAR;
    let wSum = 0;
    for (let m = startMonth + 1; m <= endMonth; m++) {
      wSum += monthlyWithdrawal0 * (growWithdrawals ? Math.pow(1 + g, m - 1) : 1);
    }
    out.push({
      year: y,
      balanceWithInflation: monthEndBalance[endMonth] ?? 0,
      withdrawalsNominal: wSum,
    });
  }

  return out;
}

function sustainabilityScore(
  depletionMonth: number | null,
  horizonMonths: number,
  endingBalance: number,
  initial: number,
): number {
  if (initial <= 0) return 0;
  if (depletionMonth !== null) {
    const survived = depletionMonth / Math.max(1, horizonMonths);
    return Math.round(Math.max(0, Math.min(88, survived * 88)));
  }
  const ratio = endingBalance / initial;
  if (ratio >= 1.2) return 100;
  if (ratio >= 1) return 96 + Math.round(Math.min(4, (ratio - 1) * 20));
  if (ratio >= 0.5) return 82 + Math.round(((ratio - 0.5) / 0.5) * 14);
  if (ratio >= 0.25) return 65 + Math.round(((ratio - 0.25) / 0.25) * 17);
  if (ratio >= 0.1) return 48 + Math.round(((ratio - 0.1) / 0.15) * 17);
  return Math.round(Math.max(28, 28 + (ratio / 0.1) * 20));
}

function withdrawalSafetyLevel(initialWrPct: number): "safe" | "caution" | "risk" {
  if (initialWrPct <= 3.5) return "safe";
  if (initialWrPct <= 5.5) return "caution";
  return "risk";
}

export function runSwpSimulation(inputs: SwpInputs): SwpSimulationResult {
  const initial = Math.max(0, inputs.initialCorpus);
  const w0 = Math.max(0, inputs.monthlyWithdrawal);
  const horizonYears = Math.max(1, Math.min(80, inputs.horizonYears));
  const horizonMonths = Math.round(horizonYears * MONTHS_PER_YEAR);

  const infl = simulate(
    initial,
    w0,
    inputs.annualReturnPct,
    inputs.annualInflationPct,
    horizonYears,
    true,
  );

  const flat = simulate(
    initial,
    w0,
    inputs.annualReturnPct,
    inputs.annualInflationPct,
    horizonYears,
    false,
  );

  const yearlyInfl = buildYearlySeries(
    infl.monthEndBalance,
    w0,
    inputs.annualInflationPct,
    horizonYears,
    true,
  );
  const yearlyFlat = buildYearlySeries(
    flat.monthEndBalance,
    w0,
    inputs.annualInflationPct,
    horizonYears,
    false,
  );

  const yearly: SwpYearPoint[] = yearlyInfl.map((row, i) => ({
    year: row.year,
    balanceWithInflation: row.balanceWithInflation,
    balanceFlatWithdrawal: yearlyFlat[i]?.balanceWithInflation ?? 0,
    withdrawalsNominal: row.withdrawalsNominal,
    withdrawalsFlat: yearlyFlat[i]?.withdrawalsNominal ?? w0 * MONTHS_PER_YEAR,
  }));

  const initialWithdrawalRatePct =
    initial > 0 ? Math.min(999, (w0 * MONTHS_PER_YEAR * 100) / initial) : 0;

  const survivalYears = infl.depletionMonth
    ? infl.depletionMonth / MONTHS_PER_YEAR
    : horizonYears;

  let survivalYearsDisplay: string;
  if (infl.depletionMonth === null) {
    survivalYearsDisplay = `${horizonYears}+ years (full horizon)`;
  } else {
    const y = Math.floor(infl.depletionMonth / MONTHS_PER_YEAR);
    const m = infl.depletionMonth % MONTHS_PER_YEAR;
    survivalYearsDisplay = m > 0 ? `${y}y ${m}m` : `${y} years`;
  }

  const endingNominal = infl.monthEndBalance[infl.monthEndBalance.length - 1] ?? 0;

  const displayYearCount = infl.depletionMonth
    ? Math.min(yearly.length, Math.max(1, Math.ceil(infl.depletionMonth / MONTHS_PER_YEAR)))
    : yearly.length;
  const yearlyDisplay = yearly.slice(0, displayYearCount);

  return {
    yearly: yearlyDisplay,
    depletionMonth: infl.depletionMonth,
    depletionMonthFlat: flat.depletionMonth,
    totalWithdrawalsNominal: infl.totalWithdrawals,
    totalWithdrawalsFlat: flat.totalWithdrawals,
    endingBalanceNominal: endingNominal,
    endingBalanceFlat: flat.monthEndBalance[flat.monthEndBalance.length - 1] ?? 0,
    survivalYears,
    survivalYearsDisplay,
    initialWithdrawalRatePct,
    sustainabilityScore: sustainabilityScore(
      infl.depletionMonth,
      horizonMonths,
      endingNominal,
      initial,
    ),
    safetyLevel: withdrawalSafetyLevel(initialWithdrawalRatePct),
  };
}

export function formatSwpCurrency(value: number, currency: SwpCurrency): string {
  const abs = Math.abs(Math.round(value));
  if (currency === "KRW") {
    return `₩${abs.toLocaleString("en-US")}`;
  }
  return `रु ${abs.toLocaleString("en-IN")}`;
}

export function buildSwpAiInsight(
  result: SwpSimulationResult,
  horizonYears: number,
  currency: SwpCurrency,
  annualInflationPct: number,
): string {
  const parts: string[] = [];

  if (result.depletionMonth === null) {
    parts.push(
      `Your portfolio can sustain inflation-adjusted withdrawals across the full ${horizonYears}-year projection.`,
    );
  } else {
    parts.push(
      `At current settings, the portfolio may deplete after about ${result.survivalYearsDisplay} of withdrawals.`,
    );
  }

  if (result.safetyLevel === "safe") {
    parts.push("Initial withdrawal rate is in a calmer band for multi-decade retirements.");
  } else if (result.safetyLevel === "caution") {
    parts.push("Withdrawal rate is elevated — trimming monthly draws or delaying retirement improves margin.");
  } else {
    parts.push("Withdrawal rate is high versus corpus; consider lowering draws or increasing the starting balance.");
  }

  const last = result.yearly[result.yearly.length - 1];
  if (last && annualInflationPct > 0) {
    const gap = last.balanceFlatWithdrawal - last.balanceWithInflation;
    if (gap > 0) {
      parts.push(
        `By year ${last.year}, inflation-linked spending leaves about ${formatSwpCurrency(gap, currency)} less in balance than keeping withdrawals flat (same return assumptions).`,
      );
    }
  }

  return parts.join(" ");
}

/* -------------------------------------------------------------------------- */
/*  AI Retirement Analysis (नेपालीमा विस्तृत विश्लेषण)                          */
/* -------------------------------------------------------------------------- */

export interface SwpAnalysisInputs {
  initial: number;
  monthly: number;
  annualReturnPct: number;
  annualInflationPct: number;
  horizonYears: number;
}

export type SwpScoreBand = "excellent" | "good" | "moderate" | "risky";
export type SwpWithdrawalSafety = "verySafe" | "safe" | "moderate" | "risky";
export type SwpRiskLevel = "low" | "medium" | "high";
export type SwpTone = "positive" | "warning" | "info";

export interface SwpRecommendation {
  titleNe: string;
  detailNe: string;
  tone: SwpTone;
}

export interface SwpRetirementAnalysis {
  hasData: boolean;
  currency: SwpCurrency;
  plan: {
    initial: number;
    monthly: number;
    annualReturnPct: number;
    annualInflationPct: number;
    horizonYears: number;
    summaryNe: string;
  };
  score: {
    value: number;
    band: SwpScoreBand;
    labelNe: string;
    labelEn: string;
    explanationNe: string;
  };
  withdrawal: {
    ratePct: number;
    ruleDiffPct: number;
    recommendedMonthlyAt4Pct: number;
    safety: SwpWithdrawalSafety;
    labelNe: string;
    explanationNe: string;
  };
  cashflow: {
    monthlyReturn: number;
    monthlyWithdrawal: number;
    netMonthly: number;
    growingFaster: boolean;
    explanationNe: string;
  };
  inflation: {
    startMonthly: number;
    endMonthly: number;
    purchasingPowerFactor: number;
    futurePurchasingPower: number;
    explanationNe: string[];
  };
  survival: {
    survivesFullHorizon: boolean;
    survivalYears: number;
    survivalYearsDisplay: string;
    horizonYears: number;
    statusNe: string;
  };
  risk: {
    level: SwpRiskLevel;
    emoji: string;
    labelNe: string;
    explanationNe: string;
  };
  recommendations: SwpRecommendation[];
  summaryNe: string;
  remaining: {
    value: number;
    depleted: boolean;
    headlineNe: string;
    bulletsNe: string[];
    meaningNe: string;
  };
  wealthJourney: {
    initialInvestment: number;
    totalGrowth: number;
    totalWithdrawals: number;
    remainingPortfolio: number;
  };
}

function trimPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function scoreBand(score: number): SwpScoreBand {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "moderate";
  return "risky";
}

function withdrawalSafetyBand(ratePct: number): SwpWithdrawalSafety {
  if (ratePct <= 3) return "verySafe";
  if (ratePct <= 4) return "safe";
  if (ratePct <= 6) return "moderate";
  return "risky";
}

export function buildSwpRetirementAnalysis(
  result: SwpSimulationResult,
  inputs: SwpAnalysisInputs,
  currency: SwpCurrency,
): SwpRetirementAnalysis {
  const { initial, monthly, annualReturnPct, annualInflationPct, horizonYears } = inputs;
  const fmt = (n: number) => formatSwpCurrency(n, currency);
  const hasData = initial > 0 && monthly > 0;

  // 1. Your plan ----------------------------------------------------------
  const planSummaryNe =
    `तपाईंले ${fmt(initial)} को प्रारम्भिक लगानीबाट सुरु गर्दै हरेक महिना ${fmt(monthly)} निकाल्ने योजना बनाउनुभएको छ। ` +
    `तपाईंको लगानीले वार्षिक ${trimPct(annualReturnPct)} प्रतिफल दिने र मुद्रास्फीति ${trimPct(annualInflationPct)} रहने अनुमान गरिएको छ। ` +
    `यो योजना ${horizonYears} वर्षको अवधिका लागि हो।`;

  // 2. Sustainability score ----------------------------------------------
  const scoreValue = result.sustainabilityScore;
  const band = scoreBand(scoreValue);
  const scoreLabelNe =
    band === "excellent" ? "उत्कृष्ट" : band === "good" ? "राम्रो" : band === "moderate" ? "मध्यम" : "जोखिमपूर्ण";
  const scoreLabelEn =
    band === "excellent" ? "Excellent" : band === "good" ? "Good" : band === "moderate" ? "Moderate" : "Risky";
  const scoreExplanationNe =
    band === "excellent"
      ? `तपाईंको योजना निकै बलियो छ। ${horizonYears} वर्षको पूरा अवधिभर लगानीले खर्च सजिलै धान्न सक्ने र अन्त्यमा पनि राम्रो रकम बाँकी रहने सम्भावना छ।`
      : band === "good"
        ? `तपाईंको योजना राम्रो अवस्थामा छ। सामान्यतया लगानीले पूरा अवधि धान्छ, तर बजारको उतारचढावका बेला थोरै सतर्कता आवश्यक हुन सक्छ।`
        : band === "moderate"
          ? `तपाईंको योजना मध्यम अवस्थामा छ। खर्च वा निकासी अलिकति बढी भएमा भविष्यमा पैसा चाँडै सकिन सक्छ, त्यसैले सुधारको आवश्यकता देखिन्छ।`
          : `तपाईंको योजना अहिले जोखिमपूर्ण देखिन्छ। हालको निकासी दर लगानीको तुलनामा उच्च भएकाले पैसा तोकिएको अवधिअघि नै सकिन सक्छ।`;

  // 3. Withdrawal safety --------------------------------------------------
  const ratePct = result.initialWithdrawalRatePct;
  const safety = withdrawalSafetyBand(ratePct);
  const ruleDiffPct = ratePct - 4;
  const recommendedMonthlyAt4Pct = (initial * 0.04) / 12;
  const withdrawalLabelNe =
    safety === "verySafe"
      ? "अत्यन्त सुरक्षित"
      : safety === "safe"
        ? "सुरक्षित"
        : safety === "moderate"
          ? "मध्यम"
          : "जोखिमपूर्ण";
  const withdrawalExplanationNe =
    safety === "verySafe"
      ? `तपाईंको प्रारम्भिक निकासी दर ${trimPct(ratePct)} छ, जुन प्रख्यात 4% नियमभन्दा पनि कम हो। यो एकदमै सुरक्षित मानिन्छ र पैसा लामो समयसम्म टिकाउन सहयोग गर्छ।`
      : safety === "safe"
        ? `तपाईंको निकासी दर ${trimPct(ratePct)} छ, जुन 4% नियमको वरिपरि छ। यो सामान्यतया सुरक्षित मानिन्छ।`
        : safety === "moderate"
          ? `तपाईंको निकासी दर ${trimPct(ratePct)} छ, जुन 4% नियमभन्दा केही बढी हो। यो मध्यम जोखिममा पर्छ — बजार खराब भएको वर्षमा सतर्क हुनुपर्छ।`
          : `तपाईंको निकासी दर ${trimPct(ratePct)} छ, जुन 4% नियमभन्दा धेरै बढी हो। यसले पैसा चाँडै सकिने जोखिम बढाउँछ।`;

  // 4. Monthly income vs withdrawal --------------------------------------
  const monthlyReturn = initial * (annualReturnPct / 100 / 12);
  const netMonthly = monthlyReturn - monthly;
  const growingFaster = monthlyReturn >= monthly;
  const cashflowExplanationNe = growingFaster
    ? `सुरुमा तपाईंको Portfolio ले हरेक महिना करिब ${fmt(monthlyReturn)} प्रतिफल कमाउँछ, जबकि तपाईं ${fmt(monthly)} मात्र निकाल्नुहुन्छ। यसको मतलब तपाईंको लगानी निकासीभन्दा छिटो बढिरहेको छ र सम्पत्ति थपिँदै जान्छ।`
    : `सुरुमा तपाईंको Portfolio ले हरेक महिना करिब ${fmt(monthlyReturn)} प्रतिफल कमाउँछ, तर तपाईं ${fmt(monthly)} निकाल्नुहुन्छ। निकासी प्रतिफलभन्दा बढी भएकाले मूल लगानी बिस्तारै घट्दै जान सक्छ।`;

  // 5. Inflation impact ---------------------------------------------------
  const inflationFactor = Math.pow(1 + annualInflationPct / 100, horizonYears);
  const endMonthly = monthly * inflationFactor;
  const purchasingPowerFactor = inflationFactor > 0 ? 1 / inflationFactor : 1;
  const futurePurchasingPower = monthly * purchasingPowerFactor;
  const inflationBulletsNe: string[] = [
    "मुद्रास्फीतिले समयसँगै पैसाको किन्ने क्षमता घटाउँदै लैजान्छ।",
  ];
  if (annualInflationPct > 0) {
    inflationBulletsNe.push(
      `उही जीवनस्तर कायम राख्न तपाईंको मासिक निकासी अहिलेको ${fmt(monthly)} बाट बढ्दै ${horizonYears} वर्षपछि करिब ${fmt(endMonthly)} पुग्नेछ।`,
      `आजको ${fmt(monthly)} ले ${horizonYears} वर्षपछि किन्ने क्षमताको हिसाबले करिब ${fmt(futurePurchasingPower)} बराबरको सामान मात्र किन्न सकिन्छ।`,
      "त्यसैले खर्च हरेक वर्ष बढ्ने र किन्ने क्षमता घट्ने भएकाले मुद्रास्फीतिलाई ध्यानमा राखेर योजना बनाउनु महत्त्वपूर्ण छ।",
    );
  } else {
    inflationBulletsNe.push(
      "तपाईंले मुद्रास्फीति 0% राख्नुभएकाले मासिक निकासी वर्षभरि उस्तै रहन्छ, तर वास्तविक जीवनमा मूल्यवृद्धि हुने भएकाले केही मुद्रास्फीति मान्नु व्यावहारिक हुन्छ।",
    );
  }

  // 6. Investment survival -----------------------------------------------
  const survivesFullHorizon = result.depletionMonth === null;
  const survivalYearsFloor = Math.floor(result.survivalYears);
  const survivalStatusNe = survivesFullHorizon
    ? `✅ तपाईंको Portfolio ले पूरा ${horizonYears} वर्षको लगानी अवधि धान्न सक्छ।`
    : `⚠ तपाईंको Portfolio करिब ${survivalYearsFloor} वर्षपछि सकिन सक्छ।`;

  // 7. Risk analysis ------------------------------------------------------
  let level: SwpRiskLevel;
  if (!survivesFullHorizon || scoreValue < 50 || ratePct > 6) {
    level = "high";
  } else if (scoreValue >= 75 && ratePct <= 4) {
    level = "low";
  } else {
    level = "medium";
  }
  const riskEmoji = level === "low" ? "🟢" : level === "medium" ? "🟡" : "🔴";
  const riskLabelNe = level === "low" ? "न्यून जोखिम" : level === "medium" ? "मध्यम जोखिम" : "उच्च जोखिम";
  const riskExplanationNe =
    level === "low"
      ? "तपाईंको दिगोपन स्कोर राम्रो छ र निकासी दर सुरक्षित दायरामा छ। पैसा पूरा अवधिभर टिक्ने भएकाले जोखिम न्यून छ।"
      : level === "medium"
        ? "तपाईंको योजना ठिकठाक छ तर पूर्ण रूपमा सुरक्षित छैन। बजारको उतारचढाव वा बढ्दो खर्चले भविष्यमा दबाब दिन सक्छ, त्यसैले नियमित समीक्षा गर्नुहोस्।"
        : "हालको निकासी दर वा खर्च लगानीको तुलनामा उच्च भएकाले पैसा तोकिएको अवधिअघि नै सकिने जोखिम छ। सुधार आवश्यक छ।";

  // 8. Recommendations ----------------------------------------------------
  const remainingValue = Math.max(0, result.endingBalanceNominal);
  const depleted = !survivesFullHorizon;
  const recommendations: SwpRecommendation[] = [];
  if (depleted || ratePct > 6) {
    recommendations.push({
      titleNe: "मासिक निकासी घटाउनुहोस्",
      detailNe: "निकासी अलिकति घटाउँदा पैसा धेरै लामो समय टिक्छ र योजना बलियो हुन्छ।",
      tone: "warning",
    });
    recommendations.push({
      titleNe: "प्रारम्भिक लगानी बढाउनुहोस्",
      detailNe: "सम्भव भए सुरुको लगानी बढाउँदा वा रिटायरमेन्ट केही ढिलो गर्दा सुरक्षा बढ्छ।",
      tone: "info",
    });
  } else if (safety === "moderate") {
    recommendations.push({
      titleNe: "निकासीमा हल्का सतर्कता अपनाउनुहोस्",
      detailNe: "बजार खराब भएका वर्षमा खर्च केही घटाउन तयार रहँदा योजना जोगिन्छ।",
      tone: "info",
    });
  }
  if (band === "excellent" && ratePct < 3.5 && remainingValue > initial) {
    recommendations.push({
      titleNe: "तपाईंको Portfolio पहिले नै निकै स्वस्थ छ",
      detailNe: "हालको योजनाले लामो समयसम्म बलियो आर्थिक सुरक्षा दिन्छ।",
      tone: "positive",
    });
    recommendations.push({
      titleNe: "चाहेमा मासिक निकासी बढाउन सक्नुहुन्छ",
      detailNe: "तपाईंसँग जीवनस्तर उकास्ने वा बढी दान/बचत गर्ने ठाउँ छ।",
      tone: "positive",
    });
  }
  if (annualReturnPct <= annualInflationPct) {
    recommendations.push({
      titleNe: "उच्च प्रतिफल दिने लगानी विचार गर्नुहोस्",
      detailNe: "प्रतिफल मुद्रास्फीतिभन्दा कम भएकाले वास्तविक सम्पत्ति घट्न सक्छ।",
      tone: "warning",
    });
  }
  recommendations.push({
    titleNe: "लगानी विविधीकरण गर्नुहोस्",
    detailNe: "जोखिम घटाउन सेयर, बन्ड, सुन र नगदमा लगानी फैलाउनुहोस्।",
    tone: "info",
  });

  // 9. Simple summary -----------------------------------------------------
  const summarySentence1 =
    band === "excellent"
      ? "तपाईंको Retirement योजना अहिले निकै सुरक्षित देखिन्छ।"
      : band === "good"
        ? "तपाईंको Retirement योजना अहिले सुरक्षित देखिन्छ।"
        : band === "moderate"
          ? "तपाईंको Retirement योजना ठिकठाक छ तर सुधारको ठाउँ छ।"
          : "तपाईंको Retirement योजनामा अहिले जोखिम देखिन्छ।";
  const summarySentence2 = survivesFullHorizon
    ? `तपाईंको लगानीले ${horizonYears} वर्षभन्दा बढी समयसम्म खर्च धान्ने सम्भावना छ।`
    : `हालको अवस्थामा तपाईंको लगानी करिब ${survivalYearsFloor} वर्षपछि सकिन सक्छ।`;
  const summarySentence3 =
    safety === "verySafe" || safety === "safe"
      ? "हालको Withdrawal Rate सुरक्षित रहेकाले भविष्यमा पनि आर्थिक सुरक्षा रहने सम्भावना उच्च छ।"
      : safety === "moderate"
        ? "Withdrawal Rate केही उच्च भएकाले नियमित समीक्षा गर्दा राम्रो हुन्छ।"
        : "Withdrawal Rate उच्च भएकाले निकासी घटाउनु वा लगानी बढाउनु उपयुक्त हुन्छ।";
  const summaryNe = `${summarySentence1} ${summarySentence2} ${summarySentence3}`;

  // 10. Remaining portfolio ----------------------------------------------
  const remainingHeadlineNe = depleted
    ? `हालको अवस्थामा ${horizonYears} वर्षको अन्त्यसम्म तपाईंको Portfolio मा रकम बाँकी रहँदैन।`
    : `${horizonYears} वर्षसम्म नियमित निकासी गरेपछि पनि तपाईंको Portfolio मा अनुमानित ${fmt(remainingValue)} बाँकी रहनेछ।`;
  const remainingMeaningNe = depleted
    ? "यसको मतलब हालको योजना अनुसार पैसा अवधि सकिनुअघि नै समाप्त हुन सक्छ। समयमै सुधार गर्दा भविष्य सुरक्षित हुन्छ।"
    : "यसको मतलब तपाईंको आर्थिक भविष्य बलियो छ र योजना अवधिपछि पनि सम्पत्ति जोगिन्छ।";
  const remainingBulletsNe = depleted
    ? [
        "योजना अनुसार पैसा अवधि सकिनुअघि नै समाप्त हुन सक्छ।",
        "निकासी घटाउँदा वा लगानी बढाउँदा बाँकी रकम बढ्छ।",
        "भविष्यको आर्थिक सुरक्षाका लागि अहिले नै सुधार गर्नु उपयुक्त हुन्छ।",
      ]
    : [
        "Retirement पछि पनि पैसा समाप्त हुँदैन।",
        "तपाईंको परिवारका लागि सम्पत्ति बाँकी रहन सक्छ।",
        "भविष्यमा Withdrawal बढाउन सक्ने सम्भावना रहन्छ।",
        "Financial Freedom अझ बलियो हुन्छ।",
      ];

  // 11. Wealth journey ----------------------------------------------------
  const totalWithdrawals = result.totalWithdrawalsNominal;
  const totalGrowth = Math.max(0, remainingValue + totalWithdrawals - initial);

  return {
    hasData,
    currency,
    plan: {
      initial,
      monthly,
      annualReturnPct,
      annualInflationPct,
      horizonYears,
      summaryNe: planSummaryNe,
    },
    score: {
      value: scoreValue,
      band,
      labelNe: scoreLabelNe,
      labelEn: scoreLabelEn,
      explanationNe: scoreExplanationNe,
    },
    withdrawal: {
      ratePct,
      ruleDiffPct,
      recommendedMonthlyAt4Pct,
      safety,
      labelNe: withdrawalLabelNe,
      explanationNe: withdrawalExplanationNe,
    },
    cashflow: {
      monthlyReturn,
      monthlyWithdrawal: monthly,
      netMonthly,
      growingFaster,
      explanationNe: cashflowExplanationNe,
    },
    inflation: {
      startMonthly: monthly,
      endMonthly,
      purchasingPowerFactor,
      futurePurchasingPower,
      explanationNe: inflationBulletsNe,
    },
    survival: {
      survivesFullHorizon,
      survivalYears: result.survivalYears,
      survivalYearsDisplay: result.survivalYearsDisplay,
      horizonYears,
      statusNe: survivalStatusNe,
    },
    risk: {
      level,
      emoji: riskEmoji,
      labelNe: riskLabelNe,
      explanationNe: riskExplanationNe,
    },
    recommendations,
    summaryNe,
    remaining: {
      value: remainingValue,
      depleted,
      headlineNe: remainingHeadlineNe,
      bulletsNe: remainingBulletsNe,
      meaningNe: remainingMeaningNe,
    },
    wealthJourney: {
      initialInvestment: initial,
      totalGrowth,
      totalWithdrawals,
      remainingPortfolio: remainingValue,
    },
  };
}
