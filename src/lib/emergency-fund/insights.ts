/**
 * Deterministic budget-based Emergency Fund insights (no external AI).
 */

import { formatEmergencyNpr, formatMonthsLabel } from "@/lib/emergency-fund/math";
import type {
  EmergencyInsight,
  NormalizedBudgetBreakdown,
  ProtectionMode,
  SafetyMilestone,
  UpcomingAnnualPayment,
} from "@/lib/emergency-fund/types";
import type { EmergencyFundCoreResult } from "@/lib/emergency-fund/calculations";
import type { MonthlyFundingPlanResult } from "@/lib/emergency-fund/calculations";

export type BuildInsightsInput = {
  breakdown: NormalizedBudgetBreakdown;
  core: EmergencyFundCoreResult | null;
  mode: ProtectionMode;
  milestones: SafetyMilestone[];
  fundingPlan: MonthlyFundingPlanResult | null;
  upcomingPayments: UpcomingAnnualPayment[];
  previousEffectiveMonthlyBudgetNpr: number | null;
  /**
   * True only when Budget Planner source records changed (ids/amounts/periods).
   * False for EF normalization rule changes, protection mode, or selection edits.
   */
  budgetPlannerChanged?: boolean;
};

function priorityRank(priority: EmergencyInsight["priority"]): number {
  const order: EmergencyInsight["priority"][] = [
    "missing_budget",
    "annual_obligation",
    "insufficient_reserve",
    "funding_shortfall",
    "funding_plan",
    "milestone",
  ];
  return order.indexOf(priority);
}

