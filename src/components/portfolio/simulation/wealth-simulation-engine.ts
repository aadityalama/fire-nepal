import type { WealthTotals } from "@/components/portfolio/calculations";

export type SimCurrency = "NPR" | "KRW" | "USD";

/** All wealth paths & contributions are modeled in NPR; UI converts for display. */
export type WealthSimulationParams = {
  currentAge: number;
  monthlySpendNpr: number;
  /** Safe withdrawal rate (annual), default 4%. */
  swrAnnual: number;
  startingNetWorthNpr: number;
  monthlyContributionNpr: number;
  /** Nominal portfolio return (annual). */
  nominalReturnAnnual: number;
  inflationAnnual: number;
  /** Escalation on monthly contribution (annual). */
  salaryGrowthAnnual: number;
  passiveMonthlyStartNpr: number;
  passiveGrowthAnnual: number;
};

export type MonthPoint = {
  monthIndex: number;
  yearFrac: number;
  nominalNpr: number;
  /** Purchasing power in today’s NPR terms (Fisher-style deflator). */
  realNpr: number;
};

/** Parallel series aligned by `path[i].monthIndex === i` — visualization / milestones only. */
export type WealthPathBundle = {
  path: MonthPoint[];
  contribMonthlyNpr: number[];
  passiveMonthlyFlowNpr: number[];
};

export type HorizonSnapshot = {
  years: 5 | 10 | 20;
  nominalNpr: number;
  realNpr: number;
};

export type FireSimulationResult = {
  corpusNpr: number;
  monthsToFi: number | null;
  fireAge: number | null;
  yearsToFi: number | null;
  retirementReadyRatio: number;
  fireProbabilityPct: number;
  path: MonthPoint[];
  /** Same trajectory as `path`, plus monthly flows for chart overlays (derived from identical math). */
  pathBundle: WealthPathBundle;
  horizons: HorizonSnapshot[];
};

export type MarketCrashResult = {
  /** 0–100: balance-sheet buffer vs shock. */
  resilienceScore: number;
  /** 0–100 heuristic: ability to endure drawdown without forced liquidation. */
  survivalProbabilityPct: number;
  /** Months until nominal net worth recovers to pre-shock level (cap 600). */
  recoveryMonths: number | null;
  /** 0–100: liquidity + low leverage proxy. */
  defensiveStrength: number;
  postShockNetWorthNpr: number;
};

export type ScenarioId =
  | "baseline"
  | "invest_krw_800k"
  | "invest_plus_20pct"
  | "spend_cut_12pct"
  | "savings_rate_drop"
  | "market_crash_35"
  | "inflation_6"
  | "passive_double"
  | "salary_boost";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function pow1p(annual: number, monthsElapsed: number): number {
  return Math.pow(1 + annual, monthsElapsed / 12);
}

/** Nominal month-on-month return factor from annual compound rate. */
function growthFactorMonthly(annual: number): number {
  return Math.pow(1 + annual, 1 / 12);
}

/**
 * Month-by-month nominal balance with contributions & passive flows (both escalated).
 * Real path deflates cumulative CPI.
 */
export function simulateWealthPathBundle(p: WealthSimulationParams, maxMonths: number): WealthPathBundle {
  const g = growthFactorMonthly(p.nominalReturnAnnual);
  const path: MonthPoint[] = [];
  const contribMonthlyNpr: number[] = [];
  const passiveMonthlyFlowNpr: number[] = [];
  let B = Math.max(0, p.startingNetWorthNpr);
  const corpus = fireCorpusFromSpend(p.monthlySpendNpr, p.swrAnnual);

  path.push({
    monthIndex: 0,
    yearFrac: 0,
    nominalNpr: B,
    realNpr: B,
  });
  contribMonthlyNpr.push(0);
  passiveMonthlyFlowNpr.push(p.passiveMonthlyStartNpr);

  const capMonths = Math.max(0, Math.min(600, Math.floor(maxMonths)));

  for (let m = 1; m <= capMonths; m++) {
    const contrib = p.monthlyContributionNpr * pow1p(p.salaryGrowthAnnual, m - 1);
    const passive = p.passiveMonthlyStartNpr * pow1p(p.passiveGrowthAnnual, m - 1);
    B = B * g + contrib + passive;
    if (!Number.isFinite(B)) B = corpus * 1.5;
    const real = B / pow1p(p.inflationAnnual, m);
    path.push({
      monthIndex: m,
      yearFrac: m / 12,
      nominalNpr: B,
      realNpr: real,
    });
    contribMonthlyNpr.push(contrib);
    passiveMonthlyFlowNpr.push(passive);
  }
  return { path, contribMonthlyNpr, passiveMonthlyFlowNpr };
}

