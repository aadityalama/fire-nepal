import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Weighted pillar scores (0–100 each) feeding the headline financial health score. */
export type FinancialHealthPillars = {
  savingsRate: number;
  debtRatio: number;
  emergencyFund: number;
  investmentStrength: number;
  retirementReadiness: number;
};

export type FireJourneyStageId =
  | "foundation"
  | "momentum"
  | "wealth_acceleration"
  | "fire_engine"
  | "fire_beast";

export type FireJourneyStageMeta = {
  id: FireJourneyStageId;
  title: string;
  tagline: string;
  /** Tailwind gradient for accents in UI */
  gradient: string;
};

export type GuidanceTone = "warn" | "praise" | "tip" | "celebrate";

export type GuidanceCard = {
  id: string;
  tone: GuidanceTone;
  title: string;
  body: string;
  /** Higher sorts first */
  priority: number;
};

export type FinancialGuidancePack = {
  financialHealthScore: number;
  pillars: FinancialHealthPillars;
  /** Weights used (documentation / UI transparency) */
  pillarWeights: Record<keyof FinancialHealthPillars, number>;
  stage: FireJourneyStageMeta;
  cards: GuidanceCard[];
  suggestions: string[];
};

const WEIGHTS: Record<keyof FinancialHealthPillars, number> = {
  savingsRate: 0.24,
  debtRatio: 0.22,
  emergencyFund: 0.22,
  investmentStrength: 0.16,
  retirementReadiness: 0.16,
};

function scoreSavingsRate(savingsRatePct: number | null, monthlyIncome: number): number {
  if (monthlyIncome <= 1e-6) return 48;
  if (savingsRatePct === null) return 48;
  if (savingsRatePct < 0) return clamp(12 + savingsRatePct * 0.4, 0, 35);
  if (savingsRatePct < 8) return 38 + savingsRatePct * 2.5;
  if (savingsRatePct < 20) return 52 + (savingsRatePct - 8) * 2;
  if (savingsRatePct < 35) return 72 + (savingsRatePct - 20) * 0.9;
  return clamp(86 + (savingsRatePct - 35) * 0.35, 0, 100);
}

function scoreDebtRatio(liabilitiesNpr: number, totalAssetsNpr: number): number {
  if (totalAssetsNpr <= 1e-6) return liabilitiesNpr > 1e-6 ? 22 : 78;
  const ratio = liabilitiesNpr / totalAssetsNpr;
  return clamp((1 - Math.min(1, ratio * 1.2)) * 100, 0, 100);
}

function scoreEmergency(months: number | null, monthlyBurn: number): number {
  if (monthlyBurn <= 1e-6) {
    if (months === null) return 62;
    return clamp(55 + months * 6, 0, 100);
  }
  if (months === null) return 32;
  if (months < 1) return clamp(18 + months * 28, 0, 100);
  if (months < 3) return 40 + months * 12;
  if (months < 6) return 64 + (months - 3) * 9;
  return clamp(88 + Math.min(12, (months - 6) * 1.8), 0, 100);
}

function scoreInvestmentStrength(investmentsLiveNpr: number, totalAssetsNpr: number): number {
  if (totalAssetsNpr <= 1e-6) return investmentsLiveNpr > 1e-6 ? 65 : 42;
  const share = investmentsLiveNpr / totalAssetsNpr;
  if (share < 0.04) return 36;
  if (share < 0.12) return 48 + share * 380;
  if (share < 0.28) return 62 + share * 95;
  return clamp(82 + share * 35, 0, 100);
}

function scoreRetirementReadiness(retirementNpr: number, totalAssetsNpr: number, netWorthNpr: number): number {
  if (totalAssetsNpr <= 1e-6) return retirementNpr > 1e-6 ? 58 : 45;
  const assetShare = retirementNpr / totalAssetsNpr;
  const nwShare = netWorthNpr > 1e-6 ? retirementNpr / netWorthNpr : assetShare;
  const blend = assetShare * 0.55 + Math.min(1, nwShare) * 0.45;
  return clamp(38 + blend * 155, 0, 100);
}

function weightedHealth(p: FinancialHealthPillars): number {
  let s = 0;
  (Object.keys(WEIGHTS) as (keyof FinancialHealthPillars)[]).forEach((k) => {
    s += p[k] * WEIGHTS[k];
  });
  return Math.round(clamp(s, 0, 100));
}

