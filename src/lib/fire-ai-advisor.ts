import type {
  FireProjectionParams,
  FireProjectionResult,
  WealthLifecycleResult,
  WealthSimulationParams,
} from "@/lib/fire-calculator-model";
import { getRemainingWealthNpr } from "@/lib/fire-calculator-model";

export type FireAdvisorTone = "positive" | "warning" | "info";
export type FireAdvisorScoreBand = "excellent" | "good" | "moderate" | "risky";
export type FireAdvisorRiskLevel = "low" | "moderate" | "high";

export interface FireAdvisorRecommendation {
  titleNe: string;
  detailNe: string;
  tone: FireAdvisorTone;
}

export interface FireAdvisorRiskItem {
  id: "market" | "inflation" | "longevity" | "withdrawal";
  labelEn: string;
  labelNe: string;
  level: FireAdvisorRiskLevel;
  emoji: string;
  explanationNe: string;
}

export interface FireFinancialAdvisorAnalysis {
  hasData: boolean;
  plan: {
    currentSavings: number;
    monthlySavings: number;
    currentAge: number;
    targetRetirementAge: number;
    annualReturnPct: number;
    inflationPct: number;
    safeWithdrawalRatePct: number;
    summaryNe: string;
  };
  distance: {
    fireAge: number;
    yearsRemaining: number;
    progressPct: number;
    aheadOfPlan: boolean | null;
    explanationNe: string;
  };
  score: {
    value: number;
    band: FireAdvisorScoreBand;
    labelEn: string;
    labelNe: string;
    whyNe: string;
    strengthsNe: string[];
    weaknessesNe: string[];
  };
  passiveIncome: {
    expectedMonthly: number;
    requiredMonthly: number;
    sufficient: boolean;
    coveragePct: number;
    explanationNe: string;
  };
  wealthGrowth: {
    storyNe: string[];
  };
  remaining: {
    estimatedWealth: number;
    likelyRemain: boolean;
    canLeaveToFamily: boolean;
    explanationNe: string;
    bulletsNe: string[];
  };
  inflation: {
    beatsInflation: boolean;
    realReturnPct: number;
    explanationNe: string[];
  };
  risks: FireAdvisorRiskItem[];
  recommendations: FireAdvisorRecommendation[];
  journeyStoryNe: string;
  summaryNe: string;
  verdict: {
    labelEn: string;
    labelNe: string;
    probabilityPct: number;
    whyNe: string;
  };
}

function fmt(n: number): string {
  const abs = Math.abs(Math.round(n));
  return `रु ${abs.toLocaleString("en-IN")}`;
}

