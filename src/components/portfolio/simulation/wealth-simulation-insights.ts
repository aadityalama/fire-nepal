import type { FireSimulationResult, MarketCrashResult, ScenarioId } from "@/components/portfolio/simulation/wealth-simulation-engine";

export type SimulationInsightContext = {
  fireAge: number | null;
  yearsToFi: number | null;
  fireProbabilityPct: number;
  corpusNpr: number;
  monthlyContributionNpr: number;
  passiveMonthlyNpr: number;
  crash: MarketCrashResult;
  activeScenario: ScenarioId;
  displayCurrency: string;
};

function fmtYears(y: number | null): string {
  if (y == null) return "—";
  if (y < 1) return `${Math.round(y * 12)} mo`;
  return `${y.toFixed(1)} yr`;
}

/**
 * Deterministic advisor-style lines for the simulation UI (not ML).
 */
export function buildSimulationInsights(ctx: SimulationInsightContext): string[] {
  const lines: string[] = [];

  if (ctx.fireAge != null && ctx.yearsToFi != null) {
    lines.push(
      `Your modeled trajectory supports financial independence near age ${Math.round(ctx.fireAge)} — roughly ${fmtYears(ctx.yearsToFi)} from today at stated assumptions.`,
    );
  } else {
    lines.push(
      "At current inputs, the corpus target is not reached inside the modeled horizon. Raise contribution, return assumption, or revisit spend to close the gap with intention.",
    );
  }

  if (ctx.fireProbabilityPct >= 72) {
    lines.push("Probability surface reads constructive — momentum is credible if policy stays boring and consistent.");
  } else if (ctx.fireProbabilityPct >= 48) {
    lines.push("Trajectory is workable: small upgrades to savings rate or return assumptions move the needle disproportionately.");
  } else {
    lines.push("Headroom exists, but the path wants structure — tighten the plan before markets ask you to.");
  }

  if (ctx.monthlyContributionNpr > 0 && ctx.yearsToFi != null && ctx.yearsToFi > 3) {
    lines.push(
      `Increasing systematic investable flow by ~12% in this model can materially compress time-to-target — often more than chasing a few extra basis points of return.`,
    );
  }

  if (ctx.passiveMonthlyNpr > 0) {
    lines.push(
      "Passive income is acting as a quiet accelerant — treat it as capital to redeploy, not just spendable noise.",
    );
  }

  if (ctx.crash.survivalProbabilityPct >= 70 && ctx.crash.resilienceScore >= 62) {
    lines.push("Portfolio resilience looks stable under a moderate shock scenario — liquidity and contribution runway matter as much as returns.");
  } else if (ctx.crash.survivalProbabilityPct < 55) {
    lines.push("Under stress, survival probability softens — prioritize cash runway and liability clarity before adding marginal risk.");
  }

  if (ctx.activeScenario === "invest_krw_800k" && ctx.fireAge != null) {
    lines.push("Adding disciplined KRW flow into NPR compounding is one of the fastest levers diaspora balance sheets can pull.");
  }
  if (ctx.activeScenario === "market_crash_35") {
    lines.push("Crash math is illustrative — real recoveries depend on behavior, income stability, and whether leverage forces selling.");
  }

  return lines.slice(0, 6);
}

export function scenarioHeadline(
  scenario: ScenarioId,
  fireAge: number | null,
  yearsToFi: number | null,
): string | null {
  if (scenario === "baseline") return null;
  if (scenario === "invest_krw_800k" && fireAge != null) {
    return `If you invest ₩800k / month → modeled FI near age ${Math.round(fireAge)}.`;
  }
  if (scenario === "invest_plus_20pct" && fireAge != null) {
    return `If you invest ~20% more each month → modeled FI near age ${Math.round(fireAge)}.`;
  }
  if (scenario === "spend_cut_12pct") {
    return "Trimming modeled spend by ~12% shortens the FI runway — behavior beats alpha.";
  }
  if (scenario === "savings_rate_drop") {
    return "If savings rate slips materially, the timeline lengthens — guard the contribution autopilot.";
  }
  if (scenario === "market_crash_35") {
    return "If markets print a −35% shock, the model restarts wealth lower — recovery is contribution-led.";
  }
  if (scenario === "inflation_6") {
    return "If inflation anchors at 6%, real purchasing power lags — nominal returns must earn their keep.";
  }
  if (scenario === "passive_double") {
    return "If passive income doubles, the glide path steepens — optionality compounds faster than ego.";
  }
  if (scenario === "salary_boost") {
    return "If salary growth lifts contributions, FI arrives earlier — the effect is non-linear when time is on your side.";
  }
  if (yearsToFi != null) {
    return `Scenario shifts horizon to ~${fmtYears(yearsToFi)} to target at current rules.`;
  }
  return "Scenario applied — review probability and runway together.";
}
