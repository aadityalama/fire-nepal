/**
 * STEP 9 — Deterministic AI wealth intelligence (rules + desk FIRE engine outputs).
 * No external LLM; all values derive from portfolio, cashflow, and simulation helpers.
 */

import type { FinancialCoachSnapshot } from "@/components/financial-coach/types";
import type { WealthTotals } from "@/components/portfolio/calculations";
import {
  buildFireSimulation,
  dynamicFireProbability,
  type WealthSimulationParams,
} from "@/components/portfolio/simulation/wealth-simulation-engine";

export type AllocationSlice = { label: string; value: number; npr: number };

export type AiWealthWidgetPack = {
  fireProbabilityPct: number;
  riskLevel: string;
  riskSub: string;
  momentumLabel: string;
  momentumSub: string;
  passiveStrength: string;
  passiveSub: string;
  topWeakness: string;
  weaknessSub: string;
  nextMilestone: string;
  milestoneSub: string;
};

export type AiPortfolioIntelLine = {
  id: string;
  title: string;
  detail: string;
  tone: "ok" | "watch" | "risk";
};

export type AiKoreaIntelLine = {
  id: string;
  title: string;
  detail: string;
};

export type AiWealthAlert = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warn" | "critical";
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function buildAiWealthWidgets(
  totals: WealthTotals,
  allocation: AllocationSlice[],
  snapshot: FinancialCoachSnapshot,
  baseParams: WealthSimulationParams,
  fireScore: number,
): AiWealthWidgetPack {
  const sorted = [...allocation].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const topPct = top?.value ?? 0;
  let riskLevel = "Balanced";
  let riskSub = "Allocation spread looks reasonable for a diaspora balance sheet.";
  if (topPct >= 52) {
    riskLevel = "Concentrated";
    riskSub = `${top?.label ?? "Largest"} sleeve is ${topPct.toFixed(0)}% — diversification drag if macro shifts.`;
  } else if (topPct >= 38) {
    riskLevel = "Moderate";
    riskSub = `Largest sleeve ${top?.label ?? "—"} at ${topPct.toFixed(0)}% — watch liquidity if income pauses.`;
  }

  const debtRatio = totals.totalAssetsNpr > 0 ? totals.liabilitiesNpr / totals.totalAssetsNpr : 0;
  const sim = buildFireSimulation(baseParams, { maxYears: 45, fireReadinessScore: fireScore, debtRatio });
  const fireProbabilityPct = dynamicFireProbability(
    snapshot.monthsToFi ?? sim.monthsToFi,
    sim.retirementReadyRatio,
    fireScore,
    debtRatio,
  );

  let momentumLabel = "Steady";
  let momentumSub = "Track monthly wealth delta in portfolio history for trend confirmation.";
  const d = snapshot.lastNwDeltaNpr ?? snapshot.avgNwDeltaNpr;
  if (d != null) {
    if (d > 75_000) {
      momentumLabel = "Strong";
      momentumSub = `Recent momentum ≈ ${(d / 1000).toFixed(0)}k NPR/mo — keep policy boring.`;
    } else if (d < -25_000) {
      momentumLabel = "Soft";
      momentumSub = "Negative month delta — review burn, FX, or one-off hits before changing risk.";
    } else {
      momentumLabel = "Building";
      momentumSub = `Month delta near ${(d / 1000).toFixed(0)}k NPR — consistency beats hero trades.`;
    }
  }

  const passiveRatio =
    snapshot.totalIncomeNpr > 0 ? clamp((snapshot.passiveMonthlyNpr * 12) / snapshot.totalIncomeNpr, 0, 3) : 0;
  let passiveStrength = passiveRatio >= 0.18 ? "Resilient" : passiveRatio >= 0.08 ? "Growing" : "Thin";
  let passiveSub =
    passiveRatio >= 0.18
      ? "Passive stack meaningfully offsets salary dependence."
      : passiveRatio >= 0.08
        ? "Passive income is visible — reinvest the wedge before lifestyle absorbs it."
        : "Passive layer is small — prioritize dividend/FD runway before sizing lux spend.";

  let topWeakness = "Savings rhythm";
  let weaknessSub = "Raise savings rate or automate KRW→NPR invest before chasing return.";
  if ((snapshot.savingsRatePct ?? 0) < 12 && snapshot.totalIncomeNpr > 0) {
    topWeakness = "Low savings rate";
    weaknessSub = `Modeled savings rate ~${snapshot.savingsRatePct?.toFixed(0) ?? "—"}% — easiest lever is burn, not alpha.`;
  } else if ((snapshot.coverageMonths ?? 0) < 3 && snapshot.coverageMonths != null) {
    topWeakness = "Emergency runway";
    weaknessSub = "Coverage under ~3 months — shore cash before adding marginal risk.";
  } else if (debtRatio > 0.28) {
    topWeakness = "Leverage drag";
    weaknessSub = "Debt/Assets elevated — liability clarity unlocks better FIRE timing.";
  }

  let nextMilestone = "FI corpus glide";
  let milestoneSub =
    snapshot.fireAge != null
      ? `Desk model points near age ${Math.round(snapshot.fireAge)} at current rules (illustrative).`
      : "Extend contribution runway or trim modeled spend to bring FI age inside horizon.";

  return {
    fireProbabilityPct,
    riskLevel,
    riskSub,
    momentumLabel,
    momentumSub,
    passiveStrength,
    passiveSub,
    topWeakness,
    weaknessSub,
    nextMilestone,
    milestoneSub,
  };
}

