/**
 * SIP projection engine + AI Wealth Projection analysis.
 * Calculation math matches SipCalculatorDashboard (do not diverge).
 */

export type SipCurrency = "KRW" | "NPR" | "USD";

export const SIP_RATES_TO_NPR: Record<SipCurrency, number> = {
  KRW: 0.1029,
  NPR: 1,
  USD: 133.5,
};

export const SIP_FIRE_TARGET_NPR = 30_000_000;
export const SIP_LEAN_FIRE_NPR = 15_000_000;
export const SIP_COAST_FIRE_NPR = 7_500_000;
export const SIP_NEPAL_MONTHLY_EXPENSE_NPR = 100_000;

export interface SipInputs {
  monthlyInvestment: number;
  annualReturnPct: number;
  years: number;
  inflationPct: number;
  currency: SipCurrency;
  /** Optional storytelling age; defaults to 30 when omitted. */
  currentAge?: number;
}

export interface SipYearPoint {
  year: number;
  nominalValue: number;
  invested: number;
  profit: number;
  realValue: number;
  valueNpr: number;
  fireProgress: number;
}

export interface SipProjectionResult {
  monthlyInvestment: number;
  annualReturn: number;
  years: number;
  inflation: number;
  futureValue: number;
  totalInvested: number;
  totalProfit: number;
  inflationAdjustedValue: number;
  futureValueNpr: number;
  totalInvestedNpr: number;
  inflationAdjustedNpr: number;
  fireCompletion: number;
  passiveIncomeNpr: number;
  growthMultiple: number;
  inflationReductionPct: number;
  leanFireYear: number | null;
  fullFireYear: number | null;
  coastFireYear: number | null;
  retirementYearsCovered: number;
  yearlyRows: SipYearPoint[];
  cagrPct: number;
  realReturnPct: number;
}

export type SipScoreBand = "excellent" | "good" | "moderate" | "risky";
export type SipGoalBand = "excellent" | "onTrack" | "needsImprovement" | "highRisk";
export type SipRiskLevel = "low" | "moderate" | "high";
export type SipTone = "positive" | "warning" | "info";

export interface SipRecommendation {
  titleNe: string;
  detailNe: string;
  tone: SipTone;
}

export interface SipRiskItem {
  id: "market" | "inflation" | "horizon" | "behavior";
  labelEn: string;
  labelNe: string;
  level: SipRiskLevel;
  emoji: string;
  explanationNe: string;
}

export interface SipJourneyNode {
  age: number;
  labelEn: string;
  labelNe: string;
  value: number;
  kind: "start" | "milestone" | "horizon" | "freedom";
}

export interface SipWealthProjectionAnalysis {
  hasData: boolean;
  currency: SipCurrency;
  currentAge: number;
  plan: {
    monthlyInvestment: number;
    years: number;
    annualReturnPct: number;
    inflationPct: number;
    totalInvested: number;
    futureValue: number;
    summaryNe: string;
  };
  score: {
    value: number;
    band: SipScoreBand;
    labelEn: string;
    labelNe: string;
    whyNe: string;
    strengthsNe: string[];
    weaknessesNe: string[];
  };
  futureWealth: {
    futureValue: number;
    totalInvested: number;
    estimatedProfit: number;
    cagrPct: number;
    growthMultiple: number;
    explanationNe: string;
  };
  compoundStoryNe: string[];
  inflation: {
    beatsInflation: boolean;
    realReturnPct: number;
    inflationAdjustedValue: number;
    reductionPct: number;
    explanationNe: string[];
  };
  goal: {
    band: SipGoalBand;
    labelEn: string;
    labelNe: string;
    emoji: string;
    probabilityPct: number;
    fireCompletion: number;
    whyNe: string;
  };
  risks: SipRiskItem[];
  recommendations: SipRecommendation[];
  journey: SipJourneyNode[];
  remaining: {
    finalWealth: number;
    profit: number;
    inflationAdjusted: number;
    passiveMonthlyNpr: number;
    headlineNe: string;
    bulletsNe: string[];
    meaningNe: string;
  };
  summaryNe: string;
  verdict: {
    labelEn: string;
    labelNe: string;
    probabilityPct: number;
    whyNe: string;
  };
  chartSeries: Array<{
    year: number;
    age: number;
    invested: number;
    growth: number;
    futureValue: number;
    inflationAdjusted: number;
  }>;
}

