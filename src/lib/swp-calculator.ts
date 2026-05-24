export type SwpCurrency = "KRW" | "NPR";

export interface SwpInputs {
  initialCorpus: number;
  monthlyWithdrawal: number;
  annualReturnPct: number;
  annualInflationPct: number;
  horizonYears: number;
}

export interface SwpYearPoint {
  year: number;
  /** End-of-year balance when withdrawals grow with inflation. */
  balanceWithInflation: number;
  /** End-of-year balance when monthly withdrawal stays constant. */
  balanceFlatWithdrawal: number;
  /** Sum of withdrawals during that year (inflation path). */
  withdrawalsNominal: number;
  /** Sum of withdrawals that year on the flat path (always W0 × months). */
  withdrawalsFlat: number;
}

export interface SwpSimulationResult {
  yearly: SwpYearPoint[];
  depletionMonth: number | null;
  depletionMonthFlat: number | null;
  totalWithdrawalsNominal: number;
  totalWithdrawalsFlat: number;
  endingBalanceNominal: number;
  endingBalanceFlat: number;
  survivalYears: number;
  survivalYearsDisplay: string;
  initialWithdrawalRatePct: number;
  sustainabilityScore: number;
  safetyLevel: "safe" | "caution" | "risk";
}

const MONTHS_PER_YEAR = 12;

function monthlyReturnFactor(annualReturnPct: number): number {
  return annualReturnPct / 100 / MONTHS_PER_YEAR;
}

/** Per-month growth factor for withdrawals from annual CPI-style inflation. */
function withdrawalGrowthFactorPerMonth(annualInflationPct: number): number {
  return Math.pow(1 + annualInflationPct / 100, 1 / MONTHS_PER_YEAR) - 1;
}

function simulate(
  initial: number,
  monthlyWithdrawal0: number,
  annualReturnPct: number,
  annualInflationPct: number,
  horizonYears: number,
  growWithdrawalsWithInflation: boolean,
): {
  monthEndBalance: number[];
  depletionMonth: number | null;
  totalWithdrawals: number;
} {
  const months = Math.max(0, Math.round(horizonYears * MONTHS_PER_YEAR));
  const r = monthlyReturnFactor(annualReturnPct);
  const g = withdrawalGrowthFactorPerMonth(annualInflationPct);

  let balance = Math.max(0, initial);
  let totalWithdrawals = 0;
  let depletionMonth: number | null = null;

  const monthEndBalance: number[] = [balance];

  for (let month = 1; month <= months; month++) {
    const withdrawal =
      monthlyWithdrawal0 * (growWithdrawalsWithInflation ? Math.pow(1 + g, month - 1) : 1);

    balance = balance * (1 + r) - withdrawal;
    totalWithdrawals += withdrawal;

    if (balance <= 0 && depletionMonth === null) {
      depletionMonth = month;
      balance = 0;
    }

    monthEndBalance.push(balance);
    if (depletionMonth !== null) break;
  }

  return { monthEndBalance, depletionMonth, totalWithdrawals };
}

function buildYearlySeries(
  monthEndBalance: number[],
  monthlyWithdrawal0: number,
  annualInflationPct: number,
  horizonYears: number,
  growWithdrawals: boolean,
): Pick<SwpYearPoint, "year" | "balanceWithInflation" | "withdrawalsNominal">[] {
  const g = withdrawalGrowthFactorPerMonth(annualInflationPct);
  const totalMonths = Math.round(horizonYears * MONTHS_PER_YEAR);
  const years = Math.max(1, Math.ceil(totalMonths / MONTHS_PER_YEAR));
  const out: Pick<SwpYearPoint, "year" | "balanceWithInflation" | "withdrawalsNominal">[] = [];

  for (let y = 1; y <= years; y++) {
    const endMonth = Math.min(y * MONTHS_PER_YEAR, monthEndBalance.length - 1);
    const startMonth = (y - 1) * MONTHS_PER_YEAR;
    let wSum = 0;
    for (let m = startMonth + 1; m <= endMonth; m++) {
      wSum += monthlyWithdrawal0 * (growWithdrawals ? Math.pow(1 + g, m - 1) : 1);
    }
    out.push({
      year: y,
      balanceWithInflation: monthEndBalance[endMonth] ?? 0,
      withdrawalsNominal: wSum,
    });
  }

  return out;
}

function sustainabilityScore(
  depletionMonth: number | null,
  horizonMonths: number,
  endingBalance: number,
  initial: number,
): number {
  if (initial <= 0) return 0;
  if (depletionMonth !== null) {
    const survived = depletionMonth / Math.max(1, horizonMonths);
    return Math.round(Math.max(0, Math.min(88, survived * 88)));
  }
  const ratio = endingBalance / initial;
  if (ratio >= 1.2) return 100;
  if (ratio >= 1) return 96 + Math.round(Math.min(4, (ratio - 1) * 20));
  if (ratio >= 0.5) return 82 + Math.round(((ratio - 0.5) / 0.5) * 14);
  if (ratio >= 0.25) return 65 + Math.round(((ratio - 0.25) / 0.25) * 17);
  if (ratio >= 0.1) return 48 + Math.round(((ratio - 0.1) / 0.15) * 17);
  return Math.round(Math.max(28, 28 + (ratio / 0.1) * 20));
}

