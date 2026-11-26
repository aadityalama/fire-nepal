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

  if (input.breakdown.ambiguousLines.length > 0) {
    insights.push({
      id: "ambiguous-budget",
      priority: "missing_budget",
      title: "Review ambiguous annual allocations",
      body: `${input.breakdown.ambiguousLines.length} yearly budget ${
        input.breakdown.ambiguousLines.length === 1 ? "item shares" : "items share"
      } a category with monthly lines but amounts do not match. Review the budget breakdown to avoid double counting.`,
      actionLabel: "Open Budget Planner",
      actionHref: "/budget",
    });
  }

  const urgent = input.upcomingPayments.filter((p) => p.window === "30" || p.window === "90");
  for (const payment of urgent.slice(0, 2)) {
    insights.push({
      id: `annual-${payment.id}`,
      priority: "annual_obligation",
      title: `${payment.name} due soon`,
      body: `Your annual obligation of ${formatEmergencyNpr(payment.amountNpr)} is due ${
        payment.daysUntil <= 0 ? "now" : `in ${payment.daysUntil} days`
      }. Review your available liquidity — this is separate from your normalized emergency fund target.`,
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

  if (
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
        body: `Your monthly budget ${delta > 0 ? "increased" : "decreased"} by ${formatEmergencyNpr(
          Math.abs(delta),
        )}, ${delta > 0 ? "increasing" : "decreasing"} your ${core.protectionMonths}-month emergency fund target by ${formatEmergencyNpr(Math.abs(targetDelta))}.`,
        actionLabel: "Open Budget Planner",
        actionHref: "/budget",
      });
    }
  }

  if (input.mode === "full_lifestyle" && core.remainingShortfallNpr > 0) {
    insights.push({
      id: "consider-essential",
      priority: "funding_plan",
      title: "Consider Essential Survival mode",
      body: "Switching to Essential Survival Protection may reduce your emergency funding requirement by focusing on commitments you must continue during an emergency.",
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
