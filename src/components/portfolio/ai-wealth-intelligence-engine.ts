import type { WealthTotals } from "@/components/portfolio/calculations";

export type AiRiskLevel = "low" | "medium" | "high";

export type AiRecTone = "critical" | "neutral" | "positive";

export type AiRecommendation = { text: string; tone: AiRecTone };

export type AllocationSlice = { label: string; value: number; npr: number };

export type AiWealthIntelligenceModel = {
  /** Model CPI assumption for messaging (annual, decimal). */
  inflationAssumptionAnnual: number;
  insightHeadline: string;
  insightBody: string;
  fireSuccessPct: number;
  fireConfidencePct: number;
  concentrationLabel: "low" | "moderate" | "elevated";
  concentrationTopPct: number;
  concentrationTopLabel: string;
  hhiIndex: number;
  diversificationScore: number;
  diversificationSummary: string;
  balanceSuggestions: string[];
  purchasingPowerNpr10y: number;
  cumulativeInflationDragPct10y: number;
  nominalWealthIfCompounds7Pct10y: number;
  riskLevel: AiRiskLevel;
  volatilityIndex: number;
  safetyScore: number;
  recommendations: AiRecommendation[];
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function pctOfAssets(t: WealthTotals, npr: number): number {
  return t.totalAssetsNpr > 0 ? (npr / t.totalAssetsNpr) * 100 : 0;
}

/** Herfindahl-style concentration on asset slices (shares as 0–1). */
function concentrationHhi(allocation: AllocationSlice[]): number {
  const shares = allocation
    .filter((a) => a.npr > 0 && Number.isFinite(a.value))
    .map((a) => clamp(a.value / 100, 0, 1));
  if (!shares.length) return 1;
  return shares.reduce((s, p) => s + p * p, 0);
}

function topAllocation(allocation: AllocationSlice[]): { label: string; pct: number; npr: number } {
  const sorted = [...allocation].sort((a, b) => b.value - a.value);
  const x = sorted[0];
  return x ? { label: x.label, pct: x.value, npr: x.npr } : { label: "—", pct: 0, npr: 0 };
}

function passiveYieldAnnualPct(t: WealthTotals, passiveMonthlyNpr: number): number {
  if (t.netWorthNpr <= 0) return 0;
  return ((passiveMonthlyNpr * 12) / t.netWorthNpr) * 100;
}

function fireTrajectoryPct(
  t: WealthTotals,
  fireScore: number,
  passiveMonthlyNpr: number,
  monthDelta: number | null,
): number {
  const debtRatio = t.totalAssetsNpr > 0 ? clamp(t.liabilitiesNpr / t.totalAssetsNpr, 0, 1) : t.liabilitiesNpr > 0 ? 1 : 0;
  const investShare = t.totalAssetsNpr > 0 ? clamp(t.investableNpr / t.totalAssetsNpr, 0, 1) : 0;
  const retirementShare = t.totalAssetsNpr > 0 ? clamp(t.retirementNpr / t.totalAssetsNpr, 0, 1) : 0;
  const passiveBoost = clamp(passiveYieldAnnualPct(t, passiveMonthlyNpr) * 1.15, 0, 22);
  const momentum =
    monthDelta != null && t.netWorthNpr > 0 ? clamp((monthDelta / t.netWorthNpr) * 140, -8, 10) : 0;
  const raw =
    fireScore * 0.48 +
    (1 - debtRatio) * 22 +
    investShare * 18 +
    retirementShare * 12 +
    passiveBoost +
    momentum;
  return Math.round(clamp(raw, 8, 97));
}

function confidenceFromSignals(
  t: WealthTotals,
  historyPoints: number,
  hydrated: boolean,
): number {
  if (!hydrated) return 44;
  let c = 56;
  if (t.totalAssetsNpr > 50_000) c += 8;
  if (t.totalAssetsNpr > 500_000) c += 6;
  if (historyPoints >= 3) c += 10;
  if (historyPoints >= 8) c += 8;
  if (t.netWorthNpr > 0) c += 6;
  return Math.round(clamp(c, 38, 94));
}

function mapRisk(danger: number): AiRiskLevel {
  if (danger < 38) return "low";
  if (danger < 66) return "medium";
  return "high";
}

function buildRecommendations(
  t: WealthTotals,
  allocation: AllocationSlice[],
  top: { label: string; pct: number },
  passiveMonthlyNpr: number,
  monthDelta: number | null,
  fireScore: number,
  concLabel: "low" | "moderate" | "elevated",
): AiRecommendation[] {
  const out: AiRecommendation[] = [];
  const vehiclesPct = allocation.find((a) => a.label === "Vehicles")?.value ?? 0;
  const investPct = allocation.find((a) => a.label === "Investments")?.value ?? 0;
  const liquidPct = allocation.find((a) => a.label === "Liquid")?.value ?? 0;
  const rePct = allocation.find((a) => a.label === "Real estate")?.value ?? 0;

  if (vehiclesPct >= 22) {
    out.push({
      tone: "critical",
      text: "Vehicle exposure is outsized versus wealth-building sleeves. Recycle depreciating capital into compounding engines you control.",
    });
  } else if (vehiclesPct >= 14) {
    out.push({
      tone: "neutral",
      text: "Vehicle equity is carrying real weight. If mobility is solved, consider trimming the sleeve so optionality stays liquid.",
    });
  }

  if (investPct < 12 && t.totalAssetsNpr > 200_000) {
    out.push({
      tone: "neutral",
      text: "Investable market exposure is modest relative to scale. When risk capacity allows, widen the sleeve—discipline earns the premium.",
    });
  } else if (investPct >= 28) {
    out.push({
      tone: "positive",
      text: "Investable capital is well provisioned. Stay automatic: contributions and rebalancing beat narrative-driven timing.",
    });
  }

  const passiveAnnual = passiveMonthlyNpr * 12;
  if (t.netWorthNpr > 0 && passiveAnnual / t.netWorthNpr >= 0.028) {
    out.push({
      tone: "positive",
      text: "Passive cash flow is quietly competitive versus net worth. Sweep the surplus into growth—let compounding do the heavy lift.",
    });
  }

  if (monthDelta != null && monthDelta > 0) {
    out.push({
      tone: "positive",
      text: "Net worth momentum is constructive. Protect the win with boring execution—policy, not impulse.",
    });
  } else if (monthDelta != null && monthDelta < 0) {
    out.push({
      tone: "neutral",
      text: "A softer print is normal in real portfolios. Triage liquidity and liabilities first; only then revisit risk budget.",
    });
  }

  if (concLabel === "elevated") {
    out.push({
      tone: "critical",
      text: "Concentration is the silent risk. Deliberately diversify across sleeves you understand—conviction without guardrails is fragile.",
    });
  } else if (concLabel === "low") {
    out.push({
      tone: "positive",
      text: "Sleeve balance looks institutional. Keep winners from drifting the plan—light, periodic rebalancing preserves intent.",
    });
  }

  if (liquidPct < 6 && t.totalAssetsNpr > 150_000) {
    out.push({
      tone: "neutral",
      text: "Liquidity is tight for the scale of the balance sheet. A cash buffer buys clarity when markets disagree with you.",
    });
  }

  if (rePct >= 45) {
    out.push({
      tone: "neutral",
      text: "Real estate dominates the map. Model rates, rents, and vacancy explicitly—concentrated property is a macro bet in disguise.",
    });
  }

  if (fireScore >= 78) {
    out.push({
      tone: "positive",
      text: "FIRE alignment reads strong. Defend it with governance: caps on lifestyle creep, debt discipline, and contribution auto-pilot.",
    });
  }

  if (top.pct >= 40 && top.label !== "Investments") {
    out.push({
      tone: "neutral",
      text: `The balance sheet tilts toward ${top.label.toLowerCase()}. Pair that conviction with a credible path to recycle cash flow into growth sleeves.`,
    });
  }

  if (vehiclesPct >= 18 && !out.some((r) => r.text.toLowerCase().includes("vehicle"))) {
    out.push({
      tone: "critical",
      text: "Vehicle concentration is elevated—treat it as lifestyle capital, not the engine of financial independence.",
    });
  }

  const seen = new Set<string>();
  return out.filter((r) => {
    const k = r.text.slice(0, 48);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 8);
}

function advisorNarrative(
  t: WealthTotals,
  top: { label: string; pct: number },
  fireScore: number,
  concLabel: "low" | "moderate" | "elevated",
  risk: AiRiskLevel,
): { headline: string; body: string } {
  const debtPct = t.totalAssetsNpr > 0 ? (t.liabilitiesNpr / t.totalAssetsNpr) * 100 : 0;
  const headline =
    fireScore >= 72
      ? "Composure, meet conviction."
      : fireScore >= 48
        ? "Disciplined base. Still room to sharpen edge."
        : "Early structure wins—velocity follows clarity.";

  const parts: string[] = [];
  parts.push(
    `At this snapshot, ${top.label} anchors roughly ${top.pct.toFixed(1)}% of gross assets—` +
      (concLabel === "elevated"
        ? "a deliberate tilt that demands governance: one sleeve should never own your peace of mind."
        : concLabel === "moderate"
          ? "a credible posture if cash flows, debt service, and liquidity stay boringly monitored."
          : "a diversified footprint that rewards patience and punishes panic."),
  );
  if (debtPct >= 28) {
    parts.push(
      `Liabilities sit near ${debtPct.toFixed(0)}% of gross assets—keep repayment predictable so equity can compound without drama.`,
    );
  } else if (debtPct <= 8 && t.liabilitiesNpr > 0) {
    parts.push("Debt is contained relative to assets—that margin is precious; guard it as you scale.");
  }
  parts.push(
    risk === "high"
      ? "Risk budget reads elevated: favor clarity, liquidity, and small repeatable moves over leverage or hero trades."
      : risk === "medium"
        ? "Risk sits in balance: you can lean into growth while buffers buy you the right to think in decades."
        : "Risk reads tempered: stay selective—quality compounds quietly when noise is filtered out.",
  );
  return { headline, body: parts.join(" ") };
}

/**
 * Deterministic “AI wealth intelligence” layer derived from existing portfolio math.
 * Not personalized investment advice; presentation-only insights for the dashboard UI.
 */
export function computeAiWealthIntelligence(
  t: WealthTotals,
  allocation: AllocationSlice[],
  fireScore: number,
  passiveMonthlyNpr: number,
  monthDelta: number | null,
  historyPoints: number,
  hydrated: boolean,
): AiWealthIntelligenceModel {
  const inflationAssumptionAnnual = 0.065;
  const top = topAllocation(allocation);
  const hhi = concentrationHhi(allocation);
  const activeBuckets = allocation.filter((a) => a.npr > 0).length;
  const n = Math.max(1, activeBuckets);
  let diversificationScore: number;
  if (n <= 1 || hhi >= 0.999) {
    diversificationScore = hhi >= 0.55 ? 10 : 32;
  } else {
    const hhiMin = 1 / n;
    const denom = 1 - hhiMin;
    diversificationScore = Math.round(clamp(((1 - hhi) / denom) * 100, 0, 100));
  }
  const concLabel: "low" | "moderate" | "elevated" =
    top.pct >= 52 || hhi >= 0.34 ? "elevated" : top.pct >= 38 || hhi >= 0.22 ? "moderate" : "low";

  const debtRatio = t.totalAssetsNpr > 0 ? clamp(t.liabilitiesNpr / t.totalAssetsNpr, 0, 1) : t.liabilitiesNpr > 0 ? 1 : 0;
  const equityProxy = t.totalAssetsNpr > 0 ? clamp(t.investmentsLiveNpr / t.totalAssetsNpr, 0, 1) : 0;
  const stabilityProxy =
    t.totalAssetsNpr > 0
      ? clamp((t.liquidNpr + t.fixedDepositsPrincipalNpr + t.retirementNpr) / t.totalAssetsNpr, 0, 1)
      : 0;
  const danger =
    debtRatio * 44 +
    clamp(top.pct / 100, 0, 1) * 34 +
    (t.netWorthNpr < 0 ? 26 : 0) +
    (1 - stabilityProxy) * 12;
  const riskLevel = mapRisk(danger);
  const volatilityIndex = Math.round(
    clamp(22 + equityProxy * 58 + pctOfAssets(t, t.metalsNpr) * 0.12 - stabilityProxy * 18, 8, 96),
  );
  const safetyScore = Math.round(clamp(100 - danger * 0.72 - (volatilityIndex - 22) * 0.22, 12, 98));

  const years = 10;
  const pp = Math.pow(1 + inflationAssumptionAnnual, years);
  const purchasingPowerNpr10y = t.netWorthNpr > 0 ? t.netWorthNpr / pp : 0;
  const cumulativeInflationDragPct10y = Math.round((1 - 1 / pp) * 1000) / 10;
  const nominalWealthIfCompounds7Pct10y = t.netWorthNpr > 0 ? t.netWorthNpr * Math.pow(1.07, years) : 0;

  const fireSuccessPct = fireTrajectoryPct(t, fireScore, passiveMonthlyNpr, monthDelta);
  const fireConfidencePct = confidenceFromSignals(t, historyPoints, hydrated);

  const { headline, body } = advisorNarrative(t, top, fireScore, concLabel, riskLevel);

  const diversificationSummary =
    concLabel === "elevated"
      ? `${top.label} is carrying the risk budget. That can work—if you govern it like an institutional sleeve, not a habit.`
      : concLabel === "moderate"
        ? "Weights look professional, with one visible anchor. Let quarterly drift checks—not headlines—drive trims."
        : "Engines are spread well. The edge now is consistency: rebalance lightly and keep contributions on rails.";

  const balanceSuggestions: string[] = [];
  if (top.pct >= 40) {
    balanceSuggestions.push(`Rebalance away from over-attachment to ${top.label}; align sleeves with your stated FIRE glide path.`);
  }
  if (pctOfAssets(t, t.vehiclesNpr) >= 16) {
    balanceSuggestions.push("When lifestyle allows, recycle vehicle equity into income or indexed sleeves that compound in your sleep.");
  }
  if (pctOfAssets(t, t.investmentsLiveNpr) < 15 && t.totalAssetsNpr > 250_000) {
    balanceSuggestions.push("Widen market exposure gradually—DCA removes timing regret and keeps behavior elite.");
  }
  if (pctOfAssets(t, t.liquidNpr) < 7 && t.netWorthNpr > 100_000) {
    balanceSuggestions.push("Lift cash toward 3–6 months of core spend before adding marginal risk—optionality is its own return.");
  }
  if (!balanceSuggestions.length) {
    balanceSuggestions.push("Hold the line: annual rebalance, no reactive trades, automatic contributions. Boring is a feature.");
  }

  let recommendations = buildRecommendations(t, allocation, top, passiveMonthlyNpr, monthDelta, fireScore, concLabel);
  if (recommendations.length < 2) {
    recommendations = [
      ...recommendations,
      {
        tone: "neutral" as const,
        text: "Precision starts with clean inputs. Keep the ledger current—clarity compounds faster than guesswork.",
      },
      {
        tone: "positive" as const,
        text: "Small, repeated upgrades to savings rate move the probability surface more than any single market call.",
      },
    ].filter((r, i, arr) => arr.findIndex((x) => x.text === r.text) === i);
  }
  const toneRank: Record<AiRecTone, number> = { critical: 0, neutral: 1, positive: 2 };
  recommendations = [...recommendations].sort((a, b) => {
    const d = toneRank[a.tone] - toneRank[b.tone];
    return d !== 0 ? d : a.text.localeCompare(b.text);
  });
  recommendations = recommendations.slice(0, 8);

  return {
    inflationAssumptionAnnual,
    insightHeadline: headline,
    insightBody: body,
    fireSuccessPct,
    fireConfidencePct,
    concentrationLabel: concLabel,
    concentrationTopPct: top.pct,
    concentrationTopLabel: top.label,
    hhiIndex: Math.round(hhi * 1000) / 1000,
    diversificationScore,
    diversificationSummary,
    balanceSuggestions: balanceSuggestions.slice(0, 4),
    purchasingPowerNpr10y,
    cumulativeInflationDragPct10y,
    nominalWealthIfCompounds7Pct10y,
    riskLevel,
    volatilityIndex,
    safetyScore,
    recommendations,
  };
}