function withdrawalSafetyLevel(initialWrPct: number): "safe" | "caution" | "risk" {
  if (initialWrPct <= 3.5) return "safe";
  if (initialWrPct <= 5.5) return "caution";
  return "risk";
}

export function runSwpSimulation(inputs: SwpInputs): SwpSimulationResult {
  const initial = Math.max(0, inputs.initialCorpus);
  const w0 = Math.max(0, inputs.monthlyWithdrawal);
  const horizonYears = Math.max(1, Math.min(80, inputs.horizonYears));
  const horizonMonths = Math.round(horizonYears * MONTHS_PER_YEAR);

  const infl = simulate(
    initial,
    w0,
    inputs.annualReturnPct,
    inputs.annualInflationPct,
    horizonYears,
    true,
  );

  const flat = simulate(
    initial,
    w0,
    inputs.annualReturnPct,
    inputs.annualInflationPct,
    horizonYears,
    false,
  );

  const yearlyInfl = buildYearlySeries(
    infl.monthEndBalance,
    w0,
    inputs.annualInflationPct,
    horizonYears,
    true,
  );
  const yearlyFlat = buildYearlySeries(
    flat.monthEndBalance,
    w0,
    inputs.annualInflationPct,
    horizonYears,
    false,
  );

  const yearly: SwpYearPoint[] = yearlyInfl.map((row, i) => ({
    year: row.year,
    balanceWithInflation: row.balanceWithInflation,
    balanceFlatWithdrawal: yearlyFlat[i]?.balanceWithInflation ?? 0,
    withdrawalsNominal: row.withdrawalsNominal,
    withdrawalsFlat: yearlyFlat[i]?.withdrawalsNominal ?? w0 * MONTHS_PER_YEAR,
  }));

  const initialWithdrawalRatePct =
    initial > 0 ? Math.min(999, (w0 * MONTHS_PER_YEAR * 100) / initial) : 0;

  const survivalYears = infl.depletionMonth
    ? infl.depletionMonth / MONTHS_PER_YEAR
    : horizonYears;

  let survivalYearsDisplay: string;
  if (infl.depletionMonth === null) {
    survivalYearsDisplay = `${horizonYears}+ years (full horizon)`;
  } else {
    const y = Math.floor(infl.depletionMonth / MONTHS_PER_YEAR);
    const m = infl.depletionMonth % MONTHS_PER_YEAR;
    survivalYearsDisplay = m > 0 ? `${y}y ${m}m` : `${y} years`;
  }

  const endingNominal = infl.monthEndBalance[infl.monthEndBalance.length - 1] ?? 0;

  const displayYearCount = infl.depletionMonth
    ? Math.min(yearly.length, Math.max(1, Math.ceil(infl.depletionMonth / MONTHS_PER_YEAR)))
    : yearly.length;
  const yearlyDisplay = yearly.slice(0, displayYearCount);

  return {
    yearly: yearlyDisplay,
    depletionMonth: infl.depletionMonth,
    depletionMonthFlat: flat.depletionMonth,
    totalWithdrawalsNominal: infl.totalWithdrawals,
    totalWithdrawalsFlat: flat.totalWithdrawals,
    endingBalanceNominal: endingNominal,
    endingBalanceFlat: flat.monthEndBalance[flat.monthEndBalance.length - 1] ?? 0,
    survivalYears,
    survivalYearsDisplay,
    initialWithdrawalRatePct,
    sustainabilityScore: sustainabilityScore(
      infl.depletionMonth,
      horizonMonths,
      endingNominal,
      initial,
    ),
    safetyLevel: withdrawalSafetyLevel(initialWithdrawalRatePct),
  };
}

export function formatSwpCurrency(value: number, currency: SwpCurrency): string {
  const abs = Math.abs(Math.round(value));
  if (currency === "KRW") {
    return `₩${abs.toLocaleString("en-US")}`;
  }
  return `रु ${abs.toLocaleString("en-IN")}`;
}

export function buildSwpAiInsight(
  result: SwpSimulationResult,
  horizonYears: number,
  currency: SwpCurrency,
  annualInflationPct: number,
): string {
  const parts: string[] = [];

  if (result.depletionMonth === null) {
    parts.push(
      `Your portfolio can sustain inflation-adjusted withdrawals across the full ${horizonYears}-year projection.`,
    );
  } else {
    parts.push(
      `At current settings, the portfolio may deplete after about ${result.survivalYearsDisplay} of withdrawals.`,
    );
  }

  if (result.safetyLevel === "safe") {
    parts.push("Initial withdrawal rate is in a calmer band for multi-decade retirements.");
  } else if (result.safetyLevel === "caution") {
    parts.push("Withdrawal rate is elevated — trimming monthly draws or delaying retirement improves margin.");
  } else {
    parts.push("Withdrawal rate is high versus corpus; consider lowering draws or increasing the starting balance.");
  }

  const last = result.yearly[result.yearly.length - 1];
  if (last && annualInflationPct > 0) {
    const gap = last.balanceFlatWithdrawal - last.balanceWithInflation;
    if (gap > 0) {
      parts.push(
        `By year ${last.year}, inflation-linked spending leaves about ${formatSwpCurrency(gap, currency)} less in balance than keeping withdrawals flat (same return assumptions).`,
      );
    }
  }

  return parts.join(" ");
}