export function buildAiPortfolioIntel(
  totals: WealthTotals,
  allocation: AllocationSlice[],
  snapshot: FinancialCoachSnapshot,
): AiPortfolioIntelLine[] {
  const invShare = totals.totalAssetsNpr > 0 ? totals.investmentsLiveNpr / totals.totalAssetsNpr : 0;
  const liqShare = totals.totalAssetsNpr > 0 ? totals.liquidNpr / totals.totalAssetsNpr : 0;
  const retShare = totals.totalAssetsNpr > 0 ? totals.retirementNpr / totals.totalAssetsNpr : 0;

  const lines: AiPortfolioIntelLine[] = [
    {
      id: "alloc",
      title: "Asset allocation posture",
      detail: `Investments ~${(invShare * 100).toFixed(0)}% of assets · Liquid ~${(liqShare * 100).toFixed(0)}%.`,
      tone: liqShare < 0.08 ? "watch" : "ok",
    },
    {
      id: "div",
      title: "Diversification",
      detail:
        allocation.length >= 4
          ? `${allocation.length} sleeves tracked — keep correlation in mind across NEPSE vs abroad.`
          : "Few sleeves visible — add asset classes to reduce single-factor shock.",
      tone: allocation.length < 3 ? "watch" : "ok",
    },
    {
      id: "conc",
      title: "Concentration",
      detail: (() => {
        const top = [...allocation].sort((a, b) => b.value - a.value)[0];
        return top ? `Largest: ${top.label} ${top.value.toFixed(1)}%` : "Add holdings to measure concentration.";
      })(),
      tone: (() => {
        const top = [...allocation].sort((a, b) => b.value - a.value)[0]?.value ?? 0;
        return top >= 48 ? "risk" : top >= 35 ? "watch" : "ok";
      })(),
    },
    {
      id: "fx",
      title: "Currency exposure (KRW proxy)",
      detail:
        retShare > 0.22
          ? `Global retirement sleeves ~${(retShare * 100).toFixed(0)}% — often KRW/USD linked; track remittance windows.`
          : "Mark KRW cash and Korean DC balances explicitly to quantify won sensitivity vs NPR goals.",
      tone: retShare > 0.4 ? "watch" : "ok",
    },
    {
      id: "trend",
      title: "Wealth momentum vs history",
      detail:
        snapshot.avgNwDeltaNpr != null
          ? `Trailing avg delta ≈ NPR ${Math.round(snapshot.avgNwDeltaNpr).toLocaleString()} / month.`
          : "Log a few months of net worth history to unlock momentum analytics.",
      tone: snapshot.avgNwDeltaNpr != null && snapshot.avgNwDeltaNpr < 0 ? "watch" : "ok",
    },
    {
      id: "cagr",
      title: "CAGR quality (heuristic)",
      detail:
        snapshot.fireScore >= 68
          ? "FIRE readiness score constructive — compounding window is doing work."
          : "Readiness score has headroom — contributions usually beat return chasing.",
      tone: snapshot.fireScore < 48 ? "watch" : "ok",
    },
  ];
  return lines;
}