export function simulateWealthPath(p: WealthSimulationParams, maxMonths: number): MonthPoint[] {
  return simulateWealthPathBundle(p, maxMonths).path;
}

export function buildNominalStressOverlay(
  pathLength: number,
  p: WealthSimulationParams,
  shockMonthIndex: number,
  postShockNpr: number,
): (number | null)[] {
  const len = Math.max(0, pathLength);
  const shock = clamp(Math.floor(shockMonthIndex), 1, Math.max(1, len - 2));
  const out: (number | null)[] = new Array(len).fill(null);
  const g = growthFactorMonthly(p.nominalReturnAnnual);
  let B = Math.max(0, postShockNpr);
  out[shock] = B;
  for (let m = shock + 1; m < len; m++) {
    const contrib = p.monthlyContributionNpr * pow1p(p.salaryGrowthAnnual, m - 1);
    const passive = p.passiveMonthlyStartNpr * pow1p(p.passiveGrowthAnnual, m - 1);
    B = B * g + contrib + passive;
    if (!Number.isFinite(B)) break;
    out[m] = B;
  }
  return out;
}
export function fireCorpusFromSpend(monthlySpendNpr: number, swrAnnual = 0.04): number {
  const spend = Math.max(0, monthlySpendNpr);
  const swr = swrAnnual > 0.005 ? swrAnnual : 0.04;
  return (spend * 12) / swr;
}

export function findFirstMonthAtOrAboveCorpus(path: MonthPoint[], corpusNpr: number): number | null {
  if (!(corpusNpr > 0)) return null;
  const idx = path.findIndex((pt) => pt.nominalNpr >= corpusNpr);
  return idx >= 0 ? idx : null;
}

export function buildFireSimulation(
  p: WealthSimulationParams,
  opts?: { maxYears?: number; fireReadinessScore?: number; debtRatio?: number },
): FireSimulationResult {
  const maxYears = opts?.maxYears ?? 50;
  const months = Math.ceil(maxYears * 12) + 1;
  const pathBundle = simulateWealthPathBundle(p, months);
  const path = pathBundle.path;
  const corpusNpr = fireCorpusFromSpend(p.monthlySpendNpr, p.swrAnnual);
  const monthsToFi = findFirstMonthAtOrAboveCorpus(path, corpusNpr);
  const yearsToFi = monthsToFi != null ? monthsToFi / 12 : null;
  const fireAge = monthsToFi != null ? p.currentAge + monthsToFi / 12 : null;
  const nw0 = path[0]?.nominalNpr ?? 0;
  const ready = corpusNpr > 0 ? clamp(nw0 / corpusNpr, 0, 2) : 0;

  const horizons: HorizonSnapshot[] = [5, 10, 20].map((years) => {
    const idx = Math.min(path.length - 1, years * 12);
    const pt = path[idx] ?? path[path.length - 1];
    return {
      years: years as 5 | 10 | 20,
      nominalNpr: pt.nominalNpr,
      realNpr: pt.realNpr,
    };
  });

  const fireProbabilityPct = dynamicFireProbability(
    monthsToFi,
    ready,
    opts?.fireReadinessScore,
    opts?.debtRatio,
  );

  return {
    corpusNpr,
    monthsToFi,
    fireAge,
    yearsToFi,
    retirementReadyRatio: ready,
    fireProbabilityPct,
    path,
    pathBundle,
    horizons,
  };
}

