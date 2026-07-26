import { computeGrahamNumber } from "@/lib/market/nepse-fundamentals-format";
import type { TechnicalAnalysisBundle } from "@/lib/market/nepse-technical-summary";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";
import type { NepseFinancialIntelligencePayload } from "@/types/market/nepse-financial-intelligence";
import type {
  AiChecklistItem,
  AiFairValueAnalysis,
  AiGrowthAnalysis,
  AiInvestmentSummary,
  AiRecommendation,
  AiRecommendationBlock,
  AiRiskFactor,
  AiScoreCard,
  ChecklistStatus,
  FairValueBadge,
  NepseAiIntelligencePayload,
  RiskLevel,
} from "@/types/market/nepse-ai-intelligence";

/**
 * Deterministic AI Company Intelligence engine.
 * Uses only published filings, dividends, live quotes and EOD technicals.
 * Never invents projections, forward guidance or missing statement lines.
 */

type EngineInput = {
  symbol: string;
  intelligence: NepseFinancialIntelligencePayload;
  technical: TechnicalAnalysisBundle;
  livePriceNpr: number | null;
  ohlcCloses: number[];
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = avg(values);
  if (mean == null) return null;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function fmtPct(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

function fmtNpr(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return DATA_UNAVAILABLE;
  return `रु ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function scoreFromBand(value: number | null, bands: { min: number; score: number }[]): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  for (const band of bands) {
    if (value >= band.min) return band.score;
  }
  return bands[bands.length - 1]?.score ?? null;
}

function mapCagrToScore(cagr: number | null): number | null {
  if (cagr == null || !Number.isFinite(cagr)) return null;
  // -20% → 10, 0% → 50, +20% → 90 (clamped)
  return clamp(50 + cagr * 2);
}

function riskFromScore(score: number | null, invert = false): RiskLevel {
  if (score == null) return DATA_UNAVAILABLE;
  const effective = invert ? 100 - score : score;
  if (effective >= 70) return "Low";
  if (effective >= 50) return "Moderate";
  if (effective >= 30) return "Elevated";
  return "High";
}

function trendPhrase(cagr: number | null, label: string): string {
  if (cagr == null) return `${label}: ${DATA_UNAVAILABLE} — not enough consecutive published fiscal years.`;
  if (cagr >= 10) return `${label} has grown at a published 5Y CAGR of ${fmtPct(cagr)}.`;
  if (cagr >= 0) return `${label} is modestly positive on published 5Y CAGR (${fmtPct(cagr)}).`;
  if (cagr >= -10) return `${label} has contracted mildly on published 5Y CAGR (${fmtPct(cagr)}).`;
  return `${label} has declined on published 5Y CAGR (${fmtPct(cagr)}).`;
}

function scoreFinancialHealth(fi: NepseFinancialIntelligencePayload): { score: number | null; detail: string } {
  const parts: number[] = [];
  const notes: string[] = [];
  const latestAnnual = fi.annual[0];
  const latestQuarter = fi.quarterly[0];
  const profit = latestQuarter?.netProfitNpr ?? latestAnnual?.netProfitNpr ?? null;
  if (profit != null) {
    parts.push(profit > 0 ? 85 : profit === 0 ? 40 : 15);
    notes.push(profit > 0 ? "Latest published profit is positive" : "Latest published profit is not positive");
  }
  const roe = fi.ratios.roePct;
  const roeScore = scoreFromBand(roe, [
    { min: 18, score: 95 },
    { min: 12, score: 80 },
    { min: 8, score: 60 },
    { min: 0, score: 35 },
    { min: -Infinity, score: 15 },
  ]);
  if (roeScore != null) {
    parts.push(roeScore);
    notes.push(`ROE ${fmtPct(roe)}`);
  }
  if (fi.ratios.bookValuePerShareNpr != null && fi.ratios.bookValuePerShareNpr > 0) {
    parts.push(70);
    notes.push(`Book value ${fmtNpr(fi.ratios.bookValuePerShareNpr)}`);
  }
  if (latestAnnual?.paidUpCapitalNpr != null || latestQuarter?.paidUpCapitalNpr != null) {
    parts.push(65);
  }
  const score = avg(parts);
  return {
    score: score == null ? null : Math.round(score),
    detail: notes.length ? notes.join(" · ") : "No published profitability or ROE inputs yet.",
  };
}

function scoreGrowth(fi: NepseFinancialIntelligencePayload): { score: number | null; detail: string } {
  const parts: number[] = [];
  const notes: string[] = [];
  const epsCagr = mapCagrToScore(fi.growth.epsCagr5yPct);
  if (epsCagr != null) {
    parts.push(epsCagr);
    notes.push(`EPS 5Y CAGR ${fmtPct(fi.growth.epsCagr5yPct)}`);
  }
  const profitCagr = mapCagrToScore(fi.growth.profitCagr5yPct);
  if (profitCagr != null) {
    parts.push(profitCagr);
    notes.push(`Profit 5Y CAGR ${fmtPct(fi.growth.profitCagr5yPct)}`);
  }
  const nwCagr = mapCagrToScore(fi.growth.netWorthPerShareCagr5yPct);
  if (nwCagr != null) {
    parts.push(nwCagr);
    notes.push(`Net worth/share 5Y CAGR ${fmtPct(fi.growth.netWorthPerShareCagr5yPct)}`);
  }
  const yoy = fi.quarterly[0]?.yoyEpsPct ?? fi.annual[0]?.profitYoyPct ?? null;
  const yoyScore = mapCagrToScore(yoy);
  if (yoyScore != null) {
    parts.push(yoyScore);
    notes.push(`Latest YoY ${fmtPct(yoy)}`);
  }
  const score = avg(parts);
  return {
    score: score == null ? null : Math.round(score),
    detail: notes.length ? notes.join(" · ") : "Insufficient consecutive filings for growth scoring.",
  };
}

function scoreValuation(
  fi: NepseFinancialIntelligencePayload,
  fairValue: AiFairValueAnalysis,
): { score: number | null; detail: string } {
  const parts: number[] = [];
  const notes: string[] = [];
  const pe = fi.ratios.pe;
  if (pe != null && pe > 0) {
    const peerPes = fi.peers.filter((p) => !p.isSelf && p.pe != null && p.pe > 0).map((p) => p.pe!);
    const peerMedian = peerPes.length ? [...peerPes].sort((a, b) => a - b)[Math.floor(peerPes.length / 2)] : null;
    if (peerMedian != null && peerMedian > 0) {
      const relative = pe / peerMedian;
      parts.push(clamp(100 - (relative - 0.7) * 80));
      notes.push(`PE ${pe.toFixed(1)} vs sector median ${peerMedian.toFixed(1)}`);
    } else {
      parts.push(
        scoreFromBand(pe, [
          { min: 40, score: 25 },
          { min: 25, score: 45 },
          { min: 15, score: 70 },
          { min: 8, score: 85 },
          { min: 0, score: 55 },
        ]) ?? 50,
      );
      notes.push(`PE ${pe.toFixed(1)}`);
    }
  }
  const pb = fi.ratios.pb;
  if (pb != null && pb > 0) {
    parts.push(
      scoreFromBand(pb, [
        { min: 4, score: 25 },
        { min: 2.5, score: 45 },
        { min: 1.5, score: 65 },
        { min: 1, score: 80 },
        { min: 0, score: 90 },
      ]) ?? 50,
    );
    notes.push(`PB ${pb.toFixed(2)}`);
  }
  if (fairValue.discountPremiumPct != null) {
    // Positive discount (price below fair) → higher score
    parts.push(clamp(50 + fairValue.discountPremiumPct));
    notes.push(`vs fair value ${fmtPct(fairValue.discountPremiumPct)}`);
  }
  const score = avg(parts);
  return {
    score: score == null ? null : Math.round(score),
    detail: notes.length ? notes.join(" · ") : "No PE, PB or fair-value inputs published yet.",
  };
}

function scoreDividend(fi: NepseFinancialIntelligencePayload): { score: number | null; detail: string } {
  const rows = fi.dividends.rows;
  if (!rows.length) {
    return { score: null, detail: "No published dividend announcements for this symbol." };
  }
  const parts: number[] = [];
  const notes: string[] = [];
  const latest = rows[0];
  const total = latest.totalPct ?? ((latest.cashPct ?? 0) + (latest.bonusPct ?? 0) || null);
  if (total != null) {
    parts.push(total > 0 ? scoreFromBand(total, [
      { min: 20, score: 90 },
      { min: 10, score: 75 },
      { min: 5, score: 60 },
      { min: 0.01, score: 45 },
      { min: 0, score: 20 },
    ]) ?? 40 : 20);
    notes.push(`Latest total dividend ${fmtPct(total, 2)}`);
  }
  if (fi.dividends.totalYieldPct != null) {
    parts.push(
      scoreFromBand(fi.dividends.totalYieldPct, [
        { min: 4, score: 90 },
        { min: 2.5, score: 75 },
        { min: 1.5, score: 60 },
        { min: 0.5, score: 45 },
        { min: 0, score: 25 },
      ]) ?? 40,
    );
    notes.push(`Yield ${fmtPct(fi.dividends.totalYieldPct)}`);
  }
  const payout = fi.dividends.payoutRatioPct;
  if (payout != null) {
    // Prefer sustainable mid-range payouts
    if (payout >= 20 && payout <= 70) parts.push(85);
    else if (payout > 0 && payout < 100) parts.push(55);
    else parts.push(25);
    notes.push(`Payout ${fmtPct(payout)}`);
  }
  const payingYears = rows.filter((r) => (r.totalPct ?? r.cashPct ?? 0) > 0).length;
  parts.push(clamp((payingYears / Math.min(rows.length, 10)) * 100));
  notes.push(`${payingYears}/${Math.min(rows.length, 10)} recent FYs paid a dividend`);
  const cagrScore = mapCagrToScore(fi.dividends.dividendCagr5yPct);
  if (cagrScore != null) {
    parts.push(cagrScore);
    notes.push(`Div 5Y CAGR ${fmtPct(fi.dividends.dividendCagr5yPct)}`);
  }
  const score = avg(parts);
  return {
    score: score == null ? null : Math.round(score),
    detail: notes.join(" · "),
  };
}

function scoreMomentum(technical: TechnicalAnalysisBundle, closes: number[]): { score: number | null; detail: string } {
  if (!closes.length && !technical.readings.length) {
    return { score: null, detail: "No EOD history available for momentum scoring." };
  }
  const parts: number[] = [];
  const notes: string[] = [];
  if (technical.stance === "Buy") {
    parts.push(80);
    notes.push("Technical stance Buy");
  } else if (technical.stance === "Hold") {
    parts.push(55);
    notes.push("Technical stance Hold");
  } else if (technical.stance === "Sell") {
    parts.push(25);
    notes.push("Technical stance Sell");
  }
  if (technical.rsi != null) {
    // Prefer mid-high RSI without extreme overbought
    if (technical.rsi >= 45 && technical.rsi <= 70) parts.push(75);
    else if (technical.rsi > 70) parts.push(45);
    else if (technical.rsi >= 30) parts.push(40);
    else parts.push(20);
    notes.push(`RSI ${technical.rsi.toFixed(1)}`);
  }
  const last = closes[closes.length - 1];
  if (last != null && technical.ema20 != null) {
    parts.push(last >= technical.ema20 ? 70 : 35);
    notes.push(last >= technical.ema20 ? "Price ≥ EMA20" : "Price < EMA20");
  }
  if (last != null && technical.ema50 != null) {
    parts.push(last >= technical.ema50 ? 70 : 35);
  }
  if (closes.length >= 21) {
    const ret20 = ((last - closes[closes.length - 21]) / closes[closes.length - 21]) * 100;
    parts.push(clamp(50 + ret20 * 2));
    notes.push(`20-session return ${fmtPct(ret20)}`);
  }
  const score = avg(parts);
  return {
    score: score == null ? null : Math.round(score),
    detail: notes.length ? notes.join(" · ") : "Insufficient technical inputs.",
  };
}

function scoreQuality(fi: NepseFinancialIntelligencePayload, health: number | null, growth: number | null): { score: number | null; detail: string } {
  const parts: number[] = [];
  const notes: string[] = [];
  if (health != null) {
    parts.push(health);
    notes.push(`Financial health ${health}`);
  }
  if (growth != null) {
    parts.push(growth * 0.85 + 10);
  }
  const annualEps = fi.annual.map((r) => r.eps).filter((v): v is number => v != null && Number.isFinite(v));
  if (annualEps.length >= 3) {
    const mean = avg(annualEps);
    const dispersion = stdev(annualEps);
    if (mean != null && mean !== 0 && dispersion != null) {
      const cv = Math.abs(dispersion / mean);
      const stability = clamp(100 - cv * 80);
      parts.push(stability);
      notes.push(`EPS stability CV ${cv.toFixed(2)}`);
    }
  }
  const profitableYears = fi.annual.filter((r) => (r.netProfitNpr ?? 0) > 0).length;
  if (fi.annual.length) {
    parts.push(clamp((profitableYears / fi.annual.length) * 100));
    notes.push(`${profitableYears}/${fi.annual.length} annual periods profitable`);
  }
  const score = avg(parts);
  return {
    score: score == null ? null : Math.round(score),
    detail: notes.length ? notes.join(" · ") : "Quality score needs filings.",
  };
}

function buildFairValue(fi: NepseFinancialIntelligencePayload, livePrice: number | null): AiFairValueAnalysis {
  const eps = fi.ratios.eps;
  const book = fi.ratios.bookValuePerShareNpr;
  const graham = computeGrahamNumber(eps, book);
  const peerPes = fi.peers.filter((p) => !p.isSelf && p.pe != null && p.pe > 0).map((p) => p.pe!);
  const peerMedianPe = peerPes.length ? [...peerPes].sort((a, b) => a - b)[Math.floor(peerPes.length / 2)] : null;
  const peerImplied = eps != null && peerMedianPe != null && eps > 0 ? eps * peerMedianPe : null;

  const methods: { value: number; label: string }[] = [];
  if (graham != null) methods.push({ value: graham, label: "Graham number (√22.5×EPS×BVPS)" });
  if (peerImplied != null) methods.push({ value: peerImplied, label: "Sector-median PE × latest EPS" });

  if (!methods.length || livePrice == null || livePrice <= 0) {
    return {
      fairValueNpr: null,
      currentPriceNpr: livePrice,
      discountPremiumPct: null,
      marginOfSafetyPct: null,
      badge: DATA_UNAVAILABLE,
      method: null,
      detail:
        livePrice == null
          ? "Live price unavailable — fair value comparison cannot be computed."
          : "Need published EPS + book value and/or peer PE to estimate fair value. No projections invented.",
    };
  }

  const fairValueNpr = avg(methods.map((m) => m.value))!;
  // Positive = market price below fair value (discount / margin of safety)
  const discountPremiumPct = ((fairValueNpr - livePrice) / fairValueNpr) * 100;
  const marginOfSafetyPct = discountPremiumPct;
  let badge: FairValueBadge = "Fairly Valued";
  if (discountPremiumPct >= 15) badge = "Undervalued";
  else if (discountPremiumPct <= -15) badge = "Overvalued";

  return {
    fairValueNpr,
    currentPriceNpr: livePrice,
    discountPremiumPct,
    marginOfSafetyPct,
    badge,
    method: methods.map((m) => m.label).join(" + "),
    detail: `Blended from ${methods.length} real-data method${methods.length > 1 ? "s" : ""} only — not a forward model.`,
  };
}

function buildRisk(
  fi: NepseFinancialIntelligencePayload,
  technical: TechnicalAnalysisBundle,
  closes: number[],
  health: number | null,
  dividendScore: number | null,
): { factors: AiRiskFactor[]; overall: RiskLevel; detail: string } {
  const factors: AiRiskFactor[] = [];

  const financialLevel = riskFromScore(health);
  factors.push({
    label: "Financial Risk",
    level: financialLevel,
    detail: health != null ? `Mapped from financial health score ${health}/100.` : "Insufficient published profitability/ROE inputs.",
  });

  const annualEps = fi.annual.map((r) => r.eps).filter((v): v is number => v != null);
  let earningsLevel: RiskLevel = DATA_UNAVAILABLE;
  let earningsDetail = "Need ≥3 annual EPS prints for stability.";
  if (annualEps.length >= 3) {
    const mean = avg(annualEps);
    const dispersion = stdev(annualEps);
    if (mean != null && mean !== 0 && dispersion != null) {
      const cv = Math.abs(dispersion / mean);
      earningsLevel = cv < 0.25 ? "Low" : cv < 0.5 ? "Moderate" : cv < 0.85 ? "Elevated" : "High";
      earningsDetail = `Annual EPS coefficient of variation ${cv.toFixed(2)} across ${annualEps.length} fiscal years.`;
    }
  }
  factors.push({ label: "Earnings Stability", level: earningsLevel, detail: earningsDetail });

  factors.push({
    label: "Dividend Stability",
    level: riskFromScore(dividendScore),
    detail: dividendScore != null ? `Mapped from dividend score ${dividendScore}/100.` : "No dividend history published.",
  });

  let volLevel: RiskLevel = DATA_UNAVAILABLE;
  let volDetail = "Need ≥20 EOD closes for realized volatility.";
  if (closes.length >= 21) {
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const daily = stdev(returns);
    if (daily != null) {
      const annualizedPct = daily * Math.sqrt(240) * 100;
      volLevel = annualizedPct < 20 ? "Low" : annualizedPct < 35 ? "Moderate" : annualizedPct < 50 ? "Elevated" : "High";
      volDetail = `Realized ~${annualizedPct.toFixed(0)}% annualized from ${returns.length} daily EOD returns.`;
    }
  }
  factors.push({ label: "Price Volatility", level: volLevel, detail: volDetail });

  const techRisk: RiskLevel =
    technical.stance === "Sell" ? "Elevated" : technical.stance === "Buy" ? "Low" : technical.stance === "Hold" ? "Moderate" : DATA_UNAVAILABLE;
  factors.push({
    label: "Business Risk",
    level: techRisk === DATA_UNAVAILABLE && !fi.sector ? DATA_UNAVAILABLE : techRisk === DATA_UNAVAILABLE ? "Moderate" : techRisk,
    detail: fi.sector
      ? `Sector context: ${fi.sector}. Business-model risk is not scored beyond published financials and price action — no qualitative invention.`
      : "Sector mapping unavailable; business risk limited to financial/price evidence.",
  });

  const rank: Record<string, number> = { Low: 1, Moderate: 2, Elevated: 3, High: 4 };
  const ranked = factors.map((f) => f.level).filter((l): l is Exclude<RiskLevel, typeof DATA_UNAVAILABLE> => l !== DATA_UNAVAILABLE);
  let overall: RiskLevel = DATA_UNAVAILABLE;
  if (ranked.length) {
    const meanRank = avg(ranked.map((l) => rank[l])) ?? 2;
    overall = meanRank < 1.5 ? "Low" : meanRank < 2.5 ? "Moderate" : meanRank < 3.5 ? "Elevated" : "High";
  }

  return {
    factors,
    overall,
    detail:
      overall === DATA_UNAVAILABLE
        ? "Overall risk rating limited — insufficient published inputs."
        : `Composite of ${ranked.length} real-data risk factors (financial, earnings, dividend, volatility, business context).`,
  };
}

function buildGrowth(fi: NepseFinancialIntelligencePayload): AiGrowthAnalysis {
  const revenueKnown = fi.annual.some((r) => r.revenueNpr != null);
  return {
    historical: [
      trendPhrase(fi.growth.epsCagr5yPct, "EPS"),
      trendPhrase(fi.growth.profitCagr5yPct, "Net profit"),
      trendPhrase(fi.growth.netWorthPerShareCagr5yPct, "Net worth per share"),
    ].join(" "),
    futureOutlook:
      "Future growth is not projected. Outlook language below reflects only published historical CAGRs and latest YoY filing prints — no forward estimates.",
    revenueTrend: revenueKnown
      ? trendPhrase(fi.growth.revenueCagr5yPct, "Revenue")
      : `Revenue trend: ${DATA_UNAVAILABLE} — audited revenue lines are not in the filing summary feed.`,
    epsTrend: trendPhrase(fi.growth.epsCagr5yPct, "EPS"),
    netWorthTrend: trendPhrase(fi.growth.netWorthPerShareCagr5yPct, "Net worth per share"),
    epsCagr5yPct: fi.growth.epsCagr5yPct,
    profitCagr5yPct: fi.growth.profitCagr5yPct,
    netWorthCagr5yPct: fi.growth.netWorthPerShareCagr5yPct,
  };
}

function buildSummary(
  symbol: string,
  fi: NepseFinancialIntelligencePayload,
  scores: NepseAiIntelligencePayload["scores"],
  fairValue: AiFairValueAnalysis,
  riskOverall: RiskLevel,
  limitedData: boolean,
): AiInvestmentSummary {
  const sector = fi.sector ? ` in ${fi.sector}` : "";
  const overallParts: string[] = [];
  overallParts.push(
    limitedData
      ? `${symbol}${sector}: analysis is limited because one or more of filings, dividends, live price or EOD history is incomplete.`
      : `${symbol}${sector}: deterministic scorecard from published filings, dividends, live price and EOD technicals.`,
  );
  if (scores.overall != null) overallParts.push(`Overall investment score ${scores.overall}/100.`);
  if (fairValue.badge !== DATA_UNAVAILABLE) {
    overallParts.push(`Fair-value badge: ${fairValue.badge} (${fmtNpr(fairValue.fairValueNpr)} vs ${fmtNpr(fairValue.currentPriceNpr)}).`);
  }

  return {
    overall: overallParts.join(" "),
    businessQuality:
      scores.quality != null
        ? `Quality score ${scores.quality}/100 from profitability consistency and ROE/EPS stability in published reports.`
        : `Business quality: ${DATA_UNAVAILABLE} — need multi-year filings.`,
    financialHealth:
      scores.financialHealth != null
        ? `Financial health ${scores.financialHealth}/100. ${scoreFinancialHealth(fi).detail}`
        : `Financial health: ${DATA_UNAVAILABLE}.`,
    valuation:
      scores.valuation != null
        ? `Valuation score ${scores.valuation}/100. ${scoreValuation(fi, fairValue).detail}`
        : `Valuation summary: ${DATA_UNAVAILABLE}.`,
    growthOutlook:
      scores.growth != null
        ? `Growth score ${scores.growth}/100 based on published CAGRs/YoY only — no forward forecast.`
        : `Growth outlook: ${DATA_UNAVAILABLE} — insufficient consecutive filings.`,
    dividendOutlook:
      scores.dividend != null
        ? `Dividend score ${scores.dividend}/100 from announced cash/bonus history and yield vs live price.`
        : `Dividend outlook: ${DATA_UNAVAILABLE} — no announcements on record.`,
    risk: riskOverall === DATA_UNAVAILABLE ? `Risk summary: ${DATA_UNAVAILABLE}.` : `Overall risk rating: ${riskOverall}.`,
    limitedData,
  };
}

function buildRecommendation(
  overall: number | null,
  fairValue: AiFairValueAnalysis,
  riskOverall: RiskLevel,
  limitedData: boolean,
  cards: AiScoreCard[],
): AiRecommendationBlock {
  if (overall == null || (limitedData && cards.filter((c) => c.score != null).length < 3)) {
    return {
      recommendation: limitedData ? "Hold" : DATA_UNAVAILABLE,
      confidence: DATA_UNAVAILABLE,
      rationale: [
        "Insufficient real inputs for a high-conviction recommendation.",
        "Scores and narratives use only published filings, dividends and EOD technicals — nothing is invented.",
      ],
    };
  }

  let recommendation: AiRecommendation = "Hold";
  if (overall >= 80) recommendation = "Strong Buy";
  else if (overall >= 65) recommendation = "Buy";
  else if (overall >= 45) recommendation = "Hold";
  else if (overall >= 30) recommendation = "Reduce";
  else recommendation = "Sell";

  // Soft-cap extreme calls when valuation and risk conflict
  if (recommendation === "Strong Buy" && (fairValue.badge === "Overvalued" || riskOverall === "High")) {
    recommendation = "Buy";
  }
  if (recommendation === "Sell" && fairValue.badge === "Undervalued" && riskOverall === "Low") {
    recommendation = "Reduce";
  }

  const available = cards.filter((c) => c.score != null).length;
  const confidence = available >= 5 ? "High" : available >= 3 ? "Medium" : "Low";

  const rationale: string[] = [
    `Overall investment score ${overall}/100 from ${available} real-data pillars.`,
  ];
  for (const card of cards) {
    if (card.score != null) rationale.push(`${card.label}: ${card.score}/100 — ${card.detail}`);
  }
  if (fairValue.badge !== DATA_UNAVAILABLE) {
    rationale.push(`Fair value badge ${fairValue.badge}; margin of safety ${fmtPct(fairValue.marginOfSafetyPct)}.`);
  }
  if (riskOverall !== DATA_UNAVAILABLE) rationale.push(`Composite risk: ${riskOverall}.`);
  rationale.push("Not investment advice — grounded only in already-published market and filing data.");

  return { recommendation, confidence, rationale: rationale.slice(0, 8) };
}

function checklistItem(id: string, label: string, status: ChecklistStatus, detail: string): AiChecklistItem {
  return { id, label, status, detail };
}

function buildChecklist(
  fi: NepseFinancialIntelligencePayload,
  technical: TechnicalAnalysisBundle,
  closes: number[],
  health: number | null,
): AiChecklistItem[] {
  const profit = fi.quarterly[0]?.netProfitNpr ?? fi.annual[0]?.netProfitNpr ?? null;
  const epsGrowth = fi.growth.epsCagr5yPct ?? fi.quarterly[0]?.yoyEpsPct ?? null;
  const roe = fi.ratios.roePct;
  const pe = fi.ratios.pe;
  const peerPes = fi.peers.filter((p) => !p.isSelf && p.pe != null && p.pe > 0).map((p) => p.pe!);
  const peerMedian = peerPes.length ? [...peerPes].sort((a, b) => a - b)[Math.floor(peerPes.length / 2)] : null;
  const latestDiv = fi.dividends.rows[0];
  const divTotal = latestDiv?.totalPct ?? latestDiv?.cashPct ?? null;
  const last = closes[closes.length - 1];
  const technicalPass =
    technical.stance === "Buy" ||
    (last != null && technical.ema20 != null && last >= technical.ema20 && technical.bullish >= technical.bearish);

  return [
    checklistItem(
      "profitable",
      "Profitable",
      profit == null ? "unknown" : profit > 0 ? "pass" : "fail",
      profit == null ? "No published profit figure." : `Latest published net profit ${fmtNpr(profit)}.`,
    ),
    checklistItem(
      "growing-eps",
      "Growing EPS",
      epsGrowth == null ? "unknown" : epsGrowth > 0 ? "pass" : "fail",
      epsGrowth == null ? "Need YoY or 5Y EPS CAGR from filings." : `Published EPS growth ${fmtPct(epsGrowth)}.`,
    ),
    checklistItem(
      "healthy-roe",
      "Healthy ROE",
      roe == null ? "unknown" : roe >= 12 ? "pass" : "fail",
      roe == null ? "ROE not derivable from published EPS/BVPS." : `ROE ${fmtPct(roe)} (pass ≥ 12%).`,
    ),
    checklistItem(
      "reasonable-pe",
      "Reasonable PE",
      pe == null
        ? "unknown"
        : peerMedian != null
          ? pe <= peerMedian * 1.15
            ? "pass"
            : "fail"
          : pe > 0 && pe <= 25
            ? "pass"
            : "fail",
      pe == null
        ? "PE unavailable."
        : peerMedian != null
          ? `PE ${pe.toFixed(1)} vs sector median ${peerMedian.toFixed(1)}.`
          : `PE ${pe.toFixed(1)} (pass ≤ 25 without peer median).`,
    ),
    checklistItem(
      "positive-dividend",
      "Positive Dividend",
      divTotal == null && !fi.dividends.rows.length ? "unknown" : (divTotal ?? 0) > 0 ? "pass" : "fail",
      divTotal == null ? "No dividend announcement on record." : `Latest total dividend ${fmtPct(divTotal, 2)}.`,
    ),
    checklistItem(
      "strong-balance-sheet",
      "Strong Balance Sheet",
      (() => {
        if (fi.ratios.bookValuePerShareNpr == null && fi.growth.netWorthPerShareCagr5yPct == null && roe == null) {
          return "unknown";
        }
        const bookOk =
          fi.ratios.bookValuePerShareNpr != null &&
          fi.ratios.bookValuePerShareNpr > 0 &&
          (fi.growth.netWorthPerShareCagr5yPct == null || fi.growth.netWorthPerShareCagr5yPct >= 0);
        const roeOk = roe != null && roe >= 10;
        return bookOk || roeOk ? "pass" : "fail";
      })(),
      fi.ratios.bookValuePerShareNpr != null
        ? `Book value ${fmtNpr(fi.ratios.bookValuePerShareNpr)}; NW/share CAGR ${fmtPct(fi.growth.netWorthPerShareCagr5yPct)}. Debt ratios ${DATA_UNAVAILABLE} until full statements ingest.`
        : `Balance-sheet depth limited — leverage ratios ${DATA_UNAVAILABLE}.`,
    ),
    checklistItem(
      "technical-trend",
      "Technical Trend",
      !closes.length && !technical.readings.length ? "unknown" : technicalPass ? "pass" : "fail",
      technical.stance === DATA_UNAVAILABLE
        ? "No EOD technical stance yet."
        : `Stance ${technical.stance}; ${technical.bullish} bullish / ${technical.bearish} bearish readings.`,
    ),
    checklistItem(
      "financial-stability",
      "Financial Stability",
      health == null ? "unknown" : health >= 60 ? "pass" : "fail",
      health == null ? "Health score unavailable." : `Financial health score ${health}/100 (pass ≥ 60).`,
    ),
  ];
}

/** Pure builder — call from the service after loading real FI + OHLC inputs. */
export function buildAiIntelligence(input: EngineInput): NepseAiIntelligencePayload {
  const { symbol, intelligence: fi, technical, livePriceNpr, ohlcCloses } = input;
  const fairValue = buildFairValue(fi, livePriceNpr);
  const health = scoreFinancialHealth(fi);
  const growth = scoreGrowth(fi);
  const valuation = scoreValuation(fi, fairValue);
  const dividend = scoreDividend(fi);
  const momentum = scoreMomentum(technical, ohlcCloses);
  const quality = scoreQuality(fi, health.score, growth.score);

  const cards: AiScoreCard[] = [
    { label: "Financial Health", score: health.score, detail: health.detail },
    { label: "Growth", score: growth.score, detail: growth.detail },
    { label: "Valuation", score: valuation.score, detail: valuation.detail },
    { label: "Dividend", score: dividend.score, detail: dividend.detail },
    { label: "Momentum", score: momentum.score, detail: momentum.detail },
    { label: "Quality", score: quality.score, detail: quality.detail },
  ];

  const pillarScores = cards.map((c) => c.score).filter((s): s is number => s != null);
  const overall = pillarScores.length ? Math.round(avg(pillarScores)!) : null;
  const limitedData =
    pillarScores.length < 3 ||
    (!fi.annual.length && !fi.quarterly.length) ||
    livePriceNpr == null ||
    ohlcCloses.length < 20;

  const risk = buildRisk(fi, technical, ohlcCloses, health.score, dividend.score);
  const growthBlock = buildGrowth(fi);
  const summary = buildSummary(symbol, fi, {
    financialHealth: health.score,
    growth: growth.score,
    valuation: valuation.score,
    dividend: dividend.score,
    momentum: momentum.score,
    quality: quality.score,
    overall,
    cards,
  }, fairValue, risk.overall, limitedData);
  const recommendation = buildRecommendation(overall, fairValue, risk.overall, limitedData, cards);
  const checklist = buildChecklist(fi, technical, ohlcCloses, health.score);

  const sources = [...fi.sources];
  if (ohlcCloses.length) sources.push("nepse_eod_prices technicals");
  if (livePriceNpr != null) sources.push("Live NEPSE quote");

  return {
    symbol,
    summary,
    scores: {
      financialHealth: health.score,
      growth: growth.score,
      valuation: valuation.score,
      dividend: dividend.score,
      momentum: momentum.score,
      quality: quality.score,
      overall,
      cards,
    },
    fairValue,
    risk,
    growth: growthBlock,
    recommendation,
    checklist,
    dataCoverage: {
      hasFilings: fi.annual.length > 0 || fi.quarterly.length > 0,
      hasDividends: fi.dividends.rows.length > 0,
      hasTechnicals: ohlcCloses.length > 0,
      hasLivePrice: livePriceNpr != null,
      annualPeriods: fi.annual.length,
      quarterlyPeriods: fi.quarterly.length,
      ohlcBars: ohlcCloses.length,
    },
    sources: [...new Set(sources)],
    loadedAt: new Date().toISOString(),
  };
}
