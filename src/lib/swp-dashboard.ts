import {
  buildSwpRetirementAnalysis,
  runSwpSimulation,
  type SwpAnalysisInputs,
  type SwpRetirementAnalysis,
  type SwpSimulationResult,
} from "@/lib/swp-calculator";

export type SwpGoalStatus = "on-track" | "attention" | "off-track";
export type SwpScenarioKey = "best" | "expected" | "worst";

/** Percentage-point spread applied to the expected return for best / worst cases. */
export const SWP_SCENARIO_RETURN_DELTA = 3;

export interface SwpScenario {
  key: SwpScenarioKey;
  labelEn: string;
  labelNe: string;
  annualReturnPct: number;
  endingBalance: number;
  totalWithdrawals: number;
  survivalYearsDisplay: string;
  survivesFullHorizon: boolean;
  sustainabilityScore: number;
}

export interface SwpGoalSummary {
  status: SwpGoalStatus;
  labelEn: string;
  labelNe: string;
  progressPct: number;
  scoreValue: number;
  detailNe: string;
}

export interface SwpLegacySummary {
  value: number;
  hasLegacy: boolean;
  multipleOfInitial: number;
  annualLegacyIncome: number;
  headlineNe: string;
  detailNe: string;
  bulletsNe: string[];
}

export interface SwpWealthTimelinePoint {
  year: number;
  balance: number;
  withdrawals: number;
}

export interface SwpDashboardModel {
  hasData: boolean;
  inputs: SwpAnalysisInputs;
  result: SwpSimulationResult;
  analysis: SwpRetirementAnalysis;
  goal: SwpGoalSummary;
  scenarios: SwpScenario[];
  legacy: SwpLegacySummary;
  timeline: SwpWealthTimelinePoint[];
}

/** Adapter so callers can drive the shared engine from the analysis-shaped input object. */
export function runSwpFromInputs(inputs: SwpAnalysisInputs): SwpSimulationResult {
  return runSwpSimulation({
    initialCorpus: inputs.initial,
    monthlyWithdrawal: inputs.monthly,
    annualReturnPct: inputs.annualReturnPct,
    annualInflationPct: inputs.annualInflationPct,
    horizonYears: inputs.horizonYears,
  });
}

function goalSummary(result: SwpSimulationResult, inputs: SwpAnalysisInputs): SwpGoalSummary {
  const survives = result.depletionMonth === null;
  const score = result.sustainabilityScore;
  const rate = result.initialWithdrawalRatePct;

  let status: SwpGoalStatus;
  if (!survives) {
    status = "off-track";
  } else if (score >= 70 && rate <= 5) {
    status = "on-track";
  } else {
    status = "attention";
  }

  const progressPct = Math.round(
    Math.max(0, Math.min(100, (result.survivalYears / Math.max(1, inputs.horizonYears)) * 100)),
  );

  const labelEn = status === "on-track" ? "On Track" : status === "attention" ? "Needs Attention" : "Off Track";
  const labelNe = status === "on-track" ? "लक्ष्यमा" : status === "attention" ? "ध्यान आवश्यक" : "लक्ष्यबाहिर";
  const detailNe =
    status === "on-track"
      ? `तपाईंको लगानीले पूरा ${inputs.horizonYears} वर्षको अवधि धान्ने भएकाले तपाईं Retirement लक्ष्य पूरा गर्ने बाटोमा हुनुहुन्छ।`
      : status === "attention"
        ? "तपाईंको योजना ठिकठाक छ तर निकासी दर वा दिगोपन स्कोर सुधार गर्दा लक्ष्य अझ सुरक्षित हुन्छ।"
        : `हालको अवस्थामा तपाईंको पैसा करिब ${Math.floor(result.survivalYears)} वर्षपछि सकिन सक्ने भएकाले लक्ष्य जोखिममा छ।`;

  return { status, labelEn, labelNe, progressPct, scoreValue: score, detailNe };
}