export function buildAiKoreaWorkerIntel(snapshot: FinancialCoachSnapshot, krwPerNpr: number): AiKoreaIntelLine[] {
  const krwSalary = snapshot.salaryNpr * krwPerNpr;
  const krwOt = snapshot.overtimeNpr * krwPerNpr;
  const otShare =
    snapshot.salaryNpr + snapshot.overtimeNpr > 0 ? snapshot.overtimeNpr / (snapshot.salaryNpr + snapshot.overtimeNpr) : 0;
  return [
    {
      id: "fx",
      title: "KRW → NPR intelligence",
      detail: `Live desk uses ₩1 ≈ NPR ${krwPerNpr.toFixed(2)} — remit on strong NPR stretches when fees allow.`,
    },
    {
      id: "remit",
      title: "Remittance optimization",
      detail: "Batch transfers, compare spread + flat fee, and park KRW overnight in FD-tier cash before NPR deploy.",
    },
    {
      id: "salary",
      title: "Korean salary tracking",
      detail:
        krwSalary > 0
          ? `Salary flow ≈ ₩${Math.round(krwSalary).toLocaleString()} / mo at current inputs.`
          : "Wire salary into cashflow dashboard for Korea-accurate FX views.",
    },
    {
      id: "ot",
      title: "Overtime income analysis",
      detail:
        otShare > 0.12
          ? `Overtime ~${(otShare * 100).toFixed(0)}% of earned income — model lifestyle creep if OT fades.`
          : "Overtime share modest — good for predictable savings autopilot.",
    },
    {
      id: "saveproj",
      title: "Savings projection",
      detail: `Investable cashflow NPR ${Math.round(snapshot.investableCashflowNpr).toLocaleString()} — route a fixed % to NPR compounding monthly.`,
    },
    {
      id: "visa",
      title: "Visa-period planning",
      detail: "Build 6–9 month NPR + KRW liquidity before contract breaks; align tax residency with remittance calendar.",
    },
  ];
}

export function buildAiWealthAlerts(snapshot: FinancialCoachSnapshot): AiWealthAlert[] {
  const out: AiWealthAlert[] = [];
  if (snapshot.monthlyBurnNpr > snapshot.totalIncomeNpr * 0.92 && snapshot.totalIncomeNpr > 0) {
    out.push({
      id: "over",
      title: "Overspending warning",
      body: "Burn is eating most of income — freeze discretionary until savings rate recovers.",
      severity: "critical",
    });
  }
  if ((snapshot.savingsRatePct ?? 100) < 10 && snapshot.totalIncomeNpr > 0) {
    out.push({
      id: "sr",
      title: "Low savings rate",
      body: "Savings rate under 10% slows FI clock — automate KRW→NPR invest on payday.",
      severity: "warn",
    });
  }
  if (snapshot.monthsToFi != null && snapshot.monthsToFi > 480) {
    out.push({
      id: "fire",
      title: "FIRE delay risk",
      body: "Modeled FI beyond 40 years — revisit spend, return assumptions, or contribution step-ups.",
      severity: "warn",
    });
  }
  if ((snapshot.coverageMonths ?? 99) < 2.5) {
    out.push({
      id: "ef",
      title: "Emergency fund weakness",
      body: "Coverage under ~2.5 months — prioritize cash before adding risk assets.",
      severity: "warn",
    });
  }
  out.push({
    id: "inf",
    title: "Inflation impact",
    body: "Desk model uses 5.5% inflation — if rents reprice faster, real FI date slips unless income scales.",
    severity: "info",
  });
  if (snapshot.portfolioResilienceScore < 52) {
    out.push({
      id: "imb",
      title: "Portfolio imbalance / stress",
      body: "Resilience score soft — add liquid buffer and reduce single sleeve dominance.",
      severity: "warn",
    });
  }
  return out.slice(0, 8);
}

export function koreaVsNepalScenario(snapshot: FinancialCoachSnapshot): { korea: string; nepal: string } {
  const rent = snapshot.rentExpenseNpr;
  const food = snapshot.foodExpenseNpr;
  const burn = snapshot.monthlyBurnNpr || 1;
  const housingPressure = rent / burn;
  return {
    korea: `Seoul-style pressure: housing often ${(housingPressure * 100).toFixed(0)}%+ of modeled burn — leverage OT + employer match before lifestyle ratchet.`,
    nepal: `Kathmandu-style upside: if housing/food reprices lower in NPR terms, surplus can accelerate NPR compounding — model −15 to −25% burn as scenario anchor.`,
  };
}
