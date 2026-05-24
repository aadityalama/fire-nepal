import { EXPENSE_CATEGORY_META } from "@/components/cashflow/cashflow-constants";
import { fireSpeedScore, monthlyBurn, sumIncome } from "@/components/cashflow/cashflow-metrics";
import type { CashflowDashboardState, ExpenseCategoryKey } from "@/components/cashflow/types";
import type { FinancialCoachSnapshot } from "@/components/financial-coach/types";
import type { NetWorthHistoryPoint } from "@/components/portfolio/types";
import { currentIntelMonthKey, type FinancialIntelMonthRollup } from "./monthly-rollup-storage";
import type {
  CashBurnAnalysis,
  FinancialIntelligenceModel,
  MonthlyWealthReport,
  RecurringBucket,
  RecurringExpenseChartRow,
  RecurringExpenseSignal,
  SmartIntelNotificationCard,
  SpendingAnomaly,
  TrendLabel,
  WealthLeakInsight,
  WealthMomentum,
} from "@/components/financial-intelligence/types";

const EXPENSE_KEYS: ExpenseCategoryKey[] = [
  "rent",
  "food",
  "transportation",
  "familySupport",
  "emiLoans",
  "entertainment",
  "insurance",
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function finiteNonNeg(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

function labelForExpenseKey(k: ExpenseCategoryKey): string {
  return EXPENSE_CATEGORY_META.find((x) => x.key === k)?.label ?? k;
}

function shiftMonthKey(ym: string, delta: number): string {
  const [ys, ms] = ym.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym;
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function bucketForCategory(k: ExpenseCategoryKey): RecurringBucket {
  switch (k) {
    case "rent":
      return "rent";
    case "food":
      return "food";
    case "transportation":
      return "transport";
    case "entertainment":
      return "subscriptions";
    case "emiLoans":
      return "debt_service";
    case "insurance":
    case "familySupport":
      return "utilities";
    default:
      return "other";
  }
}

function recurrenceConfidenceFor(k: ExpenseCategoryKey): number {
  switch (k) {
    case "rent":
    case "emiLoans":
    case "insurance":
      return 0.94;
    case "familySupport":
      return 0.58;
    case "transportation":
      return 0.62;
    case "food":
      return 0.55;
    case "entertainment":
      return 0.42;
    default:
      return 0.5;
  }
}

function bucketDisplayLabel(b: RecurringBucket): string {
  switch (b) {
    case "rent":
      return "Housing (rent)";
    case "utilities":
      return "Utilities & household";
    case "subscriptions":
      return "Subscriptions & leisure";
    case "food":
      return "Food & dining";
    case "transport":
      return "Transport";
    case "debt_service":
      return "Debt service";
    default:
      return "Other recurring";
  }
}

function findPriorRollup(sorted: readonly FinancialIntelMonthRollup[], currentMonth: string): FinancialIntelMonthRollup | null {
  const strictPrev = sorted.find((r) => r.month === shiftMonthKey(currentMonth, -1));
  if (strictPrev) return strictPrev;
  const older = sorted.filter((r) => r.month < currentMonth);
  return older.length ? older[older.length - 1]! : null;
}

function trendFromDelta(delta: number | null, eps: number): TrendLabel {
  if (delta === null || !Number.isFinite(delta)) return "unknown";
  if (delta > eps) return "up";
  if (delta < -eps) return "down";
  return "flat";
}

function nwInvestmentTrend(history: readonly NetWorthHistoryPoint[]): TrendLabel {
  if (history.length < 5) return "unknown";
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    deltas.push(sorted[i]!.netWorthNpr - sorted[i - 1]!.netWorthNpr);
  }
  if (deltas.length < 4) return "unknown";
  const mid = Math.floor(deltas.length / 2);
  const early = deltas.slice(0, mid);
  const late = deltas.slice(mid);
  const a = early.reduce((s, x) => s + x, 0) / early.length;
  const b = late.reduce((s, x) => s + x, 0) / late.length;
  const diff = b - a;
  const noise = Math.max(5000, Math.abs(a) * 0.08);
  return trendFromDelta(diff, noise);
}

export type BuildFinancialIntelligenceArgs = {
  cashflow: CashflowDashboardState;
  coach: FinancialCoachSnapshot;
  monthRollups: readonly FinancialIntelMonthRollup[];
  netWorthHistory: readonly NetWorthHistoryPoint[];
};

export function buildFinancialIntelligenceModel(args: BuildFinancialIntelligenceArgs): FinancialIntelligenceModel {
  const { cashflow, coach, monthRollups, netWorthHistory } = args;
  const currentMonth = currentIntelMonthKey();
  const sortedRollups = [...monthRollups].sort((a, b) => a.month.localeCompare(b.month));
  const prior = findPriorRollup(sortedRollups, currentMonth);
  const hasMonthOverMonth = prior !== null;

  const burn = monthlyBurn(cashflow);
  const income = sumIncome(cashflow);
  const sr = coach.savingsRatePct;

  const recurring: RecurringExpenseSignal[] = [];
  const rising: { label: string; momPct: number }[] = [];

  for (const k of EXPENSE_KEYS) {
    const monthlyAmountNpr = finiteNonNeg(cashflow.expenses[k]);
    if (monthlyAmountNpr <= 0) continue;
    const prevAmt = prior ? finiteNonNeg(prior.expenseByCategory[k]) : 0;
    let momChangePct: number | null = null;
    if (prior && prevAmt > 0) {
      momChangePct = ((monthlyAmountNpr - prevAmt) / prevAmt) * 100;
    } else if (prior && prevAmt === 0 && monthlyAmountNpr > 0) {
      momChangePct = 100;
    }
    const risingFlag = momChangePct !== null && momChangePct > 8;
    if (risingFlag) {
      rising.push({ label: labelForExpenseKey(k), momPct: Math.round(momChangePct!) });
    }
    recurring.push({
      id: `rec-${k}`,
      sourceKey: k,
      displayLabel: labelForExpenseKey(k),
      bucket: bucketForCategory(k),
      monthlyAmountNpr,
      recurrenceConfidence: recurrenceConfidenceFor(k),
      momChangePct: momChangePct !== null ? Math.round(momChangePct * 10) / 10 : null,
      rising: risingFlag,
    });
  }

  const bucketTotals = new Map<RecurringBucket, number>();
  for (const r of recurring) {
    bucketTotals.set(r.bucket, (bucketTotals.get(r.bucket) ?? 0) + r.monthlyAmountNpr);
  }
  const totalRecurring = [...bucketTotals.values()].reduce((a, b) => a + b, 0) || 1;
  const recurringChart: RecurringExpenseChartRow[] = [...bucketTotals.entries()]
    .filter(([, amt]) => amt > 0)
    .map(([bucket, amountNpr]) => ({
      bucket,
      label: bucketDisplayLabel(bucket),
      amountNpr,
      sharePct: Math.round((amountNpr / totalRecurring) * 1000) / 10,
    }))
    .sort((a, b) => b.amountNpr - a.amountNpr);

  const wealthLeaks: WealthLeakInsight[] = [];
  const ent = finiteNonNeg(cashflow.expenses.entertainment);
  const food = finiteNonNeg(cashflow.expenses.food);
  const emi = finiteNonNeg(cashflow.expenses.emiLoans);
  if (burn > 0 && ent / burn > 0.12 && ent > 15_000) {
    const est = Math.min(ent * 0.32, burn * 0.06);
    wealthLeaks.push({
      id: "leak-ent",
      title: "Discretionary leisure load",
      detail:
        "Entertainment is carrying a large share of monthly outflows — treat like optional subscriptions and trim the top few line items.",
      estimatedMonthlyLeakNpr: Math.round(est),
      severity: ent / burn > 0.18 ? "high" : "medium",
    });
  }
  if (burn > 0 && food / burn > 0.28 && food > 20_000) {
    wealthLeaks.push({
      id: "leak-food",
      title: "Dining & grocery pressure",
      detail: "Food spend is elevated versus typical FIRE budgets — batch cooking, local markets, and fewer high-ticket meals usually recover margin fastest.",
      estimatedMonthlyLeakNpr: Math.round(Math.min(food * 0.18, burn * 0.05)),
      severity: food / burn > 0.36 ? "high" : "medium",
    });
  }
  if (income > 0 && emi / income > 0.22 && emi > 10_000) {
    wealthLeaks.push({
      id: "leak-emi",
      title: "Debt service drag",
      detail: "EMI / loans are consuming a structural slice of income — refinancing or accelerating paydown improves both cashflow quality and independence timelines.",
      estimatedMonthlyLeakNpr: Math.round(emi * 0.08),
      severity: emi / income > 0.32 ? "high" : "medium",
    });
  }

  const anomalies: SpendingAnomaly[] = [];
  const burnToIncome = income > 0 ? (burn / income) * 100 : null;
  if (burnToIncome !== null && burnToIncome > 88) {
    anomalies.push({
      id: "anom-burn",
      kind: "high_burn",
      title: "Unusually tight cashflow",
      detail: "Monthly burn is approaching gross income — runway and savings buffers are fragile until income scales or spend normalizes.",
      severity: "alert",
    });
  }
  if (prior && prior.burnNpr > 0 && burn > prior.burnNpr * 1.25 && income > 0 && burn / income > 0.55) {
    anomalies.push({
      id: "anom-burn-spike",
      kind: "high_burn",
      title: "Spending step-up detected",
      detail: `Burn is roughly ${Math.round(((burn - prior.burnNpr) / prior.burnNpr) * 100)}% higher than the last stored month — validate one-off costs vs new recurring obligations.`,
      severity: "watch",
    });
  }
  if (prior && sr !== null && prior.savingsRatePct !== null && sr < prior.savingsRatePct - 4) {
    anomalies.push({
      id: "anom-sr",
      kind: "savings_drop",
      title: "Savings rate compression",
      detail: `Savings rate fell by about ${Math.round(prior.savingsRatePct - sr)} percentage points versus your prior month snapshot.`,
      severity: "alert",
    });
  }
  const payslip = coach.payslipGrossMoM_pct;
  if (
    prior &&
    payslip !== null &&
    payslip < 5 &&
    burn > prior.burnNpr * 1.1 &&
    income > 0 &&
    income <= prior.incomeNpr * 1.04
  ) {
    anomalies.push({
      id: "anom-life",
      kind: "lifestyle_inflation",
      title: "Lifestyle inflation signal",
      detail:
        "Income growth looks modest while outflows expanded — classic lifestyle creep. Re-anchor the budget to last month’s winning categories.",
      severity: "watch",
    });
  }
  if (
    coach.lastNwDeltaNpr !== null &&
    coach.avgNwDeltaNpr !== null &&
    coach.avgNwDeltaNpr > 0 &&
    coach.lastNwDeltaNpr < coach.avgNwDeltaNpr * 0.62
  ) {
    anomalies.push({
      id: "anom-nw",
      kind: "nw_slowdown",
      title: "Wealth momentum cooled",
      detail:
        "Latest net worth step is materially below your recent average — often spend-led; confirm portfolio marks vs true outflows.",
      severity: "watch",
    });
  }

  const savingsEfficiencyScore = fireSpeedScore(cashflow) ?? Math.round(clamp((sr ?? 0) * 1.35, 0, 100));

  const runway = coach.coverageMonths;
  let cashflowQuality = 42;
  if (sr !== null) cashflowQuality += clamp(sr * 0.38, 0, 34);
  if (runway !== null) cashflowQuality += clamp((Math.min(runway, 12) / 12) * 22, 0, 22);
  if (burnToIncome !== null && burnToIncome < 62) cashflowQuality += 8;
  cashflowQuality = Math.round(clamp(cashflowQuality, 0, 100));

  const financialHealthScore = Math.round(
    clamp(coach.fireScore * 0.38 + savingsEfficiencyScore * 0.34 + cashflowQuality * 0.28, 0, 100),
  );

  let burnStress = 72;
  if (burnToIncome !== null) {
    burnStress = Math.round(clamp(100 - (burnToIncome - 42) * 1.55, 8, 96));
  }
  const cashBurn: CashBurnAnalysis = {
    burnToIncomePct: burnToIncome !== null ? Math.round(burnToIncome * 10) / 10 : null,
    runwayMonths: runway !== null ? Math.round(runway * 10) / 10 : null,
    narrative:
      burnToIncome === null
        ? "Add income and expense lines to score institutional-style burn pressure."
        : burnToIncome > 82
          ? "Burn is consuming most of gross inflows — prioritize runway and structural cuts."
          : burnToIncome > 68
            ? "Burn is elevated but workable — optimize recurring buckets before touching growth capital."
            : "Burn-to-income looks disciplined — surplus can be routed to tax-aware investing.",
    burnStressScore: burnStress,
  };

  let wealthMomentum: WealthMomentum = {
    label: "Momentum neutral",
    tone: "neutral",
    vsTrailingAvg: "unknown",
  };
  if (coach.lastNwDeltaNpr !== null && coach.avgNwDeltaNpr !== null && coach.netWorthHistoryLen >= 4) {
    const ratio = coach.avgNwDeltaNpr !== 0 ? coach.lastNwDeltaNpr / coach.avgNwDeltaNpr : 1;
    if (ratio > 1.12) {
      wealthMomentum = {
        label: "Wealth compounding ahead of trend",
        tone: "strong",
        vsTrailingAvg: "above",
      };
    } else if (ratio < 0.68) {
      wealthMomentum = {
        label: "Wealth build lagging trailing pace",
        tone: "weak",
        vsTrailingAvg: "below",
      };
    } else {
      wealthMomentum = {
        label: "Wealth trajectory aligned with baseline",
        tone: "neutral",
        vsTrailingAvg: "in_line",
      };
    }
  } else if (coach.netWorthHistoryLen < 3) {
    wealthMomentum = {
      label: "Build more net worth history for momentum reads",
      tone: "neutral",
      vsTrailingAvg: "unknown",
    };
  }

  const savingsRateTrend: TrendLabel =
    prior && sr !== null && prior.savingsRatePct !== null
      ? trendFromDelta(sr - prior.savingsRatePct, 1.25)
      : "unknown";

  const investmentGrowthTrend: TrendLabel =
    netWorthHistory.length >= 5
      ? nwInvestmentTrend(netWorthHistory)
      : coach.netWorthHistoryLen >= 4 &&
          coach.lastNwDeltaNpr !== null &&
          coach.avgNwDeltaNpr !== null
        ? trendFromDelta(
            coach.lastNwDeltaNpr - coach.avgNwDeltaNpr,
            Math.max(8000, Math.abs(coach.avgNwDeltaNpr) * 0.06),
          )
        : "unknown";

  let fireTrajectory: MonthlyWealthReport["fireTrajectory"] = "unknown";
  if (coach.fireYearsToFi !== null && prior?.fireYearsToFi != null) {
    const d = coach.fireYearsToFi - prior.fireYearsToFi;
    if (d < -0.12) fireTrajectory = "accelerating";
    else if (d > 0.12) fireTrajectory = "decelerating";
    else fireTrajectory = "steady";
  } else if (coach.fireYearsToFi !== null && savingsRateTrend === "up") {
    fireTrajectory = "accelerating";
  } else if (coach.fireYearsToFi !== null && savingsRateTrend === "down") {
    fireTrajectory = "decelerating";
  }

  const bullets: string[] = [];
  if (sr !== null) bullets.push(`Savings rate is ${sr.toFixed(1)}% of tracked income after modeled burn.`);
  if (coach.fireYearsToFi !== null) bullets.push(`Desk FIRE model clocks ~${coach.fireYearsToFi.toFixed(1)} years to FI at the current contribution pace.`);
  bullets.push(`Passive + dividend modeled income: ~${Math.round(coach.passiveMonthlyNpr).toLocaleString()} NPR / month.`);
  if (rising.length) {
    bullets.push(`${rising.length} recurring category(ies) are rising faster than an 8% month-over-month guardrail.`);
  }
  if (wealthLeaks.length) {
    bullets.push(`Wealth leak scan flagged ${wealthLeaks.length} structural efficiency opportunity(ies).`);
  }

  const monthlyReport: MonthlyWealthReport = {
    month: currentMonth,
    headline:
      savingsRateTrend === "up"
        ? "Surplus is widening — keep routing wins into long-duration assets."
        : savingsRateTrend === "down"
          ? "Surplus narrowed — tighten discretionary buckets before they compound."
          : "Month-to-date posture is stable — monitor recurring drift while staying invested.",
    savingsRateTrend,
    investmentGrowthTrend,
    fireTrajectory,
    cashflowQualityScore: cashflowQuality,
    bullets,
  };

  const smartCards: SmartIntelNotificationCard[] = [];
  if (prior && sr !== null && prior.savingsRatePct !== null && sr - prior.savingsRatePct >= 2) {
    smartCards.push({
      id: "card-sr-up",
      title: `Savings rate improved ~${Math.round(sr - prior.savingsRatePct)} pts`,
      subtitle: "Momentum on surplus — consider locking the win with an automatic sweep to brokerage / FD ladder.",
      tone: "positive",
    });
  }
  if (prior) {
    const foodMom =
      prior.expenseByCategory.food > 0
        ? ((finiteNonNeg(cashflow.expenses.food) - prior.expenseByCategory.food) / prior.expenseByCategory.food) * 100
        : null;
    if (foodMom !== null && foodMom > 14) {
      smartCards.push({
        id: "card-food",
        title: `Dining & grocery spend up ~${Math.round(foodMom)}%`,
        subtitle: "Food is the fastest lifestyle lever — two fewer premium dining nights often fully mean-revert this spike.",
        tone: "caution",
      });
    }
  }
  if (
    coach.fireYearsToFi !== null &&
    prior?.fireYearsToFi != null &&
    prior.fireYearsToFi - coach.fireYearsToFi > 0.18
  ) {
    const yrs = Math.max(0.25, prior.fireYearsToFi - coach.fireYearsToFi);
    smartCards.push({
      id: "card-fire",
      title: `You may reach FIRE ~${yrs.toFixed(1)} yrs faster at this pace`,
      subtitle: "Desk model improvement — validate with your actual contribution rate and tax assumptions.",
      tone: "positive",
    });
  }
  if (rising.length && !smartCards.find((c) => c.id === "card-food")) {
    smartCards.push({
      id: "card-recurring",
      title: `${rising.length} recurring bucket(s) are heating up`,
      subtitle: rising.map((r) => `${r.label} +${r.momPct}%`).join(" · "),
      tone: "caution",
    });
  }
  if (anomalies[0]) {
    smartCards.push({
      id: "card-anom",
      title: anomalies[0]!.title,
      subtitle: anomalies[0]!.detail,
      tone: "caution",
    });
  }
  if (wealthLeaks[0] && smartCards.length < 6) {
    smartCards.push({
      id: "card-leak",
      title: "Wealth leak radar",
      subtitle: wealthLeaks[0]!.detail,
      tone: "neutral",
    });
  }

  return {
    recurring,
    recurringChart,
    risingCategories: rising,
    wealthLeaks,
    anomalies,
    monthlyReport,
    smartCards: smartCards.slice(0, 6),
    savingsEfficiencyScore,
    financialHealthScore,
    cashBurn,
    wealthMomentum,
    hasMonthOverMonth,
  };
}
