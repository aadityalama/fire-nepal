/**
 * Financial data quality validation for Emergency Fund.
 * "Verified" means consistency checks passed — not independent audit.
 */

import type { CurrencyConversionMeta } from "@/lib/emergency-fund/types";

export type DataQualityState = "verified" | "estimated" | "incomplete" | "needs_review";

export type DataQualityIssue = {
  id: string;
  severity: "critical" | "warning" | "info";
  state: DataQualityState;
  messageEn: string;
  messageNe: string;
  messageKo: string;
  href?: string;
};

export type DataQualityReport = {
  overall: DataQualityState;
  income: DataQualityState;
  expenses: DataQualityState;
  budget: DataQualityState;
  exchangeRate: DataQualityState;
  periodConsistency: DataQualityState;
  issues: DataQualityIssue[];
  /** True when contribution recommendations should be suppressed. */
  suppressContributionRecommendations: boolean;
  /** True when completion dates should be suppressed. */
  suppressCompletionDates: boolean;
  /** True when capacity math is trustworthy enough to show. */
  capacityReliable: boolean;
};

export type DataQualityInput = {
  monthlyNetIncomeNpr: number | null;
  recurringMonthlyIncomeNpr: number | null;
  irregularIncomeShare: number | null;
  actualMonthlyTotalExpensesNpr: number | null;
  actualEssentialMonthlyAvgNpr: number | null;
  plannedEssentialMonthlyNpr: number | null;
  cashflowEssentialMonthlyNpr: number | null;
  expenseMonthsWithData: number;
  requestedExpenseMonths: number;
  incomeMonthKeys: string[];
  expenseMonthKeys: string[];
  includesPartialCurrent: boolean;
  categoryClassificationReliable: boolean;
  currency: CurrencyConversionMeta;
  hasNonNprExpensesNeedingFx: boolean;
  duplicateIncomeSuspected: boolean;
  legacyIncomeMixedWithEntries: boolean;
};

function rank(state: DataQualityState): number {
  if (state === "incomplete") return 0;
  if (state === "needs_review") return 1;
  if (state === "estimated") return 2;
  return 3;
}

function worst(...states: DataQualityState[]): DataQualityState {
  return states.reduce((a, b) => (rank(a) <= rank(b) ? a : b));
}

