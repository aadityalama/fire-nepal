/**
 * Pure TypeScript Emergency Fund calculation engine.
 * Single source of truth for derived EF metrics — no I/O.
 */

import type { DataQualityReport } from "@/lib/emergency-fund/data-quality";
import { buildFundingPlans } from "@/lib/emergency-fund/funding-plans";
import { buildSafetyMilestones } from "@/lib/emergency-fund/milestones";
import { pluralMonths } from "@/lib/emergency-fund/period";
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
  recurringMonthlyIncomeNpr?: number | null;
  actualMonthlyTotalExpensesNpr: number | null;
  actualEssentialMonthlyAvgNpr: number | null;
  plannedEssentialMonthlyNpr: number | null;
  cashflowEssentialMonthlyNpr: number | null;
  otherCommittedAllocationsNpr?: number | null;
  currentReserveNpr: number;
  protectionMonths?: number;
  allocationPct?: number;
  customContributionNpr?: number | null;
  expenseBasisOverrideNpr?: number | null;
  manualMonthlyExpenseNpr?: number | null;
  analysisPeriodLabel?: string | null;
  incomePeriodLabel?: string | null;
  expensePeriodLabel?: string | null;
  essentialAveragingLabel?: string | null;
  categoryClassificationReliable?: boolean;
  currency?: CurrencyConversionMeta;
  now?: Date;
  lastUpdatedAt?: string;
  lastSyncedAt?: string | null;
  dataQuality?: DataQualityReport | null;
  fundingDeadlineMonths?: number | null;
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
  dataQuality: DataQualityReport | null;
  formatAmount: (n: number) => string;
  capacityReliable: boolean;
}): EmergencyInsight[] {
  const insights: EmergencyInsight[] = [];
  const fmt = result.formatAmount;

  if (result.dataQuality) {
    for (const issue of result.dataQuality.issues.filter((i) => i.severity !== "info")) {
      insights.push({
        id: `dq-${issue.id}`,
        tone: issue.severity === "critical" ? "critical" : "warning",
        priority: issue.severity === "critical" ? 1 : 2,
        titleEn: "Data quality",
        titleNe: "डाटा गुणस्तर",
        titleKo: "데이터 품질",
        messageEn: issue.messageEn,
        messageNe: issue.messageNe,
        messageKo: issue.messageKo,
        actionEn: "Open the linked Finance tool and refresh your records.",
        actionNe: "सम्बन्धित वित्त उपकरण खोल्नुहोस् र रेकर्ड अद्यावधिक गर्नुहोस्।",
        actionKo: "연결된 금융 도구를 열고 기록을 갱신하세요.",
        href: issue.href,
      });
    }
  }

  if (result.negativeCashflow) {
    insights.push({
      id: "negative-cashflow",
      tone: "critical",
      priority: 3,
      titleEn: "Negative cashflow",
      titleNe: "ऋणात्मक क्यासफ्लो",
      titleKo: "마이너스 캐시플로",
      messageEn:
        "Monthly expenses exceed income for the selected period. Prioritize cashflow recovery before increasing emergency contributions.",
      messageNe: "चयन अवधिमा खर्च आयभन्दा बढी छ। योगदान बढाउनुअघि क्यासफ्लो सुधार्नुहोस्।",
      messageKo: "선택한 기간에 지출이 소득을 초과합니다. 비상 기여 전에 캐시플로를 회복하세요.",
      actionEn: "Review Cashflow and Expense Tracker.",
      actionNe: "क्यासफ्लो र खर्च ट्र्याकर समीक्षा गर्नुहोस्।",
      actionKo: "캐시플로와 지출 트래커를 점검하세요.",
      href: "/cashflow-dashboard",
    });
  }

  if (result.safetyRunwayMonths != null && result.safetyRunwayMonths < 3) {
    insights.push({
      id: "low-protection",
      tone: result.safetyRunwayMonths < 1 ? "critical" : "warning",
      priority: 4,
      titleEn: "Insufficient emergency protection",
      titleNe: "अपुग आपतकालीन सुरक्षा",
      titleKo: "비상 보호 부족",
      messageEn: `Your reserve covers about ${pluralMonths(result.safetyRunwayMonths)}. Building toward at least 3 months reduces short-term shock risk.`,
      messageNe: `तपाईंको जगेडाले करिब ${pluralMonths(result.safetyRunwayMonths)} धान्छ। कम्तीमा ३ महिनातर्फ बढाउँदा अल्पकालीन झट्का कम हुन्छ।`,
      messageKo: `예비금이 약 ${pluralMonths(result.safetyRunwayMonths)}분을 커버합니다. 최소 3개월을 목표로 하면 단기 충격에 강해집니다.`,
      actionEn: "Record a contribution or raise surplus allocation.",
      actionNe: "योगदान रेकर्ड गर्नुहोस् वा बचत बाँडफाँड बढाउनुहोस्।",
      actionKo: "기여금을 기록하거나 여유금 배분을 높이세요.",
    });
  }

  if (
    !result.fullyFunded &&
    result.remainingShortfallNpr != null &&
    result.remainingShortfallNpr > 0 &&
    result.capacityReliable
  ) {
    insights.push({
      id: "shortfall",
      tone: "warning",
      priority: 5,
      titleEn: "Funding shortfall",
      titleNe: "कोष कमी",
      titleKo: "적립 부족",
      messageEn: `You still need ${fmt(result.remainingShortfallNpr)} to reach your ${result.protectionMonths}-month target.`,
      messageNe: `${result.protectionMonths} महिनाको लक्ष्यका लागि अझ ${fmt(result.remainingShortfallNpr)} चाहिन्छ।`,
      messageKo: `${result.protectionMonths}개월 목표까지 ${fmt(result.remainingShortfallNpr)}이 더 필요합니다.`,
      actionEn: "Compare deadline-based funding plans below.",
      actionNe: "तलका समयसीमा योजना तुलना गर्नुहोस्।",
      actionKo: "아래 기간별 적립 계획을 비교하세요.",
    });
  }

  if (
    !result.fullyFunded &&
    result.capacityReliable &&
    result.recommendedMonthlyContributionNpr != null &&
    result.recommendedMonthlyContributionNpr > 0 &&
    result.estimatedMonthsRemaining != null &&
    result.estimatedMonthsRemaining > 0
  ) {
    insights.push({
      id: "contribution-plan",
      tone: "info",
      priority: 6,
      titleEn: "Affordable funding path",
      titleNe: "किफायती कोष मार्ग",
      titleKo: "감당 가능한 적립 경로",
      messageEn: `Saving ${fmt(result.recommendedMonthlyContributionNpr)} per month could reach your target in about ${pluralMonths(result.estimatedMonthsRemaining)}.`,
      messageNe: `मासिक ${fmt(result.recommendedMonthlyContributionNpr)} बचत गर्दा करिब ${pluralMonths(result.estimatedMonthsRemaining)}मा लक्ष्य पुग्न सकिन्छ।`,
      messageKo: `매월 ${fmt(result.recommendedMonthlyContributionNpr)}을 저축하면 약 ${pluralMonths(result.estimatedMonthsRemaining)} 후 목표에 도달할 수 있습니다.`,
    });
  }

  if (result.fullyFunded) {
    insights.push({
      id: "fully-funded",
      tone: "positive",
      priority: 7,
      titleEn: "Target funded",
      titleNe: "लक्ष्य पूरा",
      titleKo: "목표 달성",
      messageEn:
        "Your emergency fund target is fully funded. Review whether additional savings should go to other goals — reaching a target does not eliminate all financial risks.",
      messageNe:
        "आपतकालीन कोष लक्ष्य पूरा भएको छ। थप बचत अन्य लक्ष्यतिर लैजाने समीक्षा गर्नुहोस् — लक्ष्यले सबै जोखिम हटाउँदैन।",
      messageKo:
        "비상금 목표가 달성되었습니다. 추가 저축을 다른 목표로 옮길지 검토하세요. 목표 달성이 모든 위험을 없애지는 않습니다.",
      href: "/savings-tracker",
    });
  }

  const actual = result.actualEssentialMonthlyAvgNpr;
  const planned = result.plannedEssentialMonthlyNpr;
  if (actual != null && planned != null && planned > actual * 1.05) {
    insights.push({
      id: "budget-higher",
      tone: "info",
      priority: 8,
      titleEn: "Budget above history",
      titleNe: "बजेट इतिहासभन्दा माथि",
      titleKo: "예산이 이력보다 높음",
      messageEn: "Your essential budget is higher than historical essential spending, so the target uses the higher (conservative) figure.",
      messageNe: "आवश्यक बजेट ऐतिहासिक खर्चभन्दा बढी छ — लक्ष्यले उच्च (संरक्षणात्मक) अंक प्रयोग गर्छ।",
      messageKo: "필수 예산이 과거 필수 지출보다 높아 목표가 더 보수적인 값을 사용합니다.",
      href: "/budget",
    });
  }

  return insights.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

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
  const dataQuality = input.dataQuality ?? null;

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
  const recurringMonthlyIncomeNpr =
    finiteOrNull(input.recurringMonthlyIncomeNpr) ?? monthlyNetIncomeNpr;
  const actualMonthlyTotalExpensesNpr = finiteOrNull(input.actualMonthlyTotalExpensesNpr);

  const capacityIncome = recurringMonthlyIncomeNpr ?? monthlyNetIncomeNpr;

  const actualMonthlySavingsNpr =
    monthlyNetIncomeNpr != null && actualMonthlyTotalExpensesNpr != null
      ? roundMoney(monthlyNetIncomeNpr - actualMonthlyTotalExpensesNpr)
      : null;

  let conservativeMonthlySpendingNpr: number | null = null;
  const planned = finiteOrNull(input.plannedEssentialMonthlyNpr);
  if (actualMonthlyTotalExpensesNpr != null && actualMonthlyTotalExpensesNpr > 0) {
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

  const capacityReliable = dataQuality?.capacityReliable !== false && dataQuality != null
    ? dataQuality.capacityReliable
    : dataQuality == null;

  let availableContributionCapacityNpr: number | null = null;
  if (capacityIncome != null && conservativeMonthlySpendingNpr != null && capacityReliable) {
    availableContributionCapacityNpr = Math.max(
      0,
      roundMoney(capacityIncome - conservativeMonthlySpendingNpr - otherCommitted),
    );
  } else if (capacityIncome != null && conservativeMonthlySpendingNpr != null) {
    // Provisional capacity — may still be shown with quality warnings
    availableContributionCapacityNpr = Math.max(
      0,
      roundMoney(capacityIncome - conservativeMonthlySpendingNpr - otherCommitted),
    );
  }

  const fullyFunded =
    remainingShortfallNpr != null && remainingShortfallNpr <= 0 && hasSufficientData;

  const suppressContrib = dataQuality?.suppressContributionRecommendations === true;
  const suppressDates = dataQuality?.suppressCompletionDates === true;

  let recommendedMonthlyContributionNpr: number | null = null;
  let contributionExceedsCapacity = false;

  if (fullyFunded) {
    recommendedMonthlyContributionNpr = 0;
  } else if (suppressContrib) {
    recommendedMonthlyContributionNpr = null;
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
  }

  const additionalSavingsRequired =
    !fullyFunded &&
    hasSufficientData &&
    capacityReliable &&
    (availableContributionCapacityNpr == null || availableContributionCapacityNpr <= 0);

  let estimatedMonthsRemaining: number | null = null;
  let estimatedCompletionLabel: string | null = null;

  if (fullyFunded) {
    estimatedMonthsRemaining = 0;
    estimatedCompletionLabel = "Emergency Fund Fully Funded";
  } else if (suppressDates) {
    estimatedMonthsRemaining = null;
    estimatedCompletionLabel = null;
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
    estimatedCompletionLabel = `Estimate · ${addMonthsLabel(now, estimatedMonthsRemaining)}`;
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

  const milestones = buildSafetyMilestones(basisNpr, currentReserveNpr);
  const fundingPlans = buildFundingPlans({
    remainingShortfallNpr,
    availableContributionCapacityNpr: capacityReliable
      ? availableContributionCapacityNpr
      : null,
    capacityReliable,
    customDeadlineMonths: input.fundingDeadlineMonths,
  });

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
        dataQuality,
        formatAmount,
        capacityReliable,
      })
    : [
        {
          id: "onboarding",
          tone: "info" as const,
          priority: 1,
          titleEn: "Connect finance data",
          titleNe: "वित्त डाटा जोड्नुहोस्",
          titleKo: "재무 데이터 연결",
          messageEn:
            "Add income, expenses, or a budget for the selected period so we can size your emergency fund.",
          messageNe:
            "चयन अवधिमा आपतकालीन कोष गणना गर्न आय, खर्च वा बजेट थप्नुहोस्।",
          messageKo: "선택한 기간의 비상금 산정을 위해 소득·지출·예산을 추가하세요.",
          href: "/cashflow-dashboard",
        },
      ];

  return {
    hasSufficientData,
    dataSource,
    dataSourceLabel: labelForDataSource(dataSource),
    calculationPeriodLabel: input.analysisPeriodLabel ?? null,
    incomePeriodLabel: input.incomePeriodLabel ?? input.analysisPeriodLabel ?? null,
    expensePeriodLabel: input.expensePeriodLabel ?? input.analysisPeriodLabel ?? null,
    essentialAveragingLabel: input.essentialAveragingLabel ?? null,
    lastUpdatedAt: input.lastUpdatedAt ?? now.toISOString(),
    lastSyncedAt: input.lastSyncedAt ?? null,

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
    recurringMonthlyIncomeNpr,
    actualMonthlyTotalExpensesNpr,
    actualMonthlySavingsNpr,
    conservativeMonthlySpendingNpr,
    availableContributionCapacityNpr,
    allocationPct,
    recommendedMonthlyContributionNpr,
    contributionExceedsCapacity,
    negativeCashflow,
    capacityReliable,

    estimatedMonthsRemaining,
    estimatedCompletionLabel,
    fullyFunded,
    additionalSavingsRequired,

    dataQuality,
    milestones,
    fundingPlans,

    insights,
    currency,
  };
}

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
