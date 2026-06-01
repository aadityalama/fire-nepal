import type { SsfBenefitRow, SsfMonthlyContribution, SsfNotification, NomineeRow } from "@/lib/ssf-pension/types";

/** Empty SSF workspace until user or employer data is connected. */
export const SSF_SUMMARY = {
  totalBalanceNpr: 0,
  estimatedMonthlyPensionNpr: 0,
  contributionMonths: 0,
  readinessScore: 0,
  nextContributionDue: "",
  nextContributionLabel: "",
} as const;

export function buildContributionSeries(): SsfMonthlyContribution[] {
  return [];
}

export const SSF_GROWTH_CHART: { label: string; balance: number; month: string }[] = [];

export const SSF_BENEFITS: SsfBenefitRow[] = [];

export const SSF_NOTIFICATIONS: SsfNotification[] = [];

export const SSF_NOMINEES: NomineeRow[] = [];