function toNpr(value: number, currency: SipCurrency) {
  return value * SIP_RATES_TO_NPR[currency];
}

function yearsToReach(rows: SipYearPoint[], targetNpr: number) {
  return rows.find((row) => row.valueNpr >= targetNpr)?.year ?? null;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function trimPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function scoreBand(score: number): SipScoreBand {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "moderate";
  return "risky";
}

function goalBand(score: number, fireCompletion: number, beatsInflation: boolean): SipGoalBand {
  if (score >= 85 && fireCompletion >= 70 && beatsInflation) return "excellent";
  if (score >= 70 || fireCompletion >= 50) return "onTrack";
  if (score >= 50) return "needsImprovement";
  return "highRisk";
}

function riskEmoji(level: SipRiskLevel): string {
  return level === "low" ? "🟢" : level === "moderate" ? "🟡" : "🔴";
}

export function formatSipCurrency(value: number, currency: SipCurrency): string {
  const locale = currency === "KRW" ? "ko-KR" : currency === "NPR" ? "en-NP" : "en-US";
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Math.round(value));
}

export function formatSipNpr(value: number): string {
  return formatSipCurrency(value, "NPR");
}

/** End-of-period SIP future value — same formula as SipCalculatorDashboard. */
export function sipFutureValue(monthlyInvestment: number, annualReturnPct: number, years: number): number {
  const monthlyReturn = annualReturnPct / 100 / 12;
  const months = years * 12;
  if (months <= 0 || monthlyInvestment <= 0) return 0;
  if (monthlyReturn <= 0) return monthlyInvestment * months;
  return monthlyInvestment * ((Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn) * (1 + monthlyReturn);
}

/**
 * Full SIP projection. Keeps parity with the dashboard useMemo engine.
 */
export function runSipProjection(inputs: SipInputs): SipProjectionResult {
  const monthlyInvestment = Math.max(0, inputs.monthlyInvestment);
  const annualReturn = clamp(inputs.annualReturnPct, 0, 60);
  const years = clamp(Math.floor(inputs.years), 0, 60);
  const inflation = clamp(inputs.inflationPct, 0, 40);
  const currency = inputs.currency;
  const months = years * 12;

  const futureValue = sipFutureValue(monthlyInvestment, annualReturn, years);
  const totalInvested = monthlyInvestment * months;
  const totalProfit = Math.max(0, futureValue - totalInvested);
  const inflationFactor = Math.pow(1 + inflation / 100, years);
  const inflationAdjustedValue = inflationFactor > 0 ? futureValue / inflationFactor : futureValue;
  const futureValueNpr = toNpr(futureValue, currency);
  const totalInvestedNpr = toNpr(totalInvested, currency);
  const inflationAdjustedNpr = toNpr(inflationAdjustedValue, currency);
  const fireCompletion = Math.min(100, (futureValueNpr / SIP_FIRE_TARGET_NPR) * 100);
  const passiveIncomeNpr = (futureValueNpr * 0.04) / 12;
  const growthMultiple = totalInvested > 0 ? futureValue / totalInvested : 0;
  const inflationReductionPct =
    futureValue > 0 ? Math.max(0, (1 - inflationAdjustedValue / futureValue) * 100) : 0;
  const realReturnPct = annualReturn - inflation;
  const cagrPct =
    totalInvested > 0 && years > 0 && futureValue > 0
      ? (Math.pow(futureValue / totalInvested, 1 / years) - 1) * 100
      : 0;

  const yearlyRows: SipYearPoint[] = Array.from({ length: years + 1 }, (_, year) => {
    const yearMonths = year * 12;
    const nominalValue = sipFutureValue(monthlyInvestment, annualReturn, year);
    const invested = monthlyInvestment * yearMonths;
    const profit = Math.max(0, nominalValue - invested);
    const realValue = year === 0 ? 0 : nominalValue / Math.pow(1 + inflation / 100, year);
    const valueNpr = toNpr(nominalValue, currency);
    return {
      year,
      nominalValue,
      invested,
      profit,
      realValue,
      valueNpr,
      fireProgress: Math.min(100, (valueNpr / SIP_FIRE_TARGET_NPR) * 100),
    };
  });

  return {
    monthlyInvestment,
    annualReturn,
    years,
    inflation,
    futureValue,
    totalInvested,
    totalProfit,
    inflationAdjustedValue,
    futureValueNpr,
    totalInvestedNpr,
    inflationAdjustedNpr,
    fireCompletion,
    passiveIncomeNpr,
    growthMultiple,
    inflationReductionPct,
    leanFireYear: yearsToReach(yearlyRows, SIP_LEAN_FIRE_NPR),
    fullFireYear: yearsToReach(yearlyRows, SIP_FIRE_TARGET_NPR),
    coastFireYear: yearsToReach(yearlyRows, SIP_COAST_FIRE_NPR),
    retirementYearsCovered:
      SIP_NEPAL_MONTHLY_EXPENSE_NPR > 0 ? futureValueNpr / (SIP_NEPAL_MONTHLY_EXPENSE_NPR * 12) : 0,
    yearlyRows,
    cagrPct,
    realReturnPct,
  };
}

function buildWealthScore(result: SipProjectionResult): number {
  const progress = clamp(result.fireCompletion / 100, 0, 1);
  const multiple = clamp(result.growthMultiple / 4, 0, 1);
  const horizon = clamp(result.years / 25, 0, 1);
  const realEdge = clamp((result.realReturnPct + 2) / 12, 0, 1);
  const discipline = result.monthlyInvestment > 0 ? 1 : 0;
  return Math.round(
    100 * clamp(0.32 * progress + 0.22 * multiple + 0.18 * horizon + 0.18 * realEdge + 0.1 * discipline, 0, 1),
  );
}

/**
 * Nepali-first AI Wealth Projection narrative from SIP results.
 */
export function buildSipWealthProjectionAnalysis(
  result: SipProjectionResult,
  inputs: SipInputs,
): SipWealthProjectionAnalysis {
  const currency = inputs.currency;
  const fmt = (n: number) => formatSipCurrency(n, currency);
  const currentAge = clamp(Math.round(inputs.currentAge ?? 30), 18, 70);
  const hasData = result.monthlyInvestment > 0 && result.years > 0;
  const scoreValue = buildWealthScore(result);
  const band = scoreBand(scoreValue);
  const beatsInflation = result.realReturnPct > 0;
  const gBand = goalBand(scoreValue, result.fireCompletion, beatsInflation);

  const planSummaryNe =
    `तपाईंले हरेक महिना ${fmt(result.monthlyInvestment)} SIP लगानी गर्ने योजना बनाउनुभएको छ। ` +
    `यो योजना ${result.years} वर्षसम्म चल्नेछ र वार्षिक ${trimPct(result.annualReturn)} प्रतिफलको अनुमान राखिएको छ। ` +
    `कुल लगानी करिब ${fmt(result.totalInvested)} हुनेछ भने अनुमानित भविष्य मूल्य ${fmt(result.futureValue)} छ।`;

  const scoreLabelNe =
    band === "excellent" ? "उत्कृष्ट" : band === "good" ? "राम्रो" : band === "moderate" ? "मध्यम" : "जोखिमपूर्ण";
  const scoreLabelEn =
    band === "excellent" ? "Excellent" : band === "good" ? "Good" : band === "moderate" ? "Moderate" : "Risky";

  const strengthsNe: string[] = [];
  const weaknessesNe: string[] = [];
  if (result.years >= 15) strengthsNe.push("लामो समयको लगानी अवधिले चक्रवृद्धि ब्याजलाई राम्रोसँग काम गर्न दिन्छ।");
  if (result.growthMultiple >= 2) strengthsNe.push(`तपाईंको पैसा करिब ${result.growthMultiple.toFixed(1)} गुणा बढ्ने सम्भावना छ।`);
  if (beatsInflation) strengthsNe.push("अनुमानित प्रतिफल मुद्रास्फीतिभन्दा माथि छ — वास्तविक सम्पत्ति बढ्छ।");
  if (result.monthlyInvestment > 0) strengthsNe.push("नियमित मासिक SIP अनुशासन सम्पत्ति निर्माणको बलियो आधार हो।");
  if (result.fireCompletion >= 50) strengthsNe.push("यो योजना FIRE लक्ष्यतर्फ स्पष्ट प्रगति देखाउँछ।");
  if (strengthsNe.length === 0) strengthsNe.push("तपाईंले SIP सुरु गर्ने कदम नै दीर्घकालीन सम्पत्तिको सुरुवात हो।");

  if (result.years < 10) weaknessesNe.push("लगानी अवधि छोटो भएकाले चक्रवृद्धिको पूर्ण फाइदा कम हुन सक्छ।");
  if (!beatsInflation) weaknessesNe.push("प्रतिफल मुद्रास्फीतिभन्दा कम/बराबर भए वास्तविक किन्ने क्षमता घट्न सक्छ।");
  if (result.fireCompletion < 40) weaknessesNe.push("हालको SIP ले FIRE लक्ष्य पूरा गर्न थप बचत वा समय चाहिन सक्छ।");
  if (result.annualReturn >= 15) weaknessesNe.push("उच्च प्रतिफलको अनुमान राख्दा बजार जोखिम पनि बढी हुन्छ — सतर्क रहनुहोस्।");
  if (weaknessesNe.length === 0) weaknessesNe.push("योजना राम्रो छ; नियमित समीक्षा र विविधीकरणले अझ बलियो बनाउँछ।");

  const whyNe =
    band === "excellent"
      ? `तपाईंको Wealth Projection Score ${scoreValue}/100 छ। लामो अवधि, राम्रो वृद्धि गुणक र मुद्रास्फीति जित्ने प्रतिफलले योजना निकै बलियो देखिन्छ।`
      : band === "good"
        ? `तपाईंको स्कोर ${scoreValue}/100 छ। नियमित SIP र चक्रवृद्धिले सम्पत्ति बढाउँदैछ — थोरै सुधारले अझ उत्कृष्ट बनाउन सकिन्छ।`
        : band === "moderate"
          ? `तपाईंको स्कोर ${scoreValue}/100 छ। योजना सुरु भएको छ तर लक्ष्य छिटो पुग्न SIP रकम वा अवधि बढाउनु उपयोगी हुन्छ।`
          : `तपाईंको स्कोर ${scoreValue}/100 छ। हालको योगदान/अवधिले दीर्घकालीन लक्ष्य पुग्न अपुग देखिन सक्छ — सुधार आवश्यक छ।`;

  const futureExplanationNe =
    `${result.years} वर्षपछि तपाईंको अनुमानित भविष्य मूल्य ${fmt(result.futureValue)} हुनेछ। ` +
    `त्यसमा तपाईंले जम्मा ${fmt(result.totalInvested)} लगानी गर्नुहुन्छ र अनुमानित नाफा ${fmt(result.totalProfit)} रहन्छ। ` +
    `साधारण वृद्धि दर (CAGR जस्तो) करिब ${trimPct(result.cagrPct)} देखिन्छ भने मोडलको वार्षिक प्रतिफल ${trimPct(result.annualReturn)} हो।`;

  const compoundStoryNe = [
    "हरेक महिनाको सानो SIP ले समयसँगै ठूलो सम्पत्ति बनाउँछ — किनकि नयाँ लगानीमात्र होइन, पहिलेको नाफामाथि पनि प्रतिफल थपिन्छ।",
    "सुरुका वर्षहरूमा वृद्धि बिस्तारै देखिन्छ; पछिल्ला वर्षहरूमा चक्रवृद्धिले सम्पत्ति छिटो उकालो लाग्छ।",
    "धैर्य महत्त्वपूर्ण छ — बीचमा रोकिए वा बिक्री गरे चक्रवृद्धिको सबैभन्दा बलियो भाग गुम्न सक्छ।",
    `तपाईंको मोडलमा पैसा करिब ${result.growthMultiple.toFixed(1)} गुणा पुग्ने अनुमान छ — यो नियमितता र समयको संयुक्त परिणाम हो।`,
  ];

  const inflationExplanationNe: string[] = [
    "मुद्रास्फीतिले भविष्यको पैसाको किन्ने क्षमता घटाउँछ — त्यसैले नाममात्रको भविष्य मूल्य मात्र हेरेर निर्णय गर्नु हुँदैन।",
  ];
  if (result.inflation > 0) {
    inflationExplanationNe.push(
      `${result.years} वर्षपछिको ${fmt(result.futureValue)} को किन्ने क्षमता आजको हिसाबले करिब ${fmt(result.inflationAdjustedValue)} बराबर हुन्छ।`,
      `मुद्रास्फीतिले करिब ${trimPct(result.inflationReductionPct)} किन्ने क्षमता घटाउँछ।`,
      beatsInflation
        ? `तपाईंको अनुमानित वास्तविक प्रतिफल करिब ${trimPct(result.realReturnPct)} छ — लगानीले मुद्रास्फीति जित्ने सम्भावना छ।`
        : `अनुमानित वास्तविक प्रतिफल करिब ${trimPct(result.realReturnPct)} छ — मुद्रास्फीति जित्न प्रतिफल सुधार्नु वा अवधि लम्ब्याउनुहोस्।`,
    );
  } else {
    inflationExplanationNe.push(
      "तपाईंले मुद्रास्फीति 0% राख्नुभएकाले वास्तविक र नाममात्र मूल्य उस्तै देखिन्छ; व्यावहारिक योजनामा केही मुद्रास्फीति मान्नु राम्रो हुन्छ।",
    );
  }

  const goalLabelEn =
    gBand === "excellent"
      ? "Excellent"
      : gBand === "onTrack"
        ? "On Track"
        : gBand === "needsImprovement"
          ? "Needs Improvement"
          : "High Risk";
  const goalLabelNe =
    gBand === "excellent"
      ? "उत्कृष्ट"
      : gBand === "onTrack"
        ? "ट्र्याकमा"
        : gBand === "needsImprovement"
          ? "सुधार आवश्यक"
          : "उच्च जोखिम";
  const goalEmoji =
    gBand === "excellent" || gBand === "onTrack" ? "🟢" : gBand === "needsImprovement" ? "🟡" : "🔴";
  const probabilityPct = Math.round(
    clamp(
      0.45 * scoreValue +
        0.35 * result.fireCompletion +
        0.2 * (beatsInflation ? 100 : Math.max(0, 50 + result.realReturnPct * 5)),
      8,
      98,
    ),
  );
  const goalWhyNe =
    gBand === "excellent"
      ? `तपाईंको SIP योजना लक्ष्यतर्फ बलियो गतिमा छ। FIRE प्रगति ${trimPct(result.fireCompletion)} र सम्पत्ति स्कोर उच्च भएकाले दीर्घकालीन सम्पत्ति निर्माणको सम्भावना ${probabilityPct}% जति देखिन्छ।`
      : gBand === "onTrack"
        ? `तपाईं ट्र्याकमा हुनुहुन्छ। निरन्तर SIP र समय दिए दीर्घकालीन लक्ष्य नजिक पुग्ने सम्भावना करिब ${probabilityPct}% छ।`
        : gBand === "needsImprovement"
          ? `योजना सुरु भएको छ तर लक्ष्य पुग्न SIP बढाउने, अवधि लम्ब्याउने वा प्रतिफल सुधार्ने कदम चाहिन्छ। हालको सम्भावना करिब ${probabilityPct}% छ।`
          : `हालको योगदान/अवधिले लक्ष्य पुग्न अपुग देखिन्छ। जोखिम उच्च छ — योजना पुनरावलोकन आवश्यक छ (सम्भावना करिब ${probabilityPct}%)।`;

  const marketLevel: SipRiskLevel =
    result.annualReturn >= 16 ? "high" : result.annualReturn >= 11 ? "moderate" : "low";
  const inflationLevel: SipRiskLevel = !beatsInflation
    ? "high"
    : result.realReturnPct < 3
      ? "moderate"
      : "low";
  const horizonLevel: SipRiskLevel = result.years < 8 ? "high" : result.years < 15 ? "moderate" : "low";
  const behaviorLevel: SipRiskLevel = result.years >= 20 && result.monthlyInvestment > 0 ? "low" : "moderate";

  const risks: SipRiskItem[] = [
    {
      id: "market",
      labelEn: "Market Risk",
      labelNe: "बजार जोखिम",
      level: marketLevel,
      emoji: riskEmoji(marketLevel),
      explanationNe:
        marketLevel === "high"
          ? `वार्षिक ${trimPct(result.annualReturn)} प्रतिफलको अनुमान उच्च छ। बजार खराब वर्षमा वास्तविक नतिजा कम हुन सक्छ।`
          : marketLevel === "moderate"
            ? "सेयर/म्युचुअल फण्डमा उतारचढाव सामान्य हो। दीर्घकालीन दृष्टिले जोखिम व्यवस्थापन गर्न सकिन्छ।"
            : "प्रतिफल अनुमान सन्तुलित देखिन्छ। विविधीकरणले बजार झटका कम गर्न मद्दत गर्छ।",
    },
    {
      id: "inflation",
      labelEn: "Inflation Risk",
      labelNe: "मुद्रास्फीति जोखिम",
      level: inflationLevel,
      emoji: riskEmoji(inflationLevel),
      explanationNe:
        inflationLevel === "high"
          ? "मुद्रास्फीति प्रतिफलसँगै वा माथि भए वास्तविक सम्पत्ति घट्न सक्छ।"
          : inflationLevel === "moderate"
            ? "वास्तविक प्रतिफल पातलो छ — मुद्रास्फीति बढ्दा दबाब पर्न सक्छ।"
            : "लगानीले मुद्रास्फीति जित्ने पर्याप्त मार्जिन देखिन्छ।",
    },
    {
      id: "horizon",
      labelEn: "Time Horizon Risk",
      labelNe: "समय अवधि जोखिम",
      level: horizonLevel,
      emoji: riskEmoji(horizonLevel),
      explanationNe:
        horizonLevel === "high"
          ? "छोटो अवधिमा चक्रवृद्धिको फाइदा कम हुन्छ र बजार झटकाको असर बढी देखिन्छ।"
          : horizonLevel === "moderate"
            ? "मध्यम अवधि छ — निरन्तरता र सम्भव भए अवधि लम्ब्याउँदा फाइदा बढ्छ।"
            : "लामो क्षितिजले चक्रवृद्धि र रिकभरीको ठाउँ दिन्छ।",
    },
    {
      id: "behavior",
      labelEn: "Behavior Risk",
      labelNe: "व्यवहार जोखिम",
      level: behaviorLevel,
      emoji: riskEmoji(behaviorLevel),
      explanationNe:
        "बजार तल जाँदा SIP रोक्ने वा हतारमा बेच्ने आदतले दीर्घकालीन नतिजा बिगार्न सक्छ। अनुशासन नै सबैभन्दा ठूलो सुरक्षा हो।",
    },
  ];

  const recommendations: SipRecommendation[] = [];
  if (result.fireCompletion < 70) {
    recommendations.push({
      titleNe: "मासिक SIP बढाउनुहोस्",
      detailNe: "सम्भव भए 10–20% SIP बढाउँदा भविष्य मूल्य र FIRE प्रगति दुवै छिटो माथि जान्छ।",
      tone: "warning",
    });
  }
  recommendations.push({
    titleNe: "लगानीमा टिकिरहनुहोस्",
    detailNe: "चक्रवृद्धिको ठूलो फाइदा पछिल्ला वर्षहरूमा आउँछ — बीचमा रोकिनु हुँदैन।",
    tone: "positive",
  });
  if (result.years < 20) {
    recommendations.push({
      titleNe: "लगानी अवधि लम्ब्याउनुहोस्",
      detailNe: "केही वर्ष थप्दा पनि सम्पत्ति उल्लेखनीय रूपमा बढ्न सक्छ।",
      tone: "info",
    });
  }
  recommendations.push({
    titleNe: "लगानी विविधीकरण गर्नुहोस्",
    detailNe: "जोखिम घटाउन इक्विटी, बन्ड, सुन र नगदमा फैलाउनुहोस्।",
    tone: "info",
  });
  recommendations.push({
    titleNe: "Panic Selling बाट बच्नुहोस्",
    detailNe: "बजार गिरावटमा बेच्नुभन्दा SIP जारी राख्नु ऐतिहासिक रूपमा फाइदाजनक हुन्छ।",
    tone: "warning",
  });
  if (band === "excellent" || gBand === "excellent") {
    recommendations.push({
      titleNe: "वार्षिक SIP स्टेप-अप गर्नुहोस्",
      detailNe: "तलब बढ्दा SIP पनि बढाउने बानीले लक्ष्य अझ छिटो पूरा हुन्छ।",
      tone: "positive",
    });
  }
  if (!beatsInflation) {
    recommendations.push({
      titleNe: "मुद्रास्फीतिभन्दा माथिको प्रतिफल खोज्नुहोस्",
      detailNe: "वास्तविक सम्पत्ति जोगाउन प्रतिफल सुधार्ने वा खर्च घटाउने विकल्प हेर्नुहोस्।",
      tone: "warning",
    });
  }
  while (recommendations.length < 5) {
    recommendations.push({
      titleNe: "प्रत्येक वर्ष योजना समीक्षा गर्नुहोस्",
      detailNe: "प्रतिफल, मुद्रास्फीति र लक्ष्य परिवर्तनअनुसार SIP समायोजन गर्नुहोस्।",
      tone: "info",
    });
  }

  const endAge = currentAge + result.years;
  const mid1 = Math.min(endAge - 1, currentAge + Math.max(5, Math.floor(result.years / 3)));
  const mid2 = Math.min(endAge - 1, currentAge + Math.max(10, Math.floor((result.years * 2) / 3)));
  const valueAtAge = (age: number) => {
    const y = Math.max(0, Math.min(result.years, age - currentAge));
    return result.yearlyRows[y]?.nominalValue ?? 0;
  };
  const journey: SipJourneyNode[] = [
    {
      age: currentAge,
      labelEn: "Start SIP",
      labelNe: "SIP सुरु",
      value: 0,
      kind: "start",
    },
  ];
  if (mid1 > currentAge) {
    journey.push({
      age: mid1,
      labelEn: "Wealth building",
      labelNe: "सम्पत्ति वृद्धि",
      value: valueAtAge(mid1),
      kind: "milestone",
    });
  }
  if (mid2 > mid1) {
    journey.push({
      age: mid2,
      labelEn: "Acceleration phase",
      labelNe: "तीव्र वृद्धि चरण",
      value: valueAtAge(mid2),
      kind: "milestone",
    });
  }
  journey.push({
    age: endAge,
    labelEn: result.fireCompletion >= 100 ? "Financial Freedom" : "Horizon corpus",
    labelNe: result.fireCompletion >= 100 ? "आर्थिक स्वतन्त्रता" : "अवधि अन्त्यको सम्पत्ति",
    value: result.futureValue,
    kind: result.fireCompletion >= 100 ? "freedom" : "horizon",
  });

  const remaining = {
    finalWealth: result.futureValue,
    profit: result.totalProfit,
    inflationAdjusted: result.inflationAdjustedValue,
    passiveMonthlyNpr: result.passiveIncomeNpr,
    headlineNe: `अनुमानित अन्तिम सम्पत्ति ${fmt(result.futureValue)} हुनेछ।`,
    bulletsNe: [
      `कुल लगानी: ${fmt(result.totalInvested)}`,
      `अनुमानित नाफा: ${fmt(result.totalProfit)}`,
      `मुद्रास्फीति समायोजित मूल्य: ${fmt(result.inflationAdjustedValue)}`,
      `4% नियमअनुसार मासिक निष्क्रिय आम्दानी (NPR): ${formatSipNpr(result.passiveIncomeNpr)}`,
    ],
    meaningNe:
      "यो बाँकी/अन्तिम सम्पत्ति भविष्यको सुरक्षा, परिवारको लागि विरासत, वा FIRE जीवनशैलीको आधार बन्न सक्छ — नियमित SIP जारी राख्दा यो अनुमान अझ बलियो हुन्छ।",
  };

  const summaryNe =
    `${band === "excellent" || band === "good" ? "तपाईंको SIP सम्पत्ति योजना अहिले बलियो देखिन्छ।" : band === "moderate" ? "तपाईंको SIP योजना ठिकठाक छ तर सुधारको ठाउँ छ।" : "तपाईंको SIP योजनामा अहिले जोखिम देखिन्छ।"} ` +
    `हरेक महिना ${fmt(result.monthlyInvestment)} लगानी गर्दा ${result.years} वर्षमा करिब ${fmt(result.futureValue)} पुग्ने अनुमान छ। ` +
    `${beatsInflation ? "लगानीले मुद्रास्फीति जित्ने सम्भावना छ।" : "मुद्रास्फीति व्यवस्थापनमा थप ध्यान दिनुहोस्।"} ` +
    `नियमितता, धैर्य र विविधीकरण नै तपाईंको दीर्घकालीन सफलताको कुञ्जी हुन्।`;

  const verdictLabelEn =
    gBand === "excellent"
      ? "🎉 Excellent Wealth Building Plan"
      : gBand === "onTrack"
        ? "🟢 Strong On-Track Wealth Plan"
        : gBand === "needsImprovement"
          ? "🟡 Wealth Plan Needs Improvement"
          : "🔴 High-Risk Wealth Plan";
  const verdictLabelNe =
    gBand === "excellent"
      ? "उत्कृष्ट सम्पत्ति निर्माण योजना"
      : gBand === "onTrack"
        ? "बलियो ट्र्याकमा रहेको सम्पत्ति योजना"
        : gBand === "needsImprovement"
          ? "सम्पत्ति योजनामा सुधार आवश्यक"
          : "उच्च जोखिमयुक्त सम्पत्ति योजना";
  const verdictWhyNe =
    `दीर्घकालीन सम्पत्ति निर्माणको सम्भावना करिब ${probabilityPct}% देखिन्छ। ` +
    `कारण: Wealth Score ${scoreValue}/100, वृद्धि ${result.growthMultiple.toFixed(1)}x, FIRE प्रगति ${trimPct(result.fireCompletion)}, ` +
    `र वास्तविक प्रतिफल ${trimPct(result.realReturnPct)}। ` +
    (gBand === "excellent" || gBand === "onTrack"
      ? "SIP जारी राख्नुहोस् र वार्षिक स्टेप-अप गर्नुहोस्।"
      : "SIP रकम/अवधि बढाएर योजना बलियो बनाउनुहोस्।");

  const chartSeries = result.yearlyRows.map((row) => ({
    year: row.year,
    age: currentAge + row.year,
    invested: row.invested,
    growth: row.profit,
    futureValue: row.nominalValue,
    inflationAdjusted: row.realValue,
  }));

  return {
    hasData,
    currency,
    currentAge,
    plan: {
      monthlyInvestment: result.monthlyInvestment,
      years: result.years,
      annualReturnPct: result.annualReturn,
      inflationPct: result.inflation,
      totalInvested: result.totalInvested,
      futureValue: result.futureValue,
      summaryNe: planSummaryNe,
    },
    score: {
      value: scoreValue,
      band,
      labelEn: scoreLabelEn,
      labelNe: scoreLabelNe,
      whyNe,
      strengthsNe,
      weaknessesNe,
    },
    futureWealth: {
      futureValue: result.futureValue,
      totalInvested: result.totalInvested,
      estimatedProfit: result.totalProfit,
      cagrPct: result.cagrPct,
      growthMultiple: result.growthMultiple,
      explanationNe: futureExplanationNe,
    },
    compoundStoryNe,
    inflation: {
      beatsInflation,
      realReturnPct: result.realReturnPct,
      inflationAdjustedValue: result.inflationAdjustedValue,
      reductionPct: result.inflationReductionPct,
      explanationNe: inflationExplanationNe,
    },
    goal: {
      band: gBand,
      labelEn: goalLabelEn,
      labelNe: goalLabelNe,
      emoji: goalEmoji,
      probabilityPct,
      fireCompletion: result.fireCompletion,
      whyNe: goalWhyNe,
    },
    risks,
    recommendations: recommendations.slice(0, 7),
    journey,
    remaining,
    summaryNe,
    verdict: {
      labelEn: verdictLabelEn,
      labelNe: verdictLabelNe,
      probabilityPct,
      whyNe: verdictWhyNe,
    },
    chartSeries,
  };
}
