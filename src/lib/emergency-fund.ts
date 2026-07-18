/**
 * Emergency Fund projection engine + AI Safety Analysis.
 * Calculation math matches EmergencyFundDashboard (do not diverge).
 */

export type EmergencyRiskProfileKey = "stable" | "moderate" | "high";

export const EMERGENCY_KRW_TO_NPR = 0.1029;

export const EMERGENCY_RISK_PROFILES: Record<
  EmergencyRiskProfileKey,
  { label: string; recommendedMonths: number; bufferPct: number; helper: string }
> = {
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

const MONTHS = ["Now", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"];

export interface EmergencyFundInputs {
  monthlyExpense: number;
  currentFund: number;
  monthlySave: number;
  riskLevel: EmergencyRiskProfileKey;
  /** Assumed annual inflation for AI storytelling (default 5.8%). */
  inflationPct?: number;
}

export interface EmergencyProjectionPoint {
  label: string;
  fund: number;
  target: number;
  readiness: number;
}

export interface EmergencyScenario {
  name: string;
  months: number;
  target: number;
}

export interface EmergencyFundResult {
  monthlyExpense: number;
  currentFund: number;
  monthlySave: number;
  riskLevel: EmergencyRiskProfileKey;
  recommendedMonths: number;
  bufferPct: number;
  recommendedFund: number;
  gap: number;
  runwayMonths: number;
  readiness: number;
  monthsToTarget: number;
  stressRunway: number;
  nextMilestone: number;
  projection: EmergencyProjectionPoint[];
  scenarios: EmergencyScenario[];
  inflationPct: number;
}

export type EfScoreBand = "excellent" | "safe" | "moderate" | "critical";
export type EfTone = "positive" | "warning" | "info";
export type EfRiskLevel = "low" | "moderate" | "high";

export interface EfRecommendation {
  titleNe: string;
  detailNe: string;
  tone: EfTone;
}

export interface EfRiskItem {
  id: "income" | "job" | "family" | "preparedness" | "liquidity";
  labelEn: string;
  labelNe: string;
  level: EfRiskLevel;
  emoji: string;
  explanationNe: string;
}

export interface EfShockScenario {
  id: string;
  labelEn: string;
  labelNe: string;
  monthsLasting: number;
  expenseAssumed: number;
  explanationNe: string;
}

export interface EfTimelineNode {
  labelEn: string;
  labelNe: string;
  months: number;
  status: "done" | "current" | "target" | "strong";
}

export interface EmergencyFundSafetyAnalysis {
  hasData: boolean;
  plan: {
    currentFund: number;
    monthlyExpense: number;
    monthsCovered: number;
    targetFund: number;
    recommendedMonths: number;
    riskLabel: string;
    summaryNe: string;
  };
  score: {
    value: number;
    band: EfScoreBand;
    labelEn: string;
    labelNe: string;
    emoji: string;
    whyNe: string;
  };
  coverage: {
    currentMonths: number;
    recommendedMonths: number;
    shortfallMonths: number;
    surplusMonths: number;
    gapAmount: number;
    explanationNe: string;
  };
  shocks: EfShockScenario[];
  inflation: {
    inflationPct: number;
    futurePurchasingPower: number;
    explanationNe: string[];
  };
  risks: EfRiskItem[];
  overallRisk: {
    level: EfRiskLevel;
    emoji: string;
    labelNe: string;
    explanationNe: string;
  };
  recommendations: EfRecommendation[];
  timeline: EfTimelineNode[];
  safetyStoryNe: string[];
  summaryNe: string;
  verdict: {
    labelEn: string;
    labelNe: string;
    probabilityPct: number;
    whyNe: string;
  };
  chartGrowth: Array<{ label: string; fund: number; target: number }>;
  chartCoverage: Array<{ label: string; months: number }>;
  chartInflation: Array<{ year: number; nominal: number; real: number }>;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function trimPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function trimMo(n: number): string {
  return `${(Math.round(n * 10) / 10).toFixed(n >= 10 ? 0 : 1)}`;
}

export function formatEmergencyNpr(value: number): string {
  return new Intl.NumberFormat("en-NP", {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "NPR",
  }).format(Math.round(value));
}

export function formatEmergencyMonths(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mo`;
}

/**
 * Full emergency-fund projection — parity with EmergencyFundDashboard analytics.
 */
export function runEmergencyFundProjection(inputs: EmergencyFundInputs): EmergencyFundResult {
  const monthlyExpense = Math.max(0, inputs.monthlyExpense);
  const currentFund = Math.max(0, inputs.currentFund);
  const monthlySave = Math.max(0, inputs.monthlySave);
  const riskLevel = inputs.riskLevel;
  const risk = EMERGENCY_RISK_PROFILES[riskLevel];
  const inflationPct = clamp(inputs.inflationPct ?? 5.8, 0, 40);

  const recommendedFund = monthlyExpense * risk.recommendedMonths * (1 + risk.bufferPct);
  const gap = Math.max(0, recommendedFund - currentFund);
  const runwayMonths = monthlyExpense > 0 ? currentFund / monthlyExpense : 0;
  const readiness = recommendedFund > 0 ? Math.min(100, (currentFund / recommendedFund) * 100) : 100;
  const monthsToTarget = monthlySave > 0 ? Math.ceil(gap / monthlySave) : gap > 0 ? Infinity : 0;
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

  const scenarios: EmergencyScenario[] = [
    { name: "Job loss", months: runwayMonths, target: risk.recommendedMonths },
    { name: "Medical", months: currentFund / Math.max(1, monthlyExpense + 35_000), target: 4 },
    { name: "Return buffer", months: stressRunway, target: risk.recommendedMonths },
  ];

  return {
    monthlyExpense,
    currentFund,
    monthlySave,
    riskLevel,
    recommendedMonths: risk.recommendedMonths,
    bufferPct: risk.bufferPct,
    recommendedFund,
    gap,
    runwayMonths,
    readiness,
    monthsToTarget: Number.isFinite(monthsToTarget) ? monthsToTarget : 0,
    stressRunway,
    nextMilestone,
    projection,
    scenarios,
    inflationPct,
  };
}

function scoreBand(score: number): EfScoreBand {
  if (score >= 90) return "excellent";
  if (score >= 70) return "safe";
  if (score >= 45) return "moderate";
  return "critical";
}

function riskEmoji(level: EfRiskLevel): string {
  return level === "low" ? "🟢" : level === "moderate" ? "🟡" : "🔴";
}

function buildSafetyScore(result: EmergencyFundResult): number {
  const coverageRatio =
    result.recommendedMonths > 0 ? clamp(result.runwayMonths / result.recommendedMonths, 0, 1.4) : 0;
  const readiness = clamp(result.readiness / 100, 0, 1);
  const gapPenalty = result.recommendedFund > 0 ? clamp(1 - result.gap / result.recommendedFund, 0, 1) : 1;
  const stress = result.recommendedMonths > 0 ? clamp(result.stressRunway / result.recommendedMonths, 0, 1) : 0;
  return Math.round(
    100 * clamp(0.4 * Math.min(1, coverageRatio) + 0.3 * readiness + 0.15 * gapPenalty + 0.15 * stress, 0, 1),
  );
}

/**
 * Nepali-first AI Emergency Fund Safety Analysis from projection results.
 */
export function buildEmergencyFundSafetyAnalysis(
  result: EmergencyFundResult,
): EmergencyFundSafetyAnalysis {
  const fmt = formatEmergencyNpr;
  const hasData = result.monthlyExpense > 0;
  const scoreValue = buildSafetyScore(result);
  const band = scoreBand(scoreValue);
  const riskProfile = EMERGENCY_RISK_PROFILES[result.riskLevel];

  const shortfallMonths = Math.max(0, result.recommendedMonths - result.runwayMonths);
  const surplusMonths = Math.max(0, result.runwayMonths - result.recommendedMonths);

  const planSummaryNe =
    `तपाईंको हालको आपतकालीन कोष ${fmt(result.currentFund)} छ र मासिक आवश्यक खर्च करिब ${fmt(result.monthlyExpense)} छ। ` +
    `यसले करिब ${trimMo(result.runwayMonths)} महिना धान्छ। ` +
    `तपाईंको प्रोफाइल (${riskProfile.label}) अनुसार लक्ष्य करिब ${fmt(result.recommendedFund)} ` +
    `(${result.recommendedMonths} महिना + बफर) हो।`;

  const scoreLabelEn =
    band === "excellent" ? "Excellent" : band === "safe" ? "Safe" : band === "moderate" ? "Moderate" : "Critical";
  const scoreLabelNe =
    band === "excellent" ? "उत्कृष्ट" : band === "safe" ? "सुरक्षित" : band === "moderate" ? "मध्यम" : "गम्भीर";
  const scoreEmoji =
    band === "excellent" || band === "safe" ? "🟢" : band === "moderate" ? "🟡" : "🔴";
  const whyNe =
    band === "excellent"
      ? `तपाईंको Emergency Safety Score ${scoreValue}/100 छ। लक्ष्य कभरेज पूरा भएको/नजिक भएकाले परिवारको सुरक्षा बलियो छ।`
      : band === "safe"
        ? `स्कोर ${scoreValue}/100 छ। आधारभूत सुरक्षा छ — थोरै थप बचतले अझ बलियो बनाउँछ।`
        : band === "moderate"
          ? `स्कोर ${scoreValue}/100 छ। केही सुरक्षा छ तर लक्ष्य (${result.recommendedMonths} महिना) पुग्न अझ बचत चाहिन्छ।`
          : `स्कोर ${scoreValue}/100 छ। आपतकालीन कोष अपुग देखिन्छ — प्राथमिकताका साथ बचत बढाउनुहोस्।`;

  const coverageExplanationNe =
    shortfallMonths > 0.2
      ? `अहिले ${trimMo(result.runwayMonths)} महिना कभरेज छ, सिफारिस ${result.recommendedMonths} महिना हो। ` +
        `करिब ${trimMo(shortfallMonths)} महिनाको कमी छ (रकममा करिब ${fmt(result.gap)})। ` +
        `हालको गतिमा लक्ष्य पुग्न करिब ${result.monthsToTarget || "—"} महिना लाग्न सक्छ।`
      : `तपाईं सिफारिस कभरेज पूरा गर्नुभएको/नजिक हुनुहुन्छ (${trimMo(result.runwayMonths)} महिना)। ` +
        `यो स्तरले अचानक खर्च र आय अवरोधमा आर्थिक स्थिरता दिन्छ।`;

  const shocks: EfShockScenario[] = [
    {
      id: "job-loss",
      labelEn: "Job loss",
      labelNe: "जागिर गुम्नु",
      monthsLasting: result.runwayMonths,
      expenseAssumed: result.monthlyExpense,
      explanationNe: `जागिर गुमेमा हालको कोषले करिब ${trimMo(result.runwayMonths)} महिना आधारभूत खर्च धान्न सक्छ।`,
    },
    {
      id: "medical",
      labelEn: "Medical emergency",
      labelNe: "स्वास्थ्य आपतकाल",
      monthsLasting: result.currentFund / Math.max(1, result.monthlyExpense + 35_000),
      expenseAssumed: result.monthlyExpense + 35_000,
      explanationNe: `स्वास्थ्य खर्च थपिएमा कोष छिटो घट्छ — करिब ${trimMo(result.currentFund / Math.max(1, result.monthlyExpense + 35_000))} महिना टिक्न सक्छ।`,
    },
    {
      id: "family",
      labelEn: "Family emergency",
      labelNe: "पारिवारिक आपतकाल",
      monthsLasting: result.currentFund / Math.max(1, result.monthlyExpense + 25_000),
      expenseAssumed: result.monthlyExpense + 25_000,
      explanationNe: `परिवारको अचानक सहयोग चाहिँदा करिब ${trimMo(result.currentFund / Math.max(1, result.monthlyExpense + 25_000))} महिना धान्न सक्ने अनुमान छ।`,
    },
    {
      id: "travel",
      labelEn: "Unexpected travel",
      labelNe: "अचानक यात्रा",
      monthsLasting: result.currentFund / Math.max(1, result.monthlyExpense + 20_000),
      expenseAssumed: result.monthlyExpense + 20_000,
      explanationNe: `अपेक्षित यात्रा/टिकट खर्चसहित कोष करिब ${trimMo(result.currentFund / Math.max(1, result.monthlyExpense + 20_000))} महिना टिक्न सक्छ।`,
    },
    {
      id: "income",
      labelEn: "Income interruption",
      labelNe: "आय अवरोध",
      monthsLasting: result.stressRunway,
      expenseAssumed: result.monthlyExpense * 1.25,
      explanationNe: `आय रोकिएर खर्च 25% बढ्दा पनि कोष करिब ${trimMo(result.stressRunway)} महिना धान्न सक्छ।`,
    },
  ];

  const realPowerFactor = Math.pow(1 + result.inflationPct / 100, 3);
  const futurePurchasingPower = result.currentFund / realPowerFactor;
  const inflationExplanationNe = [
    `मुद्रास्फीति ${trimPct(result.inflationPct)} मान्दा आजको ${fmt(result.currentFund)} को किन्ने क्षमता ३ वर्षमा करिब ${fmt(futurePurchasingPower)} बराबर मात्र रहन सक्छ।`,
    "त्यसैले आपतकालीन कोषलाई वर्षमा कम्तीमा एक पटक समीक्षा गरी खर्च र मुद्रास्फीतिअनुसार अपडेट गर्नुपर्छ।",
    "तलब बढ्दा वा भाडा/खर्च बढ्दा लक्ष्य महिनाको रकम पनि बढाउनुहोस्।",
  ];

  const incomeLevel: EfRiskLevel =
    result.runwayMonths >= result.recommendedMonths ? "low" : result.runwayMonths >= result.recommendedMonths * 0.6 ? "moderate" : "high";
  const jobLevel: EfRiskLevel =
    result.riskLevel === "stable" ? "low" : result.riskLevel === "moderate" ? "moderate" : "high";
  const familyLevel: EfRiskLevel =
    result.riskLevel === "stable" ? "low" : result.riskLevel === "moderate" ? "moderate" : "high";
  const prepLevel: EfRiskLevel =
    result.readiness >= 85 ? "low" : result.readiness >= 50 ? "moderate" : "high";
  const liquidityLevel: EfRiskLevel =
    result.currentFund > 0 && result.runwayMonths >= 1 ? (result.runwayMonths >= 3 ? "low" : "moderate") : "high";

  const risks: EfRiskItem[] = [
    {
      id: "income",
      labelEn: "Income Risk",
      labelNe: "आय जोखिम",
      level: incomeLevel,
      emoji: riskEmoji(incomeLevel),
      explanationNe:
        incomeLevel === "high"
          ? "आय रोकिएमा हालको कोष छिटो सकिन सक्छ — कभरेज बढाउनुहोस्।"
          : incomeLevel === "moderate"
            ? "केही महिनाको सुरक्षा छ तर लामो अवरोधका लागि अझ बफर चाहिन्छ।"
            : "आय अवरोधका लागि पर्याप्त महिनाको कभरेज देखिन्छ।",
    },
    {
      id: "job",
      labelEn: "Job Stability",
      labelNe: "जागिर स्थिरता",
      level: jobLevel,
      emoji: riskEmoji(jobLevel),
      explanationNe:
        jobLevel === "high"
          ? "Visa/रिटर्न वा असुरक्षित जागिर प्रोफाइलमा ९–१२ महिनाको कोष सिफारिस हुन्छ।"
          : jobLevel === "moderate"
            ? "परिवार समर्थन/रेमिटेन्स प्रोफाइलमा मध्यम बफर राख्नु राम्रो हो।"
            : "स्थिर जागिरमा ६ महिनाको कोष सामान्यतया पर्याप्त आधार हो।",
    },
    {
      id: "family",
      labelEn: "Family Risk",
      labelNe: "पारिवारिक जोखिम",
      level: familyLevel,
      emoji: riskEmoji(familyLevel),
      explanationNe: "परिवारको अचानक खर्च आउन सक्छ — छुट्टै तरल रकम राख्दा ऋणबाट जोगिन सकिन्छ।",
    },
    {
      id: "preparedness",
      labelEn: "Emergency Preparedness",
      labelNe: "आपतकालीन तयारी",
      level: prepLevel,
      emoji: riskEmoji(prepLevel),
      explanationNe: `तपाईंको readiness करिब ${Math.round(result.readiness)}% छ — लक्ष्य पूरा नभएसम्म मासिक टप-अप जारी राख्नुहोस्।`,
    },
    {
      id: "liquidity",
      labelEn: "Liquidity Risk",
      labelNe: "तरलता जोखिम",
      level: liquidityLevel,
      emoji: riskEmoji(liquidityLevel),
      explanationNe: "आपतकालीन पैसा सेयर/लामो लगानीमा होइन — बैंक/वालेट जस्ता तत्काल पहुँच हुने ठाउँमा राख्नुहोस्।",
    },
  ];

  const highCount = risks.filter((r) => r.level === "high").length;
  const overallLevel: EfRiskLevel = highCount >= 2 ? "high" : highCount === 1 || risks.some((r) => r.level === "moderate") ? "moderate" : "low";
  const overallRisk = {
    level: overallLevel,
    emoji: riskEmoji(overallLevel),
    labelNe: overallLevel === "low" ? "न्यून जोखिम" : overallLevel === "moderate" ? "मध्यम जोखिम" : "उच्च जोखिम",
    explanationNe:
      overallLevel === "low"
        ? "समग्रमा आपतकालीन सुरक्षा राम्रो छ — नियमित समीक्षा पर्याप्त हुन्छ।"
        : overallLevel === "moderate"
          ? "केही जोखिम बाँकी छ — कभरेज र तरलता सुधार्दा सुरक्षा बढ्छ।"
          : "समग्र जोखिम उच्च छ — आपतकालीन कोष प्राथमिकतामा राख्नुहोस्।",
  };

  const recommendations: EfRecommendation[] = [];
  if (result.gap > 0) {
    recommendations.push({
      titleNe: "आपतकालीन बचत बढाउनुहोस्",
      detailNe: `लक्ष्यसम्म करिब ${fmt(result.gap)} बाँकी छ। तलब आएपछि पहिले सुरक्षा कोषमा रकम छुट्याउनुहोस्।`,
      tone: "warning",
    });
  }
  recommendations.push({
    titleNe: "तरल खातामा राख्नुहोस्",
    detailNe: "आपतकालीन पैसा बचत खाता, डिजिटल वालेट वा तत्काल निकाल्न मिल्ने बैंकमा राख्नुहोस्।",
    tone: "info",
  });
  recommendations.push({
    titleNe: "आपतकालीन पैसा लगानी नगर्नुहोस्",
    detailNe: "सेयर/क्रिप्टोमा राख्दा बजार खराब हुँदा आवश्यक बेला पैसा नहुन सक्छ।",
    tone: "warning",
  });
  recommendations.push({
    titleNe: "हरेक वर्ष समीक्षा गर्नुहोस्",
    detailNe: "खर्च र मुद्रास्फीति बढ्दा लक्ष्य महिनाको रकम पनि अपडेट गर्नुहोस्।",
    tone: "info",
  });
  recommendations.push({
    titleNe: "छुट्टै आपतकालीन खाता बनाउनुहोस्",
    detailNe: "दैनिक खर्चबाट अलग खाताले अनावश्यक खर्च र भ्रम घटाउँछ।",
    tone: "positive",
  });
  if (result.monthlySave > 0 && result.gap > 0) {
    recommendations.push({
      titleNe: "मासिक टप-अप जारी राख्नुहोस्",
      detailNe: `हाल ${fmt(result.monthlySave)}/महिना बचत गर्दा लक्ष्य नजिक पुग्न मद्दत गर्छ।`,
      tone: "positive",
    });
  }
  while (recommendations.length < 5) {
    recommendations.push({
      titleNe: "२ हप्ताको नगद छुट्याउनुहोस्",
      detailNe: "पहिलो ७२ घण्टाका लागि तत्काल पहुँच हुने सानो नगद/वालेट बफर राख्नुहोस्।",
      tone: "info",
    });
  }

  const timeline: EfTimelineNode[] = [
    { labelEn: "Today", labelNe: "आज", months: result.runwayMonths, status: "current" },
    {
      labelEn: "3 Months Covered",
      labelNe: "३ महिना कभरेज",
      months: 3,
      status: result.runwayMonths >= 3 ? "done" : "target",
    },
    {
      labelEn: `${result.recommendedMonths} Months Target`,
      labelNe: `${result.recommendedMonths} महिना लक्ष्य`,
      months: result.recommendedMonths,
      status: result.runwayMonths >= result.recommendedMonths ? "done" : "target",
    },
    {
      labelEn: "12 Months Strong Protection",
      labelNe: "१२ महिना बलियो सुरक्षा",
      months: 12,
      status: result.runwayMonths >= 12 ? "done" : "strong",
    },
  ];

  const safetyStoryNe = [
    "आपतकालीन कोष भनेको अचानक संकट आउँदा परिवार जोगाउने सुरक्षा कवच हो।",
    "यो कोषले जागिर गुम्दा, बिरामी हुँदा वा घर फर्कनुपर्दा ऋण लिनुपर्ने दबाब घटाउँछ।",
    "सुरक्षा कोष भएपछि दीर्घकालीन लगानी (SIP/FIRE) लाई बेमौका बेच्नुपर्दैन — FIRE लक्ष्य पनि सुरक्षित रहन्छ।",
    "सानो नियमित बचतबाट सुरु गरे पनि समयसँगै मनको शान्ति र आर्थिक स्वतन्त्रता दुवै बढ्छ।",
  ];

  const summaryNe =
    `${scoreEmoji} तपाईंको आपतकालीन सुरक्षा अहिले ${scoreLabelNe} श्रेणीमा छ (स्कोर ${scoreValue}/100)। ` +
    `हाल ${fmt(result.currentFund)} ले करिब ${trimMo(result.runwayMonths)} महिना खर्च धान्छ। ` +
    (result.gap > 0
      ? `लक्ष्य ${fmt(result.recommendedFund)} पुग्न करिब ${fmt(result.gap)} थप बचत आवश्यक छ। `
      : `तपाईं लक्ष्य नजिक/पूरा अवस्थामा हुनुहुन्छ। `) +
    `तरल खातामा राख्नुहोस्, लगानी नगर्नुहोस्, र वर्षमा एक पटक समीक्षा गर्नुहोस्।`;

  const probabilityPct = Math.round(
    clamp(0.55 * scoreValue + 0.25 * result.readiness + 0.2 * Math.min(100, (result.runwayMonths / 12) * 100), 8, 98),
  );

  const verdictLabelEn =
    band === "excellent"
      ? "🛡️ Excellent Financial Safety"
      : band === "safe"
        ? "🛡️ Safe Emergency Protection"
        : band === "moderate"
          ? "⚠ Moderate Protection"
          : "🚨 Emergency Fund Needed";
  const verdictLabelNe =
    band === "excellent"
      ? "उत्कृष्ट आर्थिक सुरक्षा"
      : band === "safe"
        ? "सुरक्षित आपतकालीन सुरक्षा"
        : band === "moderate"
          ? "मध्यम सुरक्षा"
          : "आपतकालीन कोष आवश्यक";
  const verdictWhyNe =
    `समग्र सुरक्षा सम्भावना करिब ${probabilityPct}% देखिन्छ। ` +
    `कारण: Safety Score ${scoreValue}/100, कभरेज ${trimMo(result.runwayMonths)} महिना, readiness ${Math.round(result.readiness)}%, ` +
    `र प्रोफाइल लक्ष्य ${result.recommendedMonths} महिना। ` +
    (band === "excellent" || band === "safe"
      ? "कोषलाई तरल राख्दै वार्षिक अपडेट गर्नुहोस्।"
      : "मासिक टप-अप बढाएर लक्ष्य महिना छिटो पूरा गर्नुहोस्।");

  const chartInflation = [0, 1, 2, 3, 4, 5].map((year) => {
    const factor = Math.pow(1 + result.inflationPct / 100, year);
    return {
      year,
      nominal: result.currentFund,
      real: result.currentFund / factor,
    };
  });

  return {
    hasData,
    plan: {
      currentFund: result.currentFund,
      monthlyExpense: result.monthlyExpense,
      monthsCovered: result.runwayMonths,
      targetFund: result.recommendedFund,
      recommendedMonths: result.recommendedMonths,
      riskLabel: riskProfile.label,
      summaryNe: planSummaryNe,
    },
    score: {
      value: scoreValue,
      band,
      labelEn: scoreLabelEn,
      labelNe: scoreLabelNe,
      emoji: scoreEmoji,
      whyNe,
    },
    coverage: {
      currentMonths: result.runwayMonths,
      recommendedMonths: result.recommendedMonths,
      shortfallMonths,
      surplusMonths,
      gapAmount: result.gap,
      explanationNe: coverageExplanationNe,
    },
    shocks,
    inflation: {
      inflationPct: result.inflationPct,
      futurePurchasingPower,
      explanationNe: inflationExplanationNe,
    },
    risks,
    overallRisk,
    recommendations: recommendations.slice(0, 7),
    timeline,
    safetyStoryNe,
    summaryNe,
    verdict: {
      labelEn: verdictLabelEn,
      labelNe: verdictLabelNe,
      probabilityPct,
      whyNe: verdictWhyNe,
    },
    chartGrowth: result.projection.map((p) => ({ label: p.label, fund: p.fund, target: p.target })),
    chartCoverage: [
      { label: "Current", months: result.runwayMonths },
      { label: "Recommended", months: result.recommendedMonths },
      { label: "Stress", months: result.stressRunway },
    ],
    chartInflation,
  };
}