function trimPct(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function scoreBand(score: number): FireAdvisorScoreBand {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "moderate";
  return "risky";
}

function riskEmoji(level: FireAdvisorRiskLevel): string {
  return level === "low" ? "🟢" : level === "moderate" ? "🟡" : "🔴";
}

/**
 * Personalized Nepali FIRE advisor narrative from calculator results.
 * Recalculates whenever inputs/results change (call via useMemo in UI).
 */
export function buildFireFinancialAdvisorAnalysis(
  result: FireProjectionResult,
  wealthResult: WealthLifecycleResult,
  projection: FireProjectionParams,
  wealthParams: WealthSimulationParams,
  horizonGrowthPct: number | null,
): FireFinancialAdvisorAnalysis {
  const currentSavings = projection.currentSavingsNpr;
  const monthlySavings = projection.monthlySavingsNpr;
  const currentAge = projection.currentAge;
  const annualReturnPct = projection.annualReturnPct;
  const monthlyExpense = projection.monthlyExpenseNpr;
  const inflationPct = wealthParams.expenseInflationAnnualPct;
  const swrPct = wealthParams.safeWithdrawalRatePct;

  const hasData = (currentSavings > 0 || monthlySavings > 0) && monthlyExpense > 0;

  const fireAge = Math.round(result.fireAge);
  const yearsRemaining = Math.max(0, result.yearsToFire);
  const progressPct = Math.max(0, Math.min(100, result.progressPct));
  const projectedCorpus = result.projectedCorpusNpr;
  const requiredCorpus = result.requiredCorpusNpr;

  const expectedPassiveMonthly = (projectedCorpus * (swrPct / 100)) / 12;
  const requiredMonthly = monthlyExpense;
  const coveragePct =
    requiredMonthly > 0
      ? Math.round(Math.min(200, (expectedPassiveMonthly / requiredMonthly) * 100))
      : 0;
  const sufficient = expectedPassiveMonthly >= requiredMonthly * 0.95;

  const realReturnPct = annualReturnPct - inflationPct;
  const beatsInflation = realReturnPct > 0;

  const progressRatio = requiredCorpus > 0 ? Math.min(1, projectedCorpus / requiredCorpus) : 0;
  const savingsMomentum = clamp01((horizonGrowthPct ?? 0) / 120);
  const solvencyBonus = wealthResult.depletionAge === null ? 0.1 : 0;
  const shortfallPenalty = wealthResult.perpetualShortfall ? 0.12 : 0;
  const yearsFactor = yearsRemaining > 0 ? Math.max(0, 1 - yearsRemaining / 35) : 1;

  const readinessScore = Math.round(
    100 *
      clamp01(
        0.55 * progressRatio +
          0.25 * savingsMomentum +
          0.1 * yearsFactor +
          solvencyBonus -
          shortfallPenalty,
      ),
  );

  const probabilityPct = Math.round(
    100 *
      clamp01(
        0.6 * progressRatio +
          0.25 * (yearsRemaining > 0 ? Math.max(0, 1 - yearsRemaining / 40) : 1) +
          0.15 * (solvencyBonus > 0 ? 1 : 0.6),
      ),
  );

  const band = scoreBand(readinessScore);
  const labelNe =
    band === "excellent" ? "उत्कृष्ट" : band === "good" ? "राम्रो" : band === "moderate" ? "मध्यम" : "जोखिमपूर्ण";
  const labelEn =
    band === "excellent"
      ? "Excellent Progress"
      : band === "good"
        ? "Good Progress"
        : band === "moderate"
          ? "Moderate Progress"
          : "Needs Attention";

  // Expected progress heuristic: ~2–3% of corpus per year of age toward FIRE before mid-career
  const expectedProgressAtAge = Math.min(100, Math.max(5, (currentAge - 22) * 2.2));
  const aheadOfPlan: boolean | null = hasData ? progressPct >= expectedProgressAtAge * 0.85 : null;

  const planSummaryNe =
    `तपाईं अहिले ${currentAge} वर्षको हुनुहुन्छ र हाल ${fmt(currentSavings)} बचत गर्नुभएको छ। ` +
    `हरेक महिना ${fmt(monthlySavings)} बचत गर्ने योजना छ। ` +
    `लगानीले वार्षिक ${trimPct(annualReturnPct)} प्रतिफल दिने, मुद्रास्फीति ${trimPct(inflationPct)} रहने, ` +
    `र सुरक्षित निकासी दर ${trimPct(swrPct)} मानिएको छ। ` +
    `यो योजना अनुसार करिब ${fireAge} वर्षको उमेरमा FIRE लक्ष्य सम्भव देखिन्छ।`;

  const distanceExplanationNe =
    yearsRemaining <= 0
      ? `तपाईंको हालको बचत र खर्चका आधारमा FIRE लक्ष्य लगभग पूरा भइसकेको देखिन्छ। वर्तमान प्रगति करिब ${progressPct}% छ।`
      : aheadOfPlan
        ? `अनुमानित FIRE उमेर करिब ${fireAge} वर्ष हो — अझै करिब ${yearsRemaining.toFixed(1)} वर्ष बाँकी छ। ` +
          `हालको प्रगति ${progressPct}% छ, जुन उमेरअनुसारको अपेक्षित बाटोभन्दा अगाडि वा नजिकै देखिन्छ।`
        : `अनुमानित FIRE उमेर करिब ${fireAge} वर्ष हो — अझै करिब ${yearsRemaining.toFixed(1)} वर्ष बाँकी छ। ` +
          `हालको प्रगति ${progressPct}% छ। बचत बढाउँदा वा खर्च घटाउँदा लक्ष्य नजिक आउँछ।`;

  const whyScoreNe =
    band === "excellent"
      ? `तपाईंले ${readinessScore}/100 स्कोर पाउनुभयो किनभने लक्ष्य कोषको तुलनामा प्रक्षेपित सम्पत्ति बलियो छ, बचतको गति राम्रो छ, र रिटायरमेन्टपछि पनि पैसा टिक्ने सम्भावना उच्च छ।`
      : band === "good"
        ? `तपाईंले ${readinessScore}/100 स्कोर पाउनुभयो किनभने योजना ठिकठाक बाटोमा छ — बचत र लगानीले FIRE नजिक ल्याइरहेका छन्, तर अझ सुधारको ठाउँ छ।`
        : band === "moderate"
          ? `तपाईंले ${readinessScore}/100 स्कोर पाउनुभयो किनभने प्रगति मध्यम छ। बचत बढाउने, खर्च घटाउने वा लगानी अवधिको समीक्षा गर्दा स्कोर माथि जान सक्छ।`
          : `तपाईंले ${readinessScore}/100 स्कोर पाउनुभयो किनभने लक्ष्य कोषसम्मको दूरी ठूलो छ वा दीर्घकालीन दिगोपन कमजोर देखिन्छ। योजनामा सुधार आवश्यक छ।`;

  const strengthsNe: string[] = [];
  const weaknessesNe: string[] = [];
  if (monthlySavings > 0) strengthsNe.push("नियमित मासिक बचतले चक्रवृद्धि ब्याजलाई बलियो बनाउँछ।");
  if (currentSavings > 0) strengthsNe.push("हालको बचतले तपाईंलाई शून्यबाट सुरु गर्नुपर्दैन।");
  if (beatsInflation) strengthsNe.push("लगानी प्रतिफल मुद्रास्फीतिभन्दा माथि छ — वास्तविक सम्पत्ति बढ्न सक्छ।");
  if (wealthResult.depletionAge === null) strengthsNe.push("सिमुलेशन अनुसार रिटायरमेन्टपछि पनि पैसा टिक्ने सम्भावना छ।");
  if (sufficient) strengthsNe.push("अपेक्षित निष्क्रिय आम्दानी खर्च धान्न नजिक वा पर्याप्त देखिन्छ।");
  if (strengthsNe.length === 0) strengthsNe.push("तपाईंले FIRE योजना सुरु गर्नुभएको छ — यो नै पहिलो महत्त्वपूर्ण कदम हो।");

  if (progressPct < 40) weaknessesNe.push("लक्षित कोषको तुलनामा हालको प्रगति अझै कम छ।");
  if (yearsRemaining > 25) weaknessesNe.push("FIRE सम्मको बाटो लामो देखिन्छ — बचत दर बढाउँदा छोट्याउन सकिन्छ।");
  if (!beatsInflation) weaknessesNe.push("प्रतिफल मुद्रास्फीतिभन्दा कम/बराबर भए वास्तविक क्रयशक्ति घट्न सक्छ।");
  if (wealthResult.depletionAge !== null) weaknessesNe.push("मोडेल अनुसार सम्पत्ति पछि सकिन सक्ने जोखिम देखिन्छ।");
  if (!sufficient) weaknessesNe.push("निष्क्रिय आम्दानी अहिले आवश्यक खर्चभन्दा कम देखिन्छ।");
  if (wealthResult.perpetualShortfall) weaknessesNe.push("सुरक्षित निकासी सीमाभित्र खर्च नअटाउने सम्भावना छ।");
  if (weaknessesNe.length === 0) weaknessesNe.push("ठूलो कमजोरी देखिएन — वार्षिक समीक्षा गर्दै योजना जोगाउनुहोस्।");

  const passiveExplanationNe = sufficient
    ? `FIRE पुग्दा लगानीबाट महिनामा करिब ${fmt(expectedPassiveMonthly)} निष्क्रिय आम्दानी आउने अनुमान छ, ` +
      `जबकि तपाईंको आवश्यक खर्च ${fmt(requiredMonthly)} छ। आम्दानी खर्च धान्न पर्याप्त देखिन्छ (कभरेज करिब ${coveragePct}%)।`
    : `FIRE पुग्दा लगानीबाट महिनामा करिब ${fmt(expectedPassiveMonthly)} निष्क्रिय आम्दानी आउने अनुमान छ, ` +
      `तर आवश्यक खर्च ${fmt(requiredMonthly)} छ। अहिले आम्दानी अपर्याप्त देखिन्छ (कभरेज करिब ${coveragePct}%) — ` +
      `बचत बढाउने वा खर्च घटाउने विचार गर्नुहोस्।`;

  const totalMonthlyContribYears = yearsRemaining > 0 ? yearsRemaining : 1;
  const contribEstimate = monthlySavings * 12 * totalMonthlyContribYears;
  const wealthGrowthStoryNe = [
    `आजको ${fmt(currentSavings)} बचत समयसँगै लगानीमा बढ्दै जान्छ। चक्रवृद्धि ब्याजले प्रतिफलमाथि पनि प्रतिफल थप्दै सम्पत्ति बढाउँछ।`,
    `हरेक महिना ${fmt(monthlySavings)} थप्दा करिब ${yearsRemaining.toFixed(1) || "केही"} वर्षमा थप बचत मात्रै पनि करिब ${fmt(contribEstimate)} हाराहारी पुग्न सक्छ — यसमा ब्याज अझ थपिन्छ।`,
    `जति लामो समय लगानी रहन्छ, चक्रवृद्धि उति बलियो हुन्छ। सुरुका वर्षमा बृद्धि सुस्त देखिए पनि पछिल्ला वर्षमा सम्पत्ति छिटो बढ्ने प्रवृत्ति हुन्छ।`,
  ];

  const remainingAtHorizon = getRemainingWealthNpr(wealthResult);
  const likelyRemain = wealthResult.depletionAge === null && remainingAtHorizon > 0;
  const canLeaveToFamily = likelyRemain && remainingAtHorizon >= requiredCorpus * 0.2;

  const remainingExplanationNe = likelyRemain
    ? `अनुमानित बाँकी सम्पत्ति करिब ${fmt(remainingAtHorizon)} छ। रिटायरमेन्टपछि पनि पैसा सकिने सम्भावना कम देखिन्छ` +
      (canLeaveToFamily ? " र परिवारका लागि सम्पत्ति छोड्न सकिने ठाउँ पनि देखिन्छ।" : "।")
    : wealthResult.depletionAge !== null
      ? `मोडेल अनुसार सम्पत्ति करिब ${Math.round(wealthResult.depletionAge)} वर्षको उमेरतिर सकिन सक्छ। ` +
        `त्यसैले बचत बढाउने, खर्च घटाउने वा निकासी दर समायोजन गर्नु उपयुक्त हुन्छ।`
      : `हालको इनपुटमा बाँकी सम्पत्तिको प्रक्षेपण स्पष्ट छैन। बचत र खर्च हालेर फेरि हेर्नुहोस्।`;

  const remainingBulletsNe = likelyRemain
    ? [
        "रिटायरमेन्टपछि पनि लगानीबाट आम्दानी चल्ने सम्भावना छ।",
        canLeaveToFamily
          ? "परिवार वा उत्तराधिकारका लागि सम्पत्ति बाँकी रहन सक्छ।"
          : "बाँकी रकम मध्यम देखिन्छ — विरासत योजनाका लागि थप बचत सहयोगी हुन्छ।",
        "वार्षिक समीक्षाले योजना अझ सुरक्षित बनाउँछ।",
      ]
    : [
        "हालको गतिमा पैसा सकिने जोखिम देखिन्छ।",
        "मासिक बचत बढाउँदा वा खर्च घटाउँदा दिगोपन बढ्छ।",
        "आकस्मिक कोष राखेर बजारको झट्का सामना गर्न सजिलो हुन्छ।",
      ];

  const inflationBulletsNe: string[] = [
    "मुद्रास्फीतिले समयसँगै पैसाको किन्ने क्षमता घटाउँछ — आजको खर्च भोलि महँगो हुन्छ।",
  ];
  if (beatsInflation) {
    inflationBulletsNe.push(
      `तपाईंको अपेक्षित प्रतिफल ${trimPct(annualReturnPct)} छ भने मुद्रास्फीति ${trimPct(inflationPct)} — वास्तविक प्रतिफल करिब ${trimPct(realReturnPct)} रहन्छ।`,
      "यसको मतलब तपाईंको योजना मुद्रास्फीतिलाई जित्ने बाटोमा छ, यदि प्रतिफल अनुमानअनुसार आयो भने।",
    );
  } else {
    inflationBulletsNe.push(
      `प्रतिफल ${trimPct(annualReturnPct)} र मुद्रास्फीति ${trimPct(inflationPct)} भएकाले वास्तविक प्रतिफल कमजोर वा नकारात्मक हुन सक्छ।`,
      "उच्च प्रतिफल दिने विविधीकृत लगानी वा खर्च नियन्त्रणले योजना बलियो बनाउँछ।",
    );
  }

  // Risks
  let marketLevel: FireAdvisorRiskLevel =
    annualReturnPct >= 14 ? "high" : annualReturnPct >= 9 ? "moderate" : "low";
  let inflationLevel: FireAdvisorRiskLevel =
    inflationPct >= 6 ? "high" : inflationPct >= 3.5 || !beatsInflation ? "moderate" : "low";
  let longevityLevel: FireAdvisorRiskLevel =
    wealthResult.depletionAge !== null
      ? "high"
      : wealthResult.solventThroughAge < 85
        ? "moderate"
        : "low";
  let withdrawalLevel: FireAdvisorRiskLevel =
    swrPct > 5 ? "high" : swrPct > 4 || wealthResult.perpetualShortfall ? "moderate" : "low";

  if (!hasData) {
    marketLevel = "moderate";
    inflationLevel = "moderate";
    longevityLevel = "moderate";
    withdrawalLevel = "moderate";
  }

  const risks: FireAdvisorRiskItem[] = [
    {
      id: "market",
      labelEn: "Market Risk",
      labelNe: "बजार जोखिम",
      level: marketLevel,
      emoji: riskEmoji(marketLevel),
      explanationNe:
        marketLevel === "high"
          ? `वार्षिक प्रतिफल ${trimPct(annualReturnPct)} अपेक्षाकृत उच्च मानिएको छ। बजार खराब वर्षमा प्रतिफल घट्न सक्छ — विविधीकरण आवश्यक छ।`
          : marketLevel === "moderate"
            ? `प्रतिफल ${trimPct(annualReturnPct)} मध्यम–उच्च दायरामा छ। सामान्य उतारचढाव आउन सक्छ, तर दीर्घकालीन दृष्टिकोणले जोखिम व्यवस्थापन गर्न सकिन्छ।`
            : `प्रतिफल अपेक्षा ${trimPct(annualReturnPct)} अपेक्षाकृत संयमित छ। बजार झट्काको असर कम अनुमानित छ, तर शून्य जोखिम हुँदैन।`,
    },
    {
      id: "inflation",
      labelEn: "Inflation Risk",
      labelNe: "मुद्रास्फीति जोखिम",
      level: inflationLevel,
      emoji: riskEmoji(inflationLevel),
      explanationNe:
        inflationLevel === "high"
          ? `मुद्रास्फीति ${trimPct(inflationPct)} उच्च देखिन्छ। खर्च छिटो बढ्दा रिटायरमेन्ट कोषमा दबाब पर्छ।`
          : inflationLevel === "moderate"
            ? `मुद्रास्फीति ${trimPct(inflationPct)} मध्यम छ वा वास्तविक प्रतिफल पातलो छ। खर्च वृद्धि अनुगमन गर्नुहोस्।`
            : `मुद्रास्फीति ${trimPct(inflationPct)} र प्रतिफलबीचको अन्तरले क्रयशक्ति जोगाउन मद्दत गर्छ।`,
    },
    {
      id: "longevity",
      labelEn: "Longevity Risk",
      labelNe: "दीर्घायु जोखिम",
      level: longevityLevel,
      emoji: riskEmoji(longevityLevel),
      explanationNe:
        longevityLevel === "high"
          ? `सम्पत्ति करिब उमेर ${wealthResult.depletionAge !== null ? Math.round(wealthResult.depletionAge) : "—"} मा सकिन सक्ने मोडेल छ। लामो आयुका लागि योजना कमजोर हुन सक्छ।`
          : longevityLevel === "moderate"
            ? `सम्पत्ति करिब उमेर ${Math.round(wealthResult.solventThroughAge)} सम्म टिक्ने देखिन्छ — अझ लामो अवधिका लागि मार्जिन बढाउनु राम्रो हुन्छ।`
            : `मोडेल अनुसार सम्पत्ति दीर्घकालसम्म टिक्ने सम्भावना राम्रो छ (करिब उमेर ${Math.round(wealthResult.solventThroughAge)} सम्म)।`,
    },
    {
      id: "withdrawal",
      labelEn: "Withdrawal Risk",
      labelNe: "निकासी जोखिम",
      level: withdrawalLevel,
      emoji: riskEmoji(withdrawalLevel),
      explanationNe:
        withdrawalLevel === "high"
          ? `सुरक्षित निकासी दर ${trimPct(swrPct)} उच्च छ। बजार खराब हुँदा पैसा चाँडै घट्न सक्छ।`
          : withdrawalLevel === "moderate"
            ? `निकासी दर ${trimPct(swrPct)} मध्यम दायरामा छ वा खर्च SWR सीमा नजिक छ। सतर्कता आवश्यक छ।`
            : `निकासी दर ${trimPct(swrPct)} परम्परागत सुरक्षित दायरा नजिक छ — दीर्घकालीन दिगोपनलाई सहयोग गर्छ।`,
    },
  ];

  const recommendations: FireAdvisorRecommendation[] = [];
  if (monthlySavings > 0 && yearsRemaining > 10) {
    recommendations.push({
      titleNe: "मासिक बचत बढाउनुहोस्",
      detailNe: "बचत ५–१५% ले बढाउँदा FIRE उमेर उल्लेखनीय रूपमा अगाडि सर्न सक्छ।",
      tone: "warning",
    });
  }
  if (!sufficient || progressPct < 50) {
    recommendations.push({
      titleNe: "रिटायरमेन्ट खर्च घटाउनुहोस्",
      detailNe: "आवश्यक मासिक खर्च घटाउँदा चाहिने कोष कम हुन्छ र लक्ष्य छिटो पुगिन्छ।",
      tone: "info",
    });
  }
  recommendations.push({
    titleNe: "लगानी विविधीकरण गर्नुहोस्",
    detailNe: "सेयर, बन्ड, सुन र नगदमा फैलाएर बजार जोखिम घटाउनुहोस्।",
    tone: "info",
  });
  recommendations.push({
    titleNe: "हरेक वर्ष योजना समीक्षा गर्नुहोस्",
    detailNe: "आम्दानी, खर्च र प्रतिफल परिवर्तन हुने भएकाले वार्षिक अपडेटले योजना जोगाउँछ।",
    tone: "positive",
  });
  recommendations.push({
    titleNe: "आकस्मिक कोष कायम राख्नुहोस्",
    detailNe: "३–६ महिनाको खर्च छुट्टै राख्दा बजार खराब हुँदा लगानी बेच्नुपर्दैन।",
    tone: "positive",
  });
  if (!beatsInflation) {
    recommendations.push({
      titleNe: "मुद्रास्फीति जित्ने प्रतिफल खोज्नुहोस्",
      detailNe: "दीर्घकालीन इक्विटी वा विविधीकृत पोर्टफोलियोले वास्तविक सम्पत्ति जोगाउन मद्दत गर्छ।",
      tone: "warning",
    });
  }
  if (band === "excellent") {
    recommendations.push({
      titleNe: "प्रगति कायम राख्नुहोस्",
      detailNe: "तपाईंको बाटो बलियो छ — अनुशासन नबिगारी नियमित बचत जारी राख्नुहोस्।",
      tone: "positive",
    });
  }

  while (recommendations.length < 5) {
    recommendations.push({
      titleNe: "अनुशासित बचत जारी राख्नुहोस्",
      detailNe: "साना नियमित कदमहरूले दीर्घकालमा ठूलो सम्पत्ति बनाउँछन्।",
      tone: "info",
    });
  }

  const journeyStoryNe =
    `आज तपाईं ${currentAge} वर्षको हुनुहुन्छ।\n\n` +
    `हाल तपाईंले ${fmt(currentSavings)} बचत गर्नुभएको छ।\n\n` +
    (yearsRemaining <= 0
      ? `हालको बचत र खर्चका आधारमा तपाईं FIRE लक्ष्य नजिक वा प्राप्त अवस्थामा हुनुहुन्छ।\n\n`
      : `यदि यही बचत र लगानीको गति कायम रह्यो भने लगभग ${yearsRemaining.toFixed(1)} वर्षपछि FIRE लक्ष्य प्राप्त गर्न सक्नुहुन्छ (करिब उमेर ${fireAge})।\n\n`) +
    `त्यसपछि तपाईंको लगानीले निष्क्रिय आम्दानी दिन सुरु गर्नेछ।\n\n` +
    (canLeaveToFamily
      ? `दीर्घकालमा तपाईंको परिवारका लागि पनि पर्याप्त सम्पत्ति बाँकी रहने सम्भावना देखिन्छ।`
      : likelyRemain
        ? `दीर्घकालमा केही सम्पत्ति बाँकी रहने सम्भावना देखिन्छ — थप बचतले परिवार सुरक्षा अझ बलियो बनाउँछ।`
        : `दीर्घकालीन सुरक्षाका लागि बचत बढाउने वा खर्च मिलाउने ठाउँ अझै छ।`);

  const summaryNe =
    (band === "excellent" || band === "good"
      ? "तपाईंको FIRE यात्रा राम्रो दिशामा छ। "
      : band === "moderate"
        ? "तपाईंको FIRE योजना मध्यम अवस्थामा छ — सुधारले ठूलो फरक पार्छ। "
        : "तपाईंको FIRE योजनामा अहिले ध्यान दिनुपर्ने कमजोरीहरू छन्। ") +
    `अनुमानित FIRE उमेर करिब ${fireAge} हो र तयारी स्कोर ${readinessScore}/100 छ। ` +
    (sufficient
      ? "निष्क्रिय आम्दानी खर्च धान्न नजिक देखिन्छ। "
      : "निष्क्रिय आम्दानी अझै खर्चभन्दा कम देखिन्छ। ") +
    (beatsInflation ? "लगानीले मुद्रास्फीति जित्ने बाटोमा छ।" : "मुद्रास्फीति जोखिमबारे सतर्क रहनुहोस्।");

  const verdictWhyNe =
    `तपाईंको आर्थिक स्वतन्त्रताको सम्भावना करिब ${probabilityPct}% अनुमान गरिएको छ किनभने ` +
    `प्रक्षेपित कोष लक्ष्यको ${Math.round(progressRatio * 100)}% हाराहारी छ, ` +
    `FIRE सम्म करिब ${yearsRemaining <= 0 ? "लगभग शून्य" : yearsRemaining.toFixed(1)} वर्ष बाँकी छ, ` +
    `र ${wealthResult.depletionAge === null ? "दीर्घकालीन दिगोपन संकेत सकारात्मक छ" : "सम्पत्ति सकिने जोखिम देखिएको छ"}। ` +
    whyScoreNe;

  return {
    hasData,
    plan: {
      currentSavings,
      monthlySavings,
      currentAge,
      targetRetirementAge: fireAge,
      annualReturnPct,
      inflationPct,
      safeWithdrawalRatePct: swrPct,
      summaryNe: planSummaryNe,
    },
    distance: {
      fireAge,
      yearsRemaining,
      progressPct,
      aheadOfPlan,
      explanationNe: distanceExplanationNe,
    },
    score: {
      value: readinessScore,
      band,
      labelEn,
      labelNe,
      whyNe: whyScoreNe,
      strengthsNe,
      weaknessesNe,
    },
    passiveIncome: {
      expectedMonthly: expectedPassiveMonthly,
      requiredMonthly,
      sufficient,
      coveragePct,
      explanationNe: passiveExplanationNe,
    },
    wealthGrowth: {
      storyNe: wealthGrowthStoryNe,
    },
    remaining: {
      estimatedWealth: remainingAtHorizon,
      likelyRemain,
      canLeaveToFamily,
      explanationNe: remainingExplanationNe,
      bulletsNe: remainingBulletsNe,
    },
    inflation: {
      beatsInflation,
      realReturnPct,
      explanationNe: inflationBulletsNe,
    },
    risks,
    recommendations: recommendations.slice(0, 7),
    journeyStoryNe,
    summaryNe,
    verdict: {
      labelEn,
      labelNe,
      probabilityPct,
      whyNe: verdictWhyNe,
    },
  };
}