export function buildEmergencyInsights(input: BuildInsightsInput): EmergencyInsight[] {
  const insights: EmergencyInsight[] = [];

  if (!input.breakdown.hasBudgetData || !input.core) {
    insights.push({
      id: "missing-budget",
      priority: "missing_budget",
      title: "Create your Monthly Budget",
      body: "Create your Monthly Budget to automatically calculate your Emergency Fund.",
      actionLabel: "Create Budget",
      actionHref: "/budget",
    });
    return insights;
  }

  if (input.breakdown.isPartialBudget) {
    insights.push({
      id: "partial-budget",
      priority: "missing_budget",
      title: "Partial budget detected",
      body: "Only yearly obligations were found. Add a Monthly Budget for a complete protection plan.",
      actionLabel: "Open Budget Planner",
      actionHref: "/budget",
    });
  }

  if (input.breakdown.isProvisional || input.breakdown.provisionalLines.length > 0) {
    insights.push({
      id: "provisional-budget",
      priority: "missing_budget",
      title: "Unresolved budget integration",
      body: `${input.breakdown.provisionalLines.length} yearly ${
        input.breakdown.provisionalLines.length === 1 ? "obligation is" : "obligations are"
      } included in Full Lifestyle protection but share a category with monthly lines at different amounts. Confirm each as a separate annual obligation or mark as already included. Calculations remain provisional until reviewed.`,
      actionLabel: "Review allocations",
      actionHref: "/budget",
    });
  }

  if (input.breakdown.emergencyFundContributionExcludedNpr > 0) {
    insights.push({
      id: "ef-contribution-excluded",
      priority: "funding_plan",
      title: "Emergency contribution excluded from expenses",
      body: `Your planned Emergency Fund contribution of ${formatEmergencyNpr(
        input.breakdown.emergencyFundContributionExcludedNpr,
      )} / month is treated as a transfer into savings, not a living expense that the reserve must cover.`,
    });
  }

  const urgent = input.upcomingPayments.filter(
    (p) =>
      p.status === "overdue" ||
      p.status === "due_today" ||
      p.status === "partially_paid" ||
      p.window === "30" ||
      p.window === "90",
  );
  const seenPaymentInsights = new Set<string>();
  for (const payment of urgent.slice(0, 3)) {
    if (seenPaymentInsights.has(payment.id)) continue;
    seenPaymentInsights.add(payment.id);
    insights.push({
      id: `annual-${payment.id}`,
      priority: "annual_obligation",
      title: `${payment.name}: ${payment.statusLabel}`,
      body: `Annual obligation of ${formatEmergencyNpr(payment.amountNpr)} (due ${payment.dueDate}). ${
        payment.status === "overdue"
          ? "This payment is overdue — review liquidity separately from your emergency fund target."
          : "Liquidity risk is separate from your normalized emergency fund target."
      }`,
      actionLabel: "Review payments",
    });
  }

  const core = input.core;
  if (core.safetyRunwayMonths != null && core.monthlyProtectionBasisNpr > 0) {
    if (core.safetyRunwayMonths < core.protectionMonths) {
      insights.push({
        id: "runway-short",
        priority: "insufficient_reserve",
        title: "Limited safety runway",
        body: `Your emergency reserve currently covers ${formatMonthsLabel(core.safetyRunwayMonths)} of your planned lifestyle.`,
      });
    }
  }

  if (core.remainingShortfallNpr > 0) {
    insights.push({
      id: "shortfall",
      priority: "funding_shortfall",
      title: "Funding shortfall remains",
      body: `You need an additional ${formatEmergencyNpr(core.remainingShortfallNpr)} to achieve your ${core.protectionMonths}-month protection target.`,
    });
  }

  // previousEffective lags only when Budget Planner source records change (dashboard sync).
  // Normalization / selection-only shifts collapse previous → current, so they never reach here.
  // Optional budgetPlannerChanged=false hard-blocks the insight for unit tests.
  if (
    input.budgetPlannerChanged !== false &&
    input.previousEffectiveMonthlyBudgetNpr != null &&
    Number.isFinite(input.previousEffectiveMonthlyBudgetNpr) &&
    input.previousEffectiveMonthlyBudgetNpr > 0
  ) {
    const delta =
      input.breakdown.effectiveMonthlyBudgetNpr - input.previousEffectiveMonthlyBudgetNpr;
    if (Math.abs(delta) >= 1) {
      const targetDelta = delta * core.protectionMonths;
      insights.push({
        id: "budget-change",
        priority: "funding_shortfall",
        title: delta > 0 ? "Monthly budget increased" : "Monthly budget decreased",
        body: `Your Budget Planner totals ${delta > 0 ? "increased" : "decreased"} by ${formatEmergencyNpr(
          Math.abs(delta),
        )} in the Emergency Fund basis, ${delta > 0 ? "increasing" : "decreasing"} your ${core.protectionMonths}-month emergency fund target by ${formatEmergencyNpr(Math.abs(targetDelta))}.`,
        actionLabel: "Open Budget Planner",
        actionHref: "/budget",
      });
    }
  }

  if (input.mode === "full_lifestyle" && core.remainingShortfallNpr > 0) {
    insights.push({
      id: "consider-essential",
      priority: "funding_plan",
      title: "Consider Essential Only mode",
      body: "Switching to Essential Only may reduce your emergency funding requirement by focusing on commitments you must continue during an emergency.",
    });
  }

  if (input.fundingPlan?.estimatedMonthsRemaining != null && core.remainingShortfallNpr > 0) {
    const months = input.fundingPlan.estimatedMonthsRemaining;
    insights.push({
      id: "funding-pace",
      priority: "funding_plan",
      title: "Personal funding pace",
      body: `Based on your planned monthly contribution, your estimated completion time is ${months} ${
        months === 1 ? "month" : "months"
      }.`,
    });
  } else if (core.remainingShortfallNpr > 0 && !input.fundingPlan) {
    insights.push({
      id: "set-contribution",
      priority: "funding_plan",
      title: "Set a personal funding plan",
      body: "Set your monthly contribution to create a personal funding plan.",
    });
  }

  const newlyAchieved = input.milestones.filter((m) => m.achieved);
  if (newlyAchieved.length > 0) {
    const top = newlyAchieved[newlyAchieved.length - 1];
    insights.push({
      id: `milestone-${top.months}`,
      priority: "milestone",
      title: `${top.months}-month milestone achieved`,
      body: `Your ${formatMonthsLabel(top.months).replace(/^\d+(\.\d+)?/, String(top.months))} protection milestone has been achieved. Reaching a milestone does not eliminate all financial risks.`,
    });
  }

  return insights
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
    .slice(0, 6);
}
