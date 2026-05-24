/** All money amounts in NPR for consistent FIRE math; UI converts for display. */

export type FireProjectionParams = {
  currentSavingsNpr: number;
  monthlySavingsNpr: number;
  currentAge: number;
  annualReturnPct: number;
  monthlyExpenseNpr: number;
};

export type FireProjectionResult = {
  fireAge: number;
  monthsToFire: number;
  yearsToFire: number;
  passiveIncomeNpr: number;
  progressPct: number;
  projectedCorpusNpr: number;
  requiredCorpusNpr: number;
};

/** Post-retirement drawdown policy (optional legacy planning). */
export type WealthLegacyMode = "default" | "perpetual" | "spenddown";

export type WealthSimulationParams = FireProjectionParams & {
  /** Annual inflation applied to retirement monthly expenses (e.g. 3 = 3%). */
  expenseInflationAnnualPct: number;
  /** Safe withdrawal cap as % of portfolio per year (e.g. 4 = 4% / year), used in `perpetual` mode. */
  safeWithdrawalRatePct: number;
  legacyMode: WealthLegacyMode;
  /** For `spenddown`: age by which the model tries to fully spend investable wealth. */
  spenddownTargetAge: number;
};

export type WealthLifecycleYear = {
  age: number;
  calendarYear: number;
  /** Actual portfolio (accumulation + drawdown). */
  balanceActualNpr: number;
  /** Hypothetical: keep accumulating until FIRE, then growth-only (no new contributions). */
  balanceGrowthTrackNpr: number;
  phase: "accumulate" | "decumulate";
};

export type WealthLifecycleResult = {
  yearly: WealthLifecycleYear[];
  fireAgeYears: number;
  monthsToFire: number;
  peakWealthAge: number;
  peakWealthNpr: number;
  /** First age where balance effectively hits zero in simulation; null if solvent through horizon. */
  depletionAge: number | null;
  /** Age through which balance stays positive (horizon cap 100). */
  solventThroughAge: number;
  /** True if expenses exceed SWR cap in perpetual mode (lifestyle gap). */
  perpetualShortfall: boolean;
};

const MAX_SIM_MONTHS = 100 * 12;
const EPS = 50;

export function calculateFireProjection({
  currentSavingsNpr,
  monthlySavingsNpr,
  currentAge,
  annualReturnPct,
  monthlyExpenseNpr,
}: FireProjectionParams): FireProjectionResult {
  const requiredCorpusNpr = monthlyExpenseNpr * 12 * 25;
  const monthlyReturn = annualReturnPct / 100 / 12;
  let projectedCorpusNpr = currentSavingsNpr;
  let monthsToFire = 0;
  const maxMonths = 80 * 12;

  while (projectedCorpusNpr < requiredCorpusNpr && monthsToFire < maxMonths) {
    projectedCorpusNpr = projectedCorpusNpr * (1 + monthlyReturn) + monthlySavingsNpr;
    monthsToFire += 1;
  }

  const yearsToFire = monthsToFire / 12;
  const fireAge = currentAge + Math.ceil(yearsToFire);
  const passiveIncomeNpr = projectedCorpusNpr * 0.04 / 12;
  const progressPct =
    requiredCorpusNpr > 0 ? Math.min(100, Math.round((currentSavingsNpr / requiredCorpusNpr) * 100)) : 0;

  return {
    fireAge,
    monthsToFire,
    yearsToFire,
    passiveIncomeNpr,
    progressPct,
    projectedCorpusNpr,
    requiredCorpusNpr,
  };
}

/**
 * Month-by-month wealth path: accumulate until 25× rule (same month count as `calculateFireProjection`),
 * then inflation-adjusted withdrawals. Growth track = contributions through FIRE, then return-only.
 */