function buildScenarios(inputs: SwpAnalysisInputs): SwpScenario[] {
  const defs: { key: SwpScenarioKey; labelEn: string; labelNe: string; returnPct: number }[] = [
    {
      key: "best",
      labelEn: "Best Case",
      labelNe: "उत्कृष्ट अवस्था",
      returnPct: inputs.annualReturnPct + SWP_SCENARIO_RETURN_DELTA,
    },
    {
      key: "expected",
      labelEn: "Expected",
      labelNe: "अपेक्षित",
      returnPct: inputs.annualReturnPct,
    },
    {
      key: "worst",
      labelEn: "Worst Case",
      labelNe: "प्रतिकूल अवस्था",
      returnPct: Math.max(0, inputs.annualReturnPct - SWP_SCENARIO_RETURN_DELTA),
    },
  ];

  return defs.map((def) => {
    const res = runSwpFromInputs({ ...inputs, annualReturnPct: def.returnPct });
    return {
      key: def.key,
      labelEn: def.labelEn,
      labelNe: def.labelNe,
      annualReturnPct: def.returnPct,
      endingBalance: Math.max(0, res.endingBalanceNominal),
      totalWithdrawals: res.totalWithdrawalsNominal,
      survivalYearsDisplay: res.survivalYearsDisplay,
      survivesFullHorizon: res.depletionMonth === null,
      sustainabilityScore: res.sustainabilityScore,
    };
  });
}

function legacySummary(
  analysis: SwpRetirementAnalysis,
  inputs: SwpAnalysisInputs,
): SwpLegacySummary {
  const value = analysis.remaining.value;
  const hasLegacy = value > 0;
  const multipleOfInitial = inputs.initial > 0 ? value / inputs.initial : 0;
  const annualLegacyIncome = value * 0.04;

  const headlineNe = hasLegacy
    ? `तपाईंको योजना अवधिपछि करिब ${formatMultiple(multipleOfInitial)} बराबरको सम्पत्ति विरासतका रूपमा बाँकी रहन्छ।`
    : "हालको योजनामा अवधिपछि विरासतका लागि रकम बाँकी रहँदैन।";

  const detailNe = hasLegacy
    ? "यो बाँकी रकम तपाईंको परिवार, भावी पुस्ता वा सामाजिक कार्यका लागि विरासत सम्पत्तिका रूपमा प्रयोग गर्न सकिन्छ।"
    : "निकासी घटाउँदा वा लगानी बढाउँदा भविष्यमा विरासतका लागि रकम जोगाउन सकिन्छ।";

  const bulletsNe = hasLegacy
    ? [
        "परिवारका लागि दिगो आर्थिक सुरक्षा।",
        "भावी पुस्तालाई सम्पत्ति हस्तान्तरण।",
        "दान वा सामाजिक कार्यमा योगदानको अवसर।",
        "Financial Freedom पुस्तौँसम्म कायम।",
      ]
    : [
        "अवधिपछि सम्पत्ति बाँकी नरहने सम्भावना।",
        "निकासी घटाउँदा विरासत जोगिन सक्छ।",
        "लगानी बढाउँदा भावी पुस्ताको सुरक्षा बढ्छ।",
      ];

  return {
    value,
    hasLegacy,
    multipleOfInitial,
    annualLegacyIncome,
    headlineNe,
    detailNe,
    bulletsNe,
  };
}

function formatMultiple(x: number): string {
  if (!Number.isFinite(x) || x <= 0) return "0×";
  return `${x.toFixed(x >= 10 ? 0 : 1)}×`;
}

export function formatSwpMultiple(x: number): string {
  return formatMultiple(x);
}

/**
 * Centralized dashboard model. All modules (goal, hero, journey, scenarios,
 * what-if, legacy, PDF report) derive from this single object so calculations
 * are never duplicated. Reuses the existing SWP engine + analysis builder.
 */
export function buildSwpDashboardModel(
  result: SwpSimulationResult,
  inputs: SwpAnalysisInputs,
): SwpDashboardModel {
  const analysis = buildSwpRetirementAnalysis(result, inputs);
  const timeline: SwpWealthTimelinePoint[] = result.yearly.map((y) => ({
    year: y.year,
    balance: Math.max(0, y.balanceWithInflation),
    withdrawals: y.withdrawalsNominal,
  }));

  return {
    hasData: inputs.initial > 0 && inputs.monthly > 0,
    inputs,
    result,
    analysis,
    goal: goalSummary(result, inputs),
    scenarios: buildScenarios(inputs),
    legacy: legacySummary(analysis, inputs),
    timeline,
  };
}