const STAGES: Record<FireJourneyStageId, Omit<FireJourneyStageMeta, "id">> = {
  foundation: {
    title: "Foundation phase",
    tagline: "You're mapping terrain — tighten cashflow and build the first safety layers.",
    gradient: "from-slate-400/30 to-emerald-900/40",
  },
  momentum: {
    title: "Momentum phase",
    tagline: "Habits are forming — push savings consistency and keep debt visible.",
    gradient: "from-emerald-500/35 to-teal-900/45",
  },
  wealth_acceleration: {
    title: "Wealth acceleration",
    tagline: "Capital is compounding for you — grow investments and protect the runway.",
    gradient: "from-teal-400/40 to-emerald-950/50",
  },
  fire_engine: {
    title: "FIRE engine active",
    tagline: "Serious leverage — optimize tax locations, retirement pillars, and spend.",
    gradient: "from-lime-400/45 to-emerald-900/55",
  },
  fire_beast: {
    title: "FIRE beast mode",
    tagline:
      "You're hunting independence — portfolio and behavior are aligned. Finish the long game with conviction.",
    gradient: "from-amber-300/50 via-lime-300/35 to-emerald-950/60",
  },
};

function resolveStage(health: number, fireProgressPct: number | null): FireJourneyStageMeta {
  const fp = fireProgressPct ?? 0;
  let id: FireJourneyStageId;
  if (health < 36 || fp < 8) id = "foundation";
  else if (health < 48) id = "momentum";
  else if (health < 60 || fp < 22) id = "wealth_acceleration";
  else if (health < 76 || fp < 42) id = "fire_engine";
  else id = "fire_beast";

  const base = STAGES[id];
  return { id, ...base };
}