/**
 * Display-only probability surface: blends horizon to FI, funding ratio, optional dashboard score, debt drag.
 * Does not replace actuarial or Monte Carlo methods.
 */
export function dynamicFireProbability(
  monthsToFi: number | null,
  fundingRatio: number,
  fireReadinessScore?: number,
  debtRatio?: number,
): number {
  let s = 34;
  if (monthsToFi != null) {
    const y = monthsToFi / 12;
    s += clamp(48 - y * 2.4, 0, 48);
  } else {
    s += 6;
  }
  s += clamp(fundingRatio * 28, 0, 28);
  if (fireReadinessScore != null) {
    s = s * 0.52 + fireReadinessScore * 0.48;
  }
  if (debtRatio != null) {
    s -= clamp(debtRatio * 22, 0, 22);
  }
  return Math.round(clamp(s, 6, 97));
}

export function applyScenario(
  base: WealthSimulationParams,
  scenario: ScenarioId,
  krwPerNpr: number,
): WealthSimulationParams {
  const krwToNpr = (krw: number) => (krwPerNpr > 0 ? krw / krwPerNpr : 0);
  switch (scenario) {
    case "baseline":
      return { ...base };
    case "invest_krw_800k":
      return { ...base, monthlyContributionNpr: base.monthlyContributionNpr + krwToNpr(800_000) };
    case "invest_plus_20pct":
      return { ...base, monthlyContributionNpr: base.monthlyContributionNpr * 1.2 };
    case "spend_cut_12pct":
      return { ...base, monthlySpendNpr: Math.max(0, base.monthlySpendNpr * 0.88) };
    case "savings_rate_drop":
      return { ...base, monthlyContributionNpr: base.monthlyContributionNpr * 0.72 };
    case "market_crash_35":
      return { ...base, startingNetWorthNpr: base.startingNetWorthNpr * 0.65 };
    case "inflation_6":
      return { ...base, inflationAnnual: 0.06 };
    case "passive_double":
      return { ...base, passiveMonthlyStartNpr: base.passiveMonthlyStartNpr * 2 };
    case "salary_boost":
      return { ...base, salaryGrowthAnnual: base.salaryGrowthAnnual + 0.02 };
    default:
      return { ...base };
  }
}

export function scenarioDeltaYearsToFi(
  base: WealthSimulationParams,
  scenario: ScenarioId,
  krwPerNpr: number,
  ctx?: { fireReadinessScore?: number; debtRatio?: number },
): { label: string; baseYears: number | null; scenarioYears: number | null; deltaYears: number | null } {
  const b = buildFireSimulation(base, ctx);
  const s = buildFireSimulation(applyScenario(base, scenario, krwPerNpr), ctx);
  const baseYears = b.yearsToFi;
  const scenarioYears = s.yearsToFi;
  const deltaYears =
    baseYears != null && scenarioYears != null ? scenarioYears - baseYears : baseYears == null && scenarioYears == null ? null : scenarioYears != null && baseYears == null ? scenarioYears : baseYears != null && scenarioYears == null ? -baseYears : null;
  const labels: Record<ScenarioId, string> = {
    baseline: "Baseline",
    invest_krw_800k: "+ ₩800k / mo invest",
    invest_plus_20pct: "+20% monthly invest",
    spend_cut_12pct: "Spend −12% (retire-earlier proxy)",
    savings_rate_drop: "Savings −28%",
    market_crash_35: "−35% shock (simplified)",
    inflation_6: "Inflation 6%",
    passive_double: "Passive ×2",
    salary_boost: "Salary growth +2% / yr",
  };
  return { label: labels[scenario], baseYears, scenarioYears, deltaYears };
}

