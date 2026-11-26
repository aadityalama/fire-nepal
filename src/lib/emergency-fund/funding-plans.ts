/**
 * Deadline-based funding plans + affordability classification.
 */

export type FundingDeadlineMonths = 3 | 6 | 12 | 24 | number;

export type FundingAffordability =
  | "affordable"
  | "tight_budget"
  | "exceeds_capacity"
  | "insufficient_data";

export type FundingPlanOption = {
  deadlineMonths: number;
  requiredMonthlyContributionNpr: number | null;
  affordability: FundingAffordability;
  labelEn: string;
  alternativeHintEn?: string;
};

export const FUNDING_DEADLINE_OPTIONS = [3, 6, 12, 24] as const;

export function classifyFundingAffordability(
  requiredMonthly: number | null,
  capacityNpr: number | null,
  capacityReliable: boolean,
): FundingAffordability {
  if (!capacityReliable || capacityNpr == null || requiredMonthly == null) {
    return "insufficient_data";
  }
  if (requiredMonthly <= capacityNpr * 0.5) return "affordable";
  if (requiredMonthly <= capacityNpr) return "tight_budget";
  return "exceeds_capacity";
}

export function buildFundingPlans(input: {
  remainingShortfallNpr: number | null;
  availableContributionCapacityNpr: number | null;
  capacityReliable: boolean;
  customDeadlineMonths?: number | null;
}): FundingPlanOption[] {
  const shortfall = input.remainingShortfallNpr;
  const deadlines = [
    ...FUNDING_DEADLINE_OPTIONS,
    ...(input.customDeadlineMonths &&
    input.customDeadlineMonths >= 1 &&
    !(FUNDING_DEADLINE_OPTIONS as readonly number[]).includes(input.customDeadlineMonths)
      ? [Math.round(input.customDeadlineMonths)]
      : []),
  ];

  return deadlines.map((deadlineMonths) => {
    const required =
      shortfall == null || shortfall <= 0
        ? 0
        : Math.ceil(shortfall / deadlineMonths);
    const affordability = classifyFundingAffordability(
      required,
      input.availableContributionCapacityNpr,
      input.capacityReliable,
    );

    let alternativeHintEn: string | undefined;
    if (affordability === "exceeds_capacity" && input.availableContributionCapacityNpr != null) {
      const cap = Math.max(1, input.availableContributionCapacityNpr);
      const affordableMonths = shortfall != null && shortfall > 0 ? Math.ceil(shortfall / cap) : null;
      alternativeHintEn =
        affordableMonths != null
          ? `At your verified capacity, reaching the target would take about ${affordableMonths} months.`
          : "Choose a longer deadline or increase surplus capacity.";
    } else if (affordability === "insufficient_data") {
      alternativeHintEn = "Verify income and expenses for the selected period before committing.";
    }

    return {
      deadlineMonths,
      requiredMonthlyContributionNpr: required,
      affordability,
      labelEn: `${deadlineMonths}-month plan`,
      alternativeHintEn,
    };
  });
}