function buildCards(s: UnifiedFireSummary, pillars: FinancialHealthPillars): GuidanceCard[] {
  const cards: GuidanceCard[] = [];
  const t = s.wealthTotals;
  const inc = s.monthlyIncome;
  const exp = s.monthlyExpenses;
  const sr = s.savingsRatePct;
  const months = s.emergencyFundCoverageMonths;
  const debtRatio = t.totalAssetsNpr > 1e-6 ? t.liabilitiesNpr / t.totalAssetsNpr : t.liabilitiesNpr > 0 ? 1 : 0;
  const invShare = t.totalAssetsNpr > 1e-6 ? s.investmentsLiveNpr / t.totalAssetsNpr : 0;
  const fp = s.fireProgressPct;

  if (inc > 1e-6 && exp > inc * 0.92) {
    cards.push({
      id: "overspend",
      tone: "warn",
      title: "Cashflow pressure",
      body: "Expenses are eating almost all income this month. Trim discretionary buckets or revisit the burn override in Cashflow.",
      priority: 95,
    });
  }

  if (sr !== null && sr < 0) {
    cards.push({
      id: "negative-save",
      tone: "warn",
      title: "Overspending detected",
      body: "Outflows exceed inflows — treat this as a sprint to reset: freeze one category, negotiate EMIs, or bridge with a temporary income bump.",
      priority: 94,
    });
  }

  if (debtRatio > 0.38) {
    cards.push({
      id: "debt-drag",
      tone: "warn",
      title: "Debt ratio is high",
      body: "Liabilities are a large share of gross assets. Use the portfolio liability lines to model pay-down order; cashflow EMI should shrink over time.",
      priority: 88,
    });
  }

  if (months !== null && months < 3 && exp > 1e-6) {
    cards.push({
      id: "ef-low",
      tone: "warn",
      title: "Emergency runway thin",
      body: `About ${months.toFixed(1)} months covered — aim for 3–6 months liquid before raising risk.`,
      priority: 86,
    });
  }

  if (sr !== null && sr >= 28 && inc > 1e-6) {
    cards.push({
      id: "save-hero",
      tone: "praise",
      title: "Savings muscle is strong",
      body: "Strong surplus vs income — funnel part into systematic investments and keep emergency pad separate.",
      priority: 72,
    });
  }

  if (fp !== null && fp < 30 && sr !== null && sr >= 12 && inc > 1e-6) {
    cards.push({
      id: "fire-accel",
      tone: "tip",
      title: "FIRE acceleration window",
      body: "Cashflow discipline is ahead of net-worth progress — dollar-cost into diversified growth assets to close the 25× gap faster.",
      priority: 68,
    });
  }

  if (months !== null && months >= 6 && pillars.savingsRate >= 55) {
    cards.push({
      id: "resilience",
      tone: "celebrate",
      title: "Resilience + discipline",
      body: "Solid emergency runway with respectable savings — you can tilt more toward long-duration growth if goals allow.",
      priority: 58,
    });
  }

  if (invShare < 0.08 && t.netWorthNpr > 0 && t.totalAssetsNpr > 1e6) {
    cards.push({
      id: "diversify",
      tone: "tip",
      title: "Market exposure light",
      body: "Investments are a small slice of assets — review allocation across NEPSE, global ETFs, and metals so growth isn't only property-heavy.",
      priority: 55,
    });
  }

  if (s.retirementWealthNpr / Math.max(t.totalAssetsNpr, 1) < 0.08 && s.retirementWealthNpr < t.netWorthNpr * 0.15) {
    cards.push({
      id: "ret-pillar",
      tone: "tip",
      title: "Retirement pillar room",
      body: "Global retirement balances could grow — max employer matches and pillar contributions before taxable investing.",
      priority: 52,
    });
  }

  return cards.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

function buildSuggestions(s: UnifiedFireSummary, pillars: FinancialHealthPillars): string[] {
  const out: string[] = [];
  const t = s.wealthTotals;
  const debtRatio = t.totalAssetsNpr > 1e-6 ? t.liabilitiesNpr / t.totalAssetsNpr : 0;
  const invShare = t.totalAssetsNpr > 1e-6 ? s.investmentsLiveNpr / t.totalAssetsNpr : 0;

  if (pillars.savingsRate < 52 && s.monthlyIncome > 1e-6) {
    out.push("Reduce recurring expenses or negotiate one bill — even 5% margin lifts savings rate fast.");
  }
  if (pillars.investmentStrength < 55 && t.netWorthNpr > 0) {
    out.push("Increase recurring investments — SIPs, index funds, or NEPSE ladders — on payday before spend temptations.");
  }
  if (pillars.emergencyFund < 58 && s.monthlyExpenses > 1e-6) {
    out.push("Top up emergency cash in a separate liquid account until 6 months of burn are parked.");
  }
  if (debtRatio > 0.28) {
    out.push("Accelerate highest-rate debt paydown; portfolio shows liabilities — align EMI schedules with avalanche strategy.");
  }
  if (invShare > 0.55) {
    out.push("Diversify across asset classes — consider property, metals, or safer sleeves so growth isn't single-bucket concentrated.");
  }
  if (pillars.retirementReadiness < 55) {
    out.push("Improve retirement readiness — consolidate Korea/NPS/SSF rows and bump employer + voluntary contributions.");
  }
  if (out.length === 0) {
    out.push("Keep refreshing Portfolio + Cashflow monthly — small edits compound into clearer FIRE decisions.");
  }
  return [...new Set(out)].slice(0, 6);
}

/**
 * FIRE Nepal Financial Guidance Engine — pure functions over `UnifiedFireSummary`.
 */
export function computeFinancialGuidancePack(summary: UnifiedFireSummary): FinancialGuidancePack {
  const t = summary.wealthTotals;
  const pillars: FinancialHealthPillars = {
    savingsRate: scoreSavingsRate(summary.savingsRatePct, summary.monthlyIncome),
    debtRatio: scoreDebtRatio(t.liabilitiesNpr, t.totalAssetsNpr),
    emergencyFund: scoreEmergency(summary.emergencyFundCoverageMonths, summary.monthlyExpenses),
    investmentStrength: scoreInvestmentStrength(summary.investmentsLiveNpr, t.totalAssetsNpr),
    retirementReadiness: scoreRetirementReadiness(
      summary.retirementWealthNpr,
      t.totalAssetsNpr,
      t.netWorthNpr,
    ),
  };

  const financialHealthScore = weightedHealth(pillars);
  const stage = resolveStage(financialHealthScore, summary.fireProgressPct);

  return {
    financialHealthScore,
    pillars,
    pillarWeights: { ...WEIGHTS },
    stage,
    cards: buildCards(summary, pillars),
    suggestions: buildSuggestions(summary, pillars),
  };
}