export function marketCrashSimulation(args: {
  netWorthNpr: number;
  monthlySpendNpr: number;
  investableShare: number;
  liquidMonthlyNpr: number;
  monthlyContributionNpr: number;
  nominalReturnAnnual: number;
  /** Reserved for real recovery paths; nominal recovery used for months count. */
  inflationAnnual: number;
  crashDrawdownPct: number;
}): MarketCrashResult {
  const {
    netWorthNpr,
    monthlySpendNpr,
    investableShare,
    liquidMonthlyNpr,
    monthlyContributionNpr,
    nominalReturnAnnual,
    inflationAnnual: _inflationAnnual,
    crashDrawdownPct,
  } = args;
  const shockFactor = 1 - clamp(crashDrawdownPct, 0, 0.95) * clamp(investableShare, 0, 1) * 0.92;
  const post = Math.max(0, netWorthNpr * shockFactor);
  const monthsLiquidCover = monthlySpendNpr > 0 ? liquidMonthlyNpr / monthlySpendNpr : liquidMonthlyNpr > 0 ? 99 : 0;
  const defensiveStrength = Math.round(
    clamp(38 + monthsLiquidCover * 8 + (1 - clamp(investableShare, 0, 1)) * 12, 12, 98),
  );
  const survivalProbabilityPct = Math.round(
    clamp(42 + monthsLiquidCover * 7 + defensiveStrength * 0.22 - crashDrawdownPct * 40, 8, 96),
  );
  const resilienceScore = Math.round(
    clamp(36 + defensiveStrength * 0.35 + survivalProbabilityPct * 0.35 - crashDrawdownPct * 28, 10, 98),
  );

  const pre = netWorthNpr;
  if (!(pre > 0) || !(post >= 0)) {
    return {
      resilienceScore: Math.round(clamp(resilienceScore * 0.6, 8, 90)),
      survivalProbabilityPct: Math.round(clamp(survivalProbabilityPct * 0.85, 8, 94)),
      recoveryMonths: null,
      defensiveStrength,
      postShockNetWorthNpr: post,
    };
  }

  const g = growthFactorMonthly(nominalReturnAnnual);
  let B = post;
  let recoveryMonths: number | null = null;
  const cap = 600;
  for (let m = 1; m <= cap; m++) {
    B = B * g + monthlyContributionNpr;
    if (B >= pre) {
      recoveryMonths = m;
      break;
    }
  }

  return {
    resilienceScore,
    survivalProbabilityPct,
    recoveryMonths,
    defensiveStrength,
    postShockNetWorthNpr: post,
  };
}

export function nprToCurrency(npr: number, c: SimCurrency, krwPerNpr: number, usdPerNpr: number): number {
  if (!Number.isFinite(npr)) return 0;
  if (c === "NPR") return npr;
  if (c === "KRW") return npr * krwPerNpr;
  return npr * usdPerNpr;
}

export function fxSensitivityRange(
  npr: number,
  c: SimCurrency,
  krwPerNpr: number,
  usdPerNpr: number,
  shock = 0.1,
): { low: number; mid: number; high: number } {
  const mid = nprToCurrency(npr, c, krwPerNpr, usdPerNpr);
  if (c === "NPR") {
    return { low: npr * (1 - shock), mid, high: npr * (1 + shock) };
  }
  const low = nprToCurrency(npr, c, krwPerNpr * (1 + shock), usdPerNpr * (1 + shock));
  const high = nprToCurrency(npr, c, krwPerNpr * (1 - shock), usdPerNpr * (1 - shock));
  return { low: Math.min(low, high), mid, high: Math.max(low, high) };
}

export function inferDefaultAgeFromPortfolio(rows: { currentAge?: number }[]): number {
  const ages = rows.map((r) => r.currentAge).filter((a): a is number => typeof a === "number" && a > 17 && a < 90);
  if (!ages.length) return 35;
  return Math.round(ages.reduce((s, a) => s + a, 0) / ages.length);
}

export function defaultMonthlySpendFromPortfolio(totals: WealthTotals, passiveMonthlyNpr: number): number {
  if (totals.netWorthNpr <= 0 && passiveMonthlyNpr <= 0) return 0;
  const implied = passiveMonthlyNpr > 0 ? passiveMonthlyNpr * 1.05 : 0;
  if (totals.netWorthNpr <= 0) return Math.round(Math.max(0, implied));
  const floor = 85_000;
  const fromNw = clamp(totals.netWorthNpr * 0.00035, 70_000, 450_000);
  return Math.round(Math.max(floor, implied > 0 ? implied : fromNw));
}
