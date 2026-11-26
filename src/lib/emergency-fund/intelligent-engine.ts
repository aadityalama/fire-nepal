/**
 * Pure TypeScript Emergency Fund calculation engine.
 * Single source of truth for derived EF metrics — no I/O.
 */

import {
  DEFAULT_ALLOCATION_PCT,
  DEFAULT_PROTECTION_MONTHS,
  type CurrencyConversionMeta,
  type EmergencyDataSource,
  type EmergencyDataSourceLabel,
  type EmergencyFundLedger,
  type EmergencyFundSettings,
  type EmergencyFundTransaction,
  type EmergencyInsight,
  type FinancialSafetyStatus,
  type IntelligentEmergencyFundResult,
} from "@/lib/emergency-fund/types";

function finiteOrNull(n: number | null | undefined): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n;
}

function finiteNonNeg(n: number | null | undefined): number {
  const v = finiteOrNull(n);
  if (v == null) return 0;
  return Math.max(0, v);
}

function roundMoney(n: number): number {
  return Math.round(n);
}

function roundPct(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function roundMonths(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function classifyFinancialSafety(runwayMonths: number | null): FinancialSafetyStatus | null {
  if (runwayMonths == null || !Number.isFinite(runwayMonths)) return null;
  if (runwayMonths < 1) return "critical";
  if (runwayMonths < 3) return "high_risk";
  if (runwayMonths < 6) return "building_safety";
  if (runwayMonths < 12) return "strong_protection";
  return "extended_protection";
}

export function labelForDataSource(source: EmergencyDataSource): EmergencyDataSourceLabel {
  switch (source) {
    case "actual_and_budget":
      return "Actual + Budget (conservative max)";
    case "actual_history":
      return "Actual Expense History";
    case "budget_estimate":
      return "Budget-Based Estimate";
    case "cashflow_estimate":
      return "Cashflow-Based Estimate";
    case "manual_estimate":
      return "Manual Estimate";
    default:
      return "Insufficient Financial Data";
  }
}

/**
 * Resolve recommended monthly expense basis with fallback hierarchy.
 * Never silently treats missing data as zero for the recommended basis.
 */
export function resolveExpenseBasis(input: {
  actualEssentialMonthlyAvgNpr: number | null;
  plannedEssentialMonthlyNpr: number | null;
  cashflowEssentialMonthlyNpr: number | null;
  manualMonthlyExpenseNpr: number | null;
  expenseBasisOverrideNpr?: number | null;
}): {
  basisNpr: number | null;
  dataSource: EmergencyDataSource;
  overridden: boolean;
} {
  const override = finiteOrNull(input.expenseBasisOverrideNpr);
  if (override != null && override > 0) {
    // Override still reports the underlying source for transparency.
    const underlying = resolveExpenseBasis({
      ...input,
      expenseBasisOverrideNpr: null,
    });
    return { basisNpr: roundMoney(override), dataSource: underlying.dataSource, overridden: true };
  }

  const actual = finiteOrNull(input.actualEssentialMonthlyAvgNpr);
  const planned = finiteOrNull(input.plannedEssentialMonthlyNpr);
  const cashflow = finiteOrNull(input.cashflowEssentialMonthlyNpr);
  const manual = finiteOrNull(input.manualMonthlyExpenseNpr);

  const hasActual = actual != null && actual > 0;
  const hasPlanned = planned != null && planned > 0;
  const hasCashflow = cashflow != null && cashflow > 0;
  const hasManual = manual != null && manual > 0;

  if (hasActual && hasPlanned) {
    return {
      basisNpr: roundMoney(Math.max(actual!, planned!)),
      dataSource: "actual_and_budget",
      overridden: false,
    };
  }
  if (hasActual) {
    return { basisNpr: roundMoney(actual!), dataSource: "actual_history", overridden: false };
  }
  if (hasPlanned) {
    return { basisNpr: roundMoney(planned!), dataSource: "budget_estimate", overridden: false };
  }
  if (hasCashflow) {
    return { basisNpr: roundMoney(cashflow!), dataSource: "cashflow_estimate", overridden: false };
  }
  if (hasManual) {
    return { basisNpr: roundMoney(manual!), dataSource: "manual_estimate", overridden: false };
  }
  return { basisNpr: null, dataSource: "insufficient_data", overridden: false };
}

export function computeLedgerReserve(params: {
  openingBalanceNpr: number;
  transactions: EmergencyFundTransaction[];
  linkedSavingsBalanceNpr?: number;
  reserveMode?: EmergencyFundSettings["reserveMode"];
}): number {
  const opening = finiteNonNeg(params.openingBalanceNpr);
  const confirmed = (params.transactions ?? []).filter((t) => t.confirmed !== false);
  const contributions = confirmed
    .filter((t) => t.type === "contribution")
    .reduce((sum, t) => sum + finiteNonNeg(t.amountNpr), 0);
  const withdrawals = confirmed
    .filter((t) => t.type === "withdrawal")
    .reduce((sum, t) => sum + finiteNonNeg(t.amountNpr), 0);
  const ledger = Math.max(0, opening + contributions - withdrawals);
  const linked = finiteNonNeg(params.linkedSavingsBalanceNpr);
  const mode = params.reserveMode ?? "ledger";

  if (mode === "linked") return linked;
  if (mode === "hybrid") return Math.max(0, ledger + linked);
  return ledger;
}

export type ComputeIntelligentEmergencyFundInput = {
  monthlyNetIncomeNpr: number | null;
  actualMonthlyTotalExpensesNpr: number | null;
  actualEssentialMonthlyAvgNpr: number | null;
  plannedEssentialMonthlyNpr: number | null;
  cashflowEssentialMonthlyNpr: number | null;
  /** Other committed allocations not already in spending totals (NPR / month). */
  otherCommittedAllocationsNpr?: number | null;
  currentReserveNpr: number;
  protectionMonths?: number;
  allocationPct?: number;
  customContributionNpr?: number | null;
  expenseBasisOverrideNpr?: number | null;
  manualMonthlyExpenseNpr?: number | null;
  analysisPeriodLabel?: string | null;
  categoryClassificationReliable?: boolean;
  currency?: CurrencyConversionMeta;
  now?: Date;
  lastUpdatedAt?: string;
};

function addMonthsLabel(from: Date, months: number): string {
  const d = new Date(from.getFullYear(), from.getMonth() + months, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function buildInsights(result: {
  safetyRunwayMonths: number | null;
  remainingShortfallNpr: number | null;
  recommendedMonthlyContributionNpr: number | null;
  estimatedMonthsRemaining: number | null;
  fullyFunded: boolean;
  negativeCashflow: boolean;
  actualEssentialMonthlyAvgNpr: number | null;
  plannedEssentialMonthlyNpr: number | null;
  protectionMonths: number;
  currencyCode: string;
  formatAmount: (n: number) => string;
}): EmergencyInsight[] {
  const insights: EmergencyInsight[] = [];
  const fmt = result.formatAmount;

  if (result.safetyRunwayMonths != null) {
    const mo = roundMonths(result.safetyRunwayMonths, 1);
    insights.push({
      id: "runway",
      tone: mo < 3 ? "critical" : mo < 6 ? "warning" : "positive",
      messageEn: `Your emergency reserve currently covers ${mo} months of essential expenses.`,
      messageNe: `तपाईंको आपतकालीन जगेडाले अहिले करिब ${mo} महिनाको आवश्यक खर्च धान्छ।`,
      messageKo: `비상금이 현재 필수 생활비 약 ${mo}개월분을 커버합니다.`,
    });
  }

  if (result.fullyFunded) {
    insights.push({
      id: "fully-funded",
      tone: "positive",
      messageEn:
        "Your emergency fund is fully funded. Review whether additional savings should be allocated toward other financial goals.",
      messageNe:
        "तपाईंको आपतकालीन कोष पूर्ण रूपमा भरिएको छ। थप बचत अन्य वित्तीय लक्ष्यतिर लैजाने समीक्षा गर्नुहोस्।",
      messageKo: "비상금 목표가 달성되었습니다. 추가 저축을 다른 재무 목표로 배분할지 검토하세요.",
      href: "/savings-tracker",
    });
  } else if (result.remainingShortfallNpr != null && result.remainingShortfallNpr > 0) {
    insights.push({
      id: "shortfall",
      tone: "warning",
      messageEn: `You need an additional ${fmt(result.remainingShortfallNpr)} to achieve your ${result.protectionMonths}-month target.`,
      messageNe: `${result.protectionMonths} महिनाको लक्ष्य पूरा गर्न थप ${fmt(result.remainingShortfallNpr)} आवश्यक छ।`,
      messageKo: `${result.protectionMonths}개월 목표 달성을 위해 추가로 ${fmt(result.remainingShortfallNpr)}이 필요합니다.`,
    });
  }

  if (
    !result.fullyFunded &&
    result.recommendedMonthlyContributionNpr != null &&
    result.recommendedMonthlyContributionNpr > 0 &&
    result.estimatedMonthsRemaining != null &&
    result.estimatedMonthsRemaining > 0
  ) {
    insights.push({
      id: "contribution-plan",
      tone: "info",
      messageEn: `Saving ${fmt(result.recommendedMonthlyContributionNpr)} per month could help you achieve your target in ${result.estimatedMonthsRemaining} months.`,
      messageNe: `मासिक ${fmt(result.recommendedMonthlyContributionNpr)} बचत गर्दा करिब ${result.estimatedMonthsRemaining} महिनामा लक्ष्य पुग्न सकिन्छ।`,
      messageKo: `매월 ${fmt(result.recommendedMonthlyContributionNpr)}을 저축하면 약 ${result.estimatedMonthsRemaining}개월 후 목표에 도달할 수 있습니다.`,
    });
  }

  const actual = result.actualEssentialMonthlyAvgNpr;
  const planned = result.plannedEssentialMonthlyNpr;
  if (actual != null && planned != null && planned > actual) {
    insights.push({
      id: "budget-higher",
      tone: "info",
      messageEn: "Your current budget is higher than your historical essential expenses.",
      messageNe: "तपाईंको हालको बजेट ऐतिहासिक आवश्यक खर्चभन्दा बढी छ।",
      messageKo: "현재 필수 예산이 과거 실제 필수 지출보다 높습니다.",
      href: "/budget",
    });
  }

  if (result.negativeCashflow) {
    insights.push({
      id: "negative-cashflow",
      tone: "critical",
      messageEn:
        "Your monthly expenses exceed your income. Review your spending before increasing contributions.",
      messageNe: "तपाईंको मासिक खर्च आयभन्दा बढी छ। योगदान बढाउनुअघि खर्च समीक्षा गर्नुहोस्।",
      messageKo: "월 지출이 소득을 초과합니다. 기여금을 늘리기 전에 지출을 점검하세요.",
      href: "/cashflow-dashboard",
    });
  }

  return insights;
}

/**
 * Full intelligent emergency fund calculation.
 * Matches the product formulas in the Emergency Fund upgrade spec.
 */
export function computeIntelligentEmergencyFund(
  input: ComputeIntelligentEmergencyFundInput,
): IntelligentEmergencyFundResult {
  const now = input.now ?? new Date();
  const protectionMonths = Math.max(
    1,
    Math.round(input.protectionMonths ?? DEFAULT_PROTECTION_MONTHS),
  );
  const allocationPct = Math.max(
    0,
    Math.min(100, input.allocationPct ?? DEFAULT_ALLOCATION_PCT),
  );

  const { basisNpr, dataSource, overridden } = resolveExpenseBasis({
    actualEssentialMonthlyAvgNpr: input.actualEssentialMonthlyAvgNpr,
    plannedEssentialMonthlyNpr: input.plannedEssentialMonthlyNpr,
    cashflowEssentialMonthlyNpr: input.cashflowEssentialMonthlyNpr,
    manualMonthlyExpenseNpr: input.manualMonthlyExpenseNpr ?? null,
    expenseBasisOverrideNpr: input.expenseBasisOverrideNpr,
  });

  const hasSufficientData = basisNpr != null && basisNpr > 0;
  const currentReserveNpr = finiteNonNeg(input.currentReserveNpr);

  const emergencyFundTargetNpr = hasSufficientData ? roundMoney(basisNpr! * protectionMonths) : null;
  const remainingShortfallNpr =
    emergencyFundTargetNpr == null
      ? null
      : Math.max(0, emergencyFundTargetNpr - currentReserveNpr);

  const fundingProgressPct =
    emergencyFundTargetNpr != null && emergencyFundTargetNpr > 0
      ? roundPct((currentReserveNpr / emergencyFundTargetNpr) * 100, 2)
      : null;
  const fundingProgressRingPct =
    fundingProgressPct == null ? null : Math.min(100, Math.max(0, fundingProgressPct));

  const safetyRunwayMonths =
    hasSufficientData && basisNpr! > 0 ? roundMonths(currentReserveNpr / basisNpr!, 2) : null;
  const safetyStatus = classifyFinancialSafety(safetyRunwayMonths);

  const monthlyNetIncomeNpr = finiteOrNull(input.monthlyNetIncomeNpr);
  const actualMonthlyTotalExpensesNpr = finiteOrNull(input.actualMonthlyTotalExpensesNpr);

  const actualMonthlySavingsNpr =
    monthlyNetIncomeNpr != null && actualMonthlyTotalExpensesNpr != null
      ? roundMoney(monthlyNetIncomeNpr - actualMonthlyTotalExpensesNpr)
      : null;

  // Conservative total spending = max(actual total, planned essential as floor when actual missing)
  // Spec: Available Contribution Capacity = MAX(0, Monthly Net Income − Conservative Monthly Total Spending − Other Uncounted Committed Allocations)
  // Conservative spending uses max of actual total expenses and planned essential (when both exist),
  // else whichever reliable total is available — without adding budget on top of actual.
  let conservativeMonthlySpendingNpr: number | null = null;
  const planned = finiteOrNull(input.plannedEssentialMonthlyNpr);
  if (actualMonthlyTotalExpensesNpr != null && actualMonthlyTotalExpensesNpr > 0) {
    // Do NOT add budget to actual. Use actual total; if planned essential exceeds actual total,
    // use planned as the conservative ceiling for capacity (same spirit as expense basis MAX).
    conservativeMonthlySpendingNpr =
      planned != null && planned > actualMonthlyTotalExpensesNpr
        ? planned
        : actualMonthlyTotalExpensesNpr;
  } else if (planned != null && planned > 0) {
    conservativeMonthlySpendingNpr = planned;
  } else if (basisNpr != null) {
    conservativeMonthlySpendingNpr = basisNpr;
  }

  const otherCommitted = finiteNonNeg(input.otherCommittedAllocationsNpr);
  const negativeCashflow =
    monthlyNetIncomeNpr != null &&
    actualMonthlyTotalExpensesNpr != null &&
    actualMonthlyTotalExpensesNpr > monthlyNetIncomeNpr;

  let availableContributionCapacityNpr: number | null = null;
  if (monthlyNetIncomeNpr != null && conservativeMonthlySpendingNpr != null) {
    availableContributionCapacityNpr = Math.max(
      0,
      roundMoney(monthlyNetIncomeNpr - conservativeMonthlySpendingNpr - otherCommitted),
    );
  }

  const fullyFunded =
    remainingShortfallNpr != null && remainingShortfallNpr <= 0 && hasSufficientData;

  let recommendedMonthlyContributionNpr: number | null = null;
  let contributionExceedsCapacity = false;

  if (fullyFunded) {
    recommendedMonthlyContributionNpr = 0;
  } else if (negativeCashflow) {
    recommendedMonthlyContributionNpr = 0;
  } else if (remainingShortfallNpr != null && availableContributionCapacityNpr != null) {
    const custom = finiteOrNull(input.customContributionNpr);
    if (custom != null && custom >= 0) {
      contributionExceedsCapacity = custom > availableContributionCapacityNpr;
      recommendedMonthlyContributionNpr = roundMoney(
        Math.min(remainingShortfallNpr, custom),
      );
    } else {
      const fromAllocation = roundMoney(
        availableContributionCapacityNpr * (allocationPct / 100),
      );
      recommendedMonthlyContributionNpr = Math.min(remainingShortfallNpr, fromAllocation);
    }
  } else if (remainingShortfallNpr != null && remainingShortfallNpr > 0) {
    recommendedMonthlyContributionNpr = null;
  }

  const additionalSavingsRequired =
    !fullyFunded &&
    hasSufficientData &&
    (availableContributionCapacityNpr == null || availableContributionCapacityNpr <= 0);

  let estimatedMonthsRemaining: number | null = null;
  let estimatedCompletionLabel: string | null = null;

  if (fullyFunded) {
    estimatedMonthsRemaining = 0;
    estimatedCompletionLabel = "Emergency Fund Fully Funded";
  } else if (additionalSavingsRequired) {
    estimatedMonthsRemaining = null;
    estimatedCompletionLabel = "Additional savings required";
  } else if (
    remainingShortfallNpr != null &&
    remainingShortfallNpr > 0 &&
    recommendedMonthlyContributionNpr != null &&
    recommendedMonthlyContributionNpr > 0
  ) {
    estimatedMonthsRemaining = Math.ceil(
      remainingShortfallNpr / recommendedMonthlyContributionNpr,
    );
    estimatedCompletionLabel = addMonthsLabel(now, estimatedMonthsRemaining);
  }

  const currency: CurrencyConversionMeta = input.currency ?? {
    baseCurrency: "NPR",
    krwPerNpr: null,
    usdPerNpr: null,
    rateUpdatedAt: null,
    incomplete: false,
    stale: false,
  };

  const formatAmount = (n: number) => {
    const code = currency.baseCurrency;
    return `${code} ${roundMoney(n).toLocaleString("en-IN")}`;
  };

  const insights = hasSufficientData
    ? buildInsights({
        safetyRunwayMonths,
        remainingShortfallNpr,
        recommendedMonthlyContributionNpr,
        estimatedMonthsRemaining,
        fullyFunded,
        negativeCashflow,
        actualEssentialMonthlyAvgNpr: finiteOrNull(input.actualEssentialMonthlyAvgNpr),
        plannedEssentialMonthlyNpr: finiteOrNull(input.plannedEssentialMonthlyNpr),
        protectionMonths,
        currencyCode: currency.baseCurrency,
        formatAmount,
      })
    : [
        {
          id: "onboarding",
          tone: "info" as const,
          messageEn:
            "Add income, expenses, or a budget so we can size your emergency fund automatically.",
          messageNe:
            "आपतकालीन कोष स्वचालित रूपमा गणना गर्न आय, खर्च वा बजेट थप्नुहोस्।",
          messageKo: "비상금을 자동으로 산정하려면 소득, 지출 또는 예산을 추가하세요.",
          href: "/cashflow-dashboard",
        },
      ];

  return {
    hasSufficientData,
    dataSource,
    dataSourceLabel: labelForDataSource(dataSource),
    calculationPeriodLabel: input.analysisPeriodLabel ?? null,
    lastUpdatedAt: input.lastUpdatedAt ?? now.toISOString(),

    actualEssentialMonthlyAvgNpr: finiteOrNull(input.actualEssentialMonthlyAvgNpr),
    plannedEssentialMonthlyNpr: finiteOrNull(input.plannedEssentialMonthlyNpr),
    cashflowEssentialMonthlyNpr: finiteOrNull(input.cashflowEssentialMonthlyNpr),
    recommendedExpenseBasisNpr: basisNpr,
    expenseBasisOverridden: overridden,
    categoryClassificationReliable: input.categoryClassificationReliable !== false,

    protectionMonths,
    emergencyFundTargetNpr,
    currentReserveNpr,
    remainingShortfallNpr,
    fundingProgressPct,
    fundingProgressRingPct,
    safetyRunwayMonths,
    safetyStatus,

    monthlyNetIncomeNpr,
    actualMonthlyTotalExpensesNpr,
    actualMonthlySavingsNpr,
    conservativeMonthlySpendingNpr,
    availableContributionCapacityNpr,
    allocationPct,
    recommendedMonthlyContributionNpr,
    contributionExceedsCapacity,
    negativeCashflow,

    estimatedMonthsRemaining,
    estimatedCompletionLabel,
    fullyFunded,
    additionalSavingsRequired,

    insights,
    currency,
  };
}

/** Sync displayed reserve into cashflow.emergencyCashReserve SoT. */
export function deriveEmergencyCashReserveFromLedger(
  ledger: EmergencyFundLedger | null | undefined,
  linkedSavingsBalanceNpr = 0,
  fallbackReserveNpr?: number | null,
): number {
  if (!ledger) return finiteNonNeg(fallbackReserveNpr);
  return computeLedgerReserve({
    openingBalanceNpr: ledger.settings.openingBalanceNpr,
    transactions: ledger.transactions,
    linkedSavingsBalanceNpr,
    reserveMode: ledger.settings.reserveMode,
  });
}