export function assessEmergencyDataQuality(input: DataQualityInput): DataQualityReport {
  const issues: DataQualityIssue[] = [];

  let income: DataQualityState = "incomplete";
  if (input.monthlyNetIncomeNpr != null && input.monthlyNetIncomeNpr > 0) {
    income = "verified";
    if (input.legacyIncomeMixedWithEntries) {
      income = "needs_review";
      issues.push({
        id: "legacy-income-mix",
        severity: "warning",
        state: "needs_review",
        messageEn:
          "Legacy cashflow income fields and dated income entries both have values. Totals may be double counted — review Cashflow income.",
        messageNe: "पुरानो क्यासफ्लो आय र मिति भएका आय दुवै छन् — दोहोरो गणना हुन सक्छ।",
        messageKo: "레거시 소득과 날짜 소득이 함께 있어 이중 합산될 수 있습니다. 캐시플로를 확인하세요.",
        href: "/cashflow-dashboard",
      });
    }
    if (input.duplicateIncomeSuspected) {
      income = "needs_review";
      issues.push({
        id: "duplicate-income",
        severity: "warning",
        state: "needs_review",
        messageEn: "Possible duplicate income entries detected for the calculation period.",
        messageNe: "गणना अवधिमा दोहोरिएका आय प्रविष्टि हुन सक्छ।",
        messageKo: "계산 기간에 중복 소득 항목이 있을 수 있습니다.",
        href: "/cashflow-dashboard",
      });
    }
    if ((input.irregularIncomeShare ?? 0) >= 0.35) {
      income = worst(income, "estimated");
      issues.push({
        id: "irregular-income",
        severity: "info",
        state: "estimated",
        messageEn:
          "A large share of period income is one-time, bonus, or yearly. Contribution capacity uses recurring income only when available.",
        messageNe: "आयको ठूलो हिस्सा एकपटक/बोनस/वार्षिक छ — योगदान क्षमता नियमित आयमा आधारित छ।",
        messageKo: "일시·보너스·연간 소득 비중이 큽니다. 기여 여력은 가능하면 반복 소득만 사용합니다.",
        href: "/cashflow-dashboard",
      });
    }
  } else {
    issues.push({
      id: "missing-income",
      severity: "critical",
      state: "incomplete",
      messageEn: "No reliable monthly income for the selected period.",
      messageNe: "चयन अवधिमा भरपर्दो मासिक आय छैन।",
      messageKo: "선택한 기간에 신뢰할 수 있는 월 소득이 없습니다.",
      href: "/cashflow-dashboard",
    });
  }

  let expenses: DataQualityState = "incomplete";
  if (input.actualEssentialMonthlyAvgNpr != null && input.actualEssentialMonthlyAvgNpr > 0) {
    expenses = "verified";
    if (input.expenseMonthsWithData < input.requestedExpenseMonths) {
      expenses = "estimated";
      issues.push({
        id: "partial-expense-history",
        severity: "warning",
        state: "estimated",
        messageEn: `Essential expenses use ${input.expenseMonthsWithData} of ${input.requestedExpenseMonths} requested months — treat as an estimate.`,
        messageNe: `आवश्यक खर्च ${input.requestedExpenseMonths} मध्ये ${input.expenseMonthsWithData} महिनामा आधारित अनुमान हो।`,
        messageKo: `필수 지출은 요청 ${input.requestedExpenseMonths}개월 중 ${input.expenseMonthsWithData}개월만 반영한 추정입니다.`,
        href: "/expense-dashboard?finance=personal",
      });
    }
    if (input.includesPartialCurrent) {
      expenses = worst(expenses, "estimated");
      issues.push({
        id: "partial-month",
        severity: "info",
        state: "estimated",
        messageEn: "Calculation includes the current incomplete month.",
        messageNe: "गणनामा हालको अपूर्ण महिना समावेश छ।",
        messageKo: "계산에 현재의 미완료 월이 포함되어 있습니다.",
      });
    }
    if (!input.categoryClassificationReliable) {
      expenses = worst(expenses, "needs_review");
      issues.push({
        id: "category-classification",
        severity: "warning",
        state: "needs_review",
        messageEn: "Some expenses could not be reliably classified as essential.",
        messageNe: "केही खर्चलाई आवश्यक भनी भरपर्दो रूपमा वर्गीकरण गर्न सकिएन।",
        messageKo: "일부 지출을 필수로 안정적으로 분류할 수 없습니다.",
        href: "/expense-dashboard?finance=personal",
      });
    }
  } else if (input.plannedEssentialMonthlyNpr != null && input.plannedEssentialMonthlyNpr > 0) {
    expenses = "estimated";
    issues.push({
      id: "budget-only-expenses",
      severity: "info",
      state: "estimated",
      messageEn: "Expense basis uses budget allocations because actual essential history is missing.",
      messageNe: "वास्तविक आवश्यक खर्च इतिहास नभएकाले बजेट प्रयोग भएको छ।",
      messageKo: "실제 필수 지출 이력이 없어 예산을 사용합니다.",
      href: "/budget",
    });
  } else if (input.cashflowEssentialMonthlyNpr != null && input.cashflowEssentialMonthlyNpr > 0) {
    expenses = "estimated";
    issues.push({
      id: "cashflow-only-expenses",
      severity: "warning",
      state: "estimated",
      messageEn: "Expense basis uses Cashflow category estimates — add Expense Tracker history for accuracy.",
      messageNe: "खर्च आधार क्यासफ्लो अनुमानमा छ — सटीकताका लागि खर्च ट्र्याकर थप्नुहोस्।",
      messageKo: "지출 기준이 캐시플로 추정입니다. 정확도를 위해 지출 이력을 추가하세요.",
      href: "/expense-dashboard?finance=personal",
    });
  } else {
    issues.push({
      id: "missing-expenses",
      severity: "critical",
      state: "incomplete",
      messageEn: "No reliable essential expense data for the selected period.",
      messageNe: "चयन अवधिमा भरपर्दो आवश्यक खर्च डाटा छैन।",
      messageKo: "선택한 기간에 신뢰할 수 있는 필수 지출 데이터가 없습니다.",
      href: "/expense-dashboard?finance=personal",
    });
  }

  const budget: DataQualityState =
    input.plannedEssentialMonthlyNpr != null && input.plannedEssentialMonthlyNpr > 0
      ? "verified"
      : "incomplete";

  let exchangeRate: DataQualityState = "verified";
  if (input.hasNonNprExpensesNeedingFx) {
    if (input.currency.incomplete || input.currency.krwPerNpr == null) {
      exchangeRate = "incomplete";
      issues.push({
        id: "fx-missing",
        severity: "critical",
        state: "incomplete",
        messageEn: "Non-NPR amounts need exchange rates that are missing — those amounts were excluded.",
        messageNe: "NPR बाहेकका रकमका लागि विनिमय दर छैन — ती रकम छुटेका छन्।",
        messageKo: "NPR 외 금액에 필요한 환율이 없어 해당 금액이 제외되었습니다.",
      });
    } else if (input.currency.stale) {
      exchangeRate = "needs_review";
      issues.push({
        id: "fx-stale",
        severity: "warning",
        state: "needs_review",
        messageEn: "Exchange-rate data may be stale.",
        messageNe: "विनिमय दर डाटा पुरानो हुन सक्छ।",
        messageKo: "환율 데이터가 오래되었을 수 있습니다.",
      });
    }
  }

  let periodConsistency: DataQualityState = "verified";
  const incomeSet = new Set(input.incomeMonthKeys);
  const expenseSet = new Set(input.expenseMonthKeys);
  const same =
    incomeSet.size === expenseSet.size && [...incomeSet].every((k) => expenseSet.has(k));
  if (!same && input.incomeMonthKeys.length > 0 && input.expenseMonthKeys.length > 0) {
    periodConsistency = "needs_review";
    issues.push({
      id: "period-mismatch",
      severity: "warning",
      state: "needs_review",
      messageEn: "Income and expense calculation periods differ — surplus may be misleading.",
      messageNe: "आय र खर्च गणना अवधि फरक छ — बचत क्षमता भ्रमपूर्ण हुन सक्छ।",
      messageKo: "소득·지출 계산 기간이 달라 여유 자금이 왜곡될 수 있습니다.",
    });
  }

  const overall = worst(income, expenses, exchangeRate, periodConsistency);
  const capacityReliable =
    income !== "incomplete" &&
    expenses !== "incomplete" &&
    exchangeRate !== "incomplete" &&
    !input.legacyIncomeMixedWithEntries &&
    periodConsistency !== "needs_review";

  const suppressContributionRecommendations =
    !capacityReliable || income === "incomplete" || income === "needs_review";
  const suppressCompletionDates = suppressContributionRecommendations || expenses === "incomplete";

  return {
    overall,
    income,
    expenses,
    budget,
    exchangeRate,
    periodConsistency,
    issues: issues.sort((a, b) => {
      const sev = { critical: 0, warning: 1, info: 2 };
      return sev[a.severity] - sev[b.severity];
    }),
    suppressContributionRecommendations,
    suppressCompletionDates,
    capacityReliable,
  };
}