export function simulateWealthLifecycle(params: WealthSimulationParams): WealthLifecycleResult {
  const monthlyReturn = params.annualReturnPct / 100 / 12;
  const monthlyInfl = Math.pow(1 + params.expenseInflationAnnualPct / 100, 1 / 12);
  const fireBase = calculateFireProjection(params);
  const monthsToFire = fireBase.monthsToFire;

  let balance = params.currentSavingsNpr;
  let growthTrack = params.currentSavingsNpr;
  let inflExpense = params.monthlyExpenseNpr;
  let perpetualShortfall = false;

  const monthlySnapshots: {
    age: number;
    calendarYear: number;
    balanceActual: number;
    balanceGrowth: number;
    phase: "accumulate" | "decumulate";
  }[] = [];

  let peakWealthNpr = balance;
  let peakWealthAge = params.currentAge;
  let depletionAge: number | null = null;

  const startYear = new Date().getFullYear();

  for (let m = 0; m < MAX_SIM_MONTHS; m += 1) {
    const ageEndOfMonth = params.currentAge + (m + 1) / 12;
    const calendarYear = startYear + Math.floor(m / 12);
    const accumulating = m < monthsToFire;

    if (accumulating) {
      balance = balance * (1 + monthlyReturn) + params.monthlySavingsNpr;
      growthTrack = growthTrack * (1 + monthlyReturn) + params.monthlySavingsNpr;
    } else {
      const afterGrowth = balance * (1 + monthlyReturn);
      const need = inflExpense;
      inflExpense *= monthlyInfl;
      let withdrawal = Math.min(need, afterGrowth);

      if (params.legacyMode === "perpetual") {
        const safeCap = (params.safeWithdrawalRatePct / 100) / 12 * afterGrowth;
        withdrawal = Math.min(need, safeCap);
        if (need > safeCap + EPS) perpetualShortfall = true;
      } else if (params.legacyMode === "spenddown") {
        const target = Math.max(params.currentAge + 1, params.spenddownTargetAge);
        const monthsLeftToTarget = Math.max(1, Math.round((target - ageEndOfMonth) * 12));
        withdrawal = Math.min(afterGrowth, Math.max(need, afterGrowth / monthsLeftToTarget));
      }

      withdrawal = Math.min(withdrawal, afterGrowth);
      balance = afterGrowth - withdrawal;
      growthTrack = growthTrack * (1 + monthlyReturn);
    }

    if (balance >= peakWealthNpr) {
      peakWealthNpr = balance;
      peakWealthAge = ageEndOfMonth;
    }

    monthlySnapshots.push({
      age: ageEndOfMonth,
      calendarYear,
      balanceActual: Math.max(0, balance),
      balanceGrowth: Math.max(0, growthTrack),
      phase: accumulating ? "accumulate" : "decumulate",
    });

    if (!accumulating && balance <= EPS) {
      depletionAge = ageEndOfMonth;
      break;
    }
  }

  const fireAgeYears = params.currentAge + monthsToFire / 12;

  const yearly: WealthLifecycleYear[] = [];
  const byYear = new Map<number, (typeof monthlySnapshots)[0]>();

  for (const snap of monthlySnapshots) {
    byYear.set(snap.calendarYear, snap);
  }
  const sortedYears = [...byYear.keys()].sort((a, b) => a - b);
  for (const y of sortedYears) {
    const snap = byYear.get(y)!;
    yearly.push({
      age: snap.age,
      calendarYear: y,
      balanceActualNpr: snap.balanceActual,
      balanceGrowthTrackNpr: snap.balanceGrowth,
      phase: snap.phase,
    });
  }

  const last = monthlySnapshots[monthlySnapshots.length - 1];
  const solventThroughAge = last ? Math.min(100, Math.round(last.age * 10) / 10) : params.currentAge;

  return {
    yearly,
    fireAgeYears: fireBase.fireAge,
    monthsToFire: fireBase.monthsToFire,
    peakWealthAge,
    peakWealthNpr,
    depletionAge,
    solventThroughAge,
    perpetualShortfall,
  };
}

export type YearlySavingsPoint = {
  year: number;
  balanceNpr: number;
  contributionsOnlyNpr: number;
};

export function buildYearlySavingsSeries(
  params: FireProjectionParams,
  opts?: { minYears?: number },
): YearlySavingsPoint[] {
  const monthlyReturn = params.annualReturnPct / 100 / 12;
  const base = calculateFireProjection(params);
  const yearsToFireCeil = Math.ceil(base.yearsToFire);
  const horizonYears = Math.min(45, Math.max(opts?.minYears ?? 8, yearsToFireCeil + 3));

  const startYear = new Date().getFullYear();
  const out: YearlySavingsPoint[] = [];

  let bal = params.currentSavingsNpr;
  let contrib = params.currentSavingsNpr;

  for (let y = 0; y <= horizonYears; y += 1) {
    out.push({ year: startYear + y, balanceNpr: bal, contributionsOnlyNpr: contrib });
    for (let m = 0; m < 12; m += 1) {
      bal = bal * (1 + monthlyReturn) + params.monthlySavingsNpr;
      contrib += params.monthlySavingsNpr;
    }
  }

  return out;
}

export function impliedHorizonGrowthPct(points: YearlySavingsPoint[]): number | null {
  if (points.length < 2) return null;
  const a = points[0]?.balanceNpr ?? 0;
  const b = points[points.length - 1]?.balanceNpr ?? 0;
  if (a <= 0) return null;
  return ((b - a) / a) * 100;
}
