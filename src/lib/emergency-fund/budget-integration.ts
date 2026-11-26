/**
 * Normalize Monthly + Yearly Budget Planner records into one Emergency Fund dataset.
 *
 * Canonical rules (Emergency Fund 3.0 audit fix):
 * - Monthly and Yearly rows are independent in `finance_budget_records`.
 * - Monthly dashboard totals do NOT auto-include Yearly monthly equivalents.
 * - Yearly monthly equivalent uses exact `amountNpr / 12` (Budget Planner UI may
 *   store `Math.round(amount/12)` per row — that rounded sum can differ by ~NPR 1).
 * - Independent yearly obligations are INCLUDED unless proven already covered or a
 *   full yearly projection of the monthly set.
 * - Same-category mismatched amounts are included and flagged for review (provisional),
 *   never silently dropped (underestimation is unsafe).
 * - Emergency-category planned contributions are transfers into the reserve, not
 *   protection expenses — excluded from the protection basis.
 */

import type { BudgetRecord } from "@/lib/budget/types";
import {
  isEmergencyFundContributionCategory,
  isSuggestedEssentialCategory,
  normalizeEmergencyFinanceCategory,
  SUGGESTED_ESSENTIAL_CATEGORY_IDS,
} from "@/lib/emergency-fund/category-utils";
import {
  approxEqual,
  finiteNonNeg,
} from "@/lib/emergency-fund/math";
import type {
  EmergencyBudgetLine,
  NormalizedBudgetBreakdown,
  ProtectionMode,
  YearlyAllocationDecision,
} from "@/lib/emergency-fund/types";

/** Categories suggested as essential during an emergency (user can override). */
export const SUGGESTED_ESSENTIAL_CATEGORIES = SUGGESTED_ESSENTIAL_CATEGORY_IDS;

/**
 * Exact monthly equivalent used by Emergency Fund math.
 * Yearly: amount / 12 (no intermediate rounding).
 * Monthly: stored monthly budget (already the planned monthly amount).
 */
export function monthlyEquivalentExact(record: BudgetRecord): number {
  if (record.period === "Yearly") {
    return finiteNonNeg(record.amountNpr) / 12;
  }
  return finiteNonNeg(record.monthlyBudgetNpr || record.amountNpr);
}

function isSuggestedEssential(category: string): boolean {
  return isSuggestedEssentialCategory(category);
}

function latestUpdatedAt(records: BudgetRecord[]): string | null {
  let latest: string | null = null;
  for (const record of records) {
    if (!record.updatedAt) continue;
    if (!latest || record.updatedAt > latest) latest = record.updatedAt;
  }
  return latest;
}

/**
 * Detect whether the yearly set is essentially an annual projection of the monthly set.
 * Uses totals (within 1 NPR) and overlapping categories — not names alone.
 */
function isYearlyProjectionOfMonthly(
  monthlyTotal: number,
  yearlyAnnualTotal: number,
  monthlyCategories: Set<string>,
  yearlyCategories: Set<string>,
): boolean {
  if (monthlyTotal <= 0 || yearlyAnnualTotal <= 0) return false;
  if (!approxEqual(yearlyAnnualTotal, monthlyTotal * 12, 1)) return false;
  if (monthlyCategories.size === 0 || yearlyCategories.size === 0) return true;
  let overlap = 0;
  for (const cat of yearlyCategories) {
    if (monthlyCategories.has(cat)) overlap += 1;
  }
  return overlap / yearlyCategories.size >= 0.5;
}

/**
 * A yearly obligation is already funded via a matching monthly allocation when
 * the same normalized category has a monthly line ≈ yearly/12.
 */
function findMatchingMonthlyAllocation(
  yearly: BudgetRecord,
  monthlyByCategory: Map<string, BudgetRecord[]>,
): BudgetRecord | null {
  const category = normalizeEmergencyFinanceCategory(yearly.category);
  const candidates = monthlyByCategory.get(category) ?? [];
  const yearlyMonthly = monthlyEquivalentExact(yearly);
  for (const monthly of candidates) {
    // Skip emergency contribution lines as "already included" matches.
    if (isEmergencyFundContributionCategory(monthly.category)) continue;
    const monthlyAmt = monthlyEquivalentExact(monthly);
    if (approxEqual(monthlyAmt, yearlyMonthly, 1)) return monthly;
  }
  return null;
}

function buildLine(
  record: BudgetRecord,
  inclusion: EmergencyBudgetLine["inclusion"],
  options: { needsReview?: boolean; reviewCandidateMonthlyIds?: string[] } = {},
): EmergencyBudgetLine {
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    period: record.period,
    originalAmountNpr: finiteNonNeg(record.amountNpr),
    monthlyEquivalentNpr: monthlyEquivalentExact(record),
    inclusion,
    source: record.period === "Yearly" ? "yearly_budget" : "monthly_budget",
    suggestedEssential: isSuggestedEssential(record.category),
    needsReview: Boolean(options.needsReview),
    reviewCandidateMonthlyIds: options.reviewCandidateMonthlyIds,
  };
}

export type NormalizeBudgetOptions = {
  /**
   * Persisted user resolutions for provisional yearly allocations.
   * Missing entries default to including the yearly item as a separate obligation.
   */
  yearlyAllocationDecisions?: Readonly<Record<string, YearlyAllocationDecision>>;
};

/**
 * Build the transparent normalized budget breakdown used by every EF surface.
 */
export function normalizeBudgetForEmergencyFund(
  records: readonly BudgetRecord[],
  options: NormalizeBudgetOptions = {},
): NormalizedBudgetBreakdown {
  const decisions = options.yearlyAllocationDecisions ?? {};
  const active = records.filter((r) => finiteNonNeg(r.amountNpr) > 0 || finiteNonNeg(r.monthlyBudgetNpr) > 0);
  const monthly = active.filter((r) => r.period === "Monthly");
  const yearly = active.filter((r) => r.period === "Yearly");

  const grossMonthlyBudgetNpr = monthly.reduce((sum, r) => sum + monthlyEquivalentExact(r), 0);
  const yearlyBudgetTotalNpr = yearly.reduce((sum, r) => sum + finiteNonNeg(r.amountNpr), 0);
  const annualMonthlyEquivalentNpr = yearly.reduce((sum, r) => sum + monthlyEquivalentExact(r), 0);

  // Rounded Budget Planner monthly equivalents (for explaining ~NPR 1 display drift).
  const roundedAnnualMonthlyEquivalentNpr = yearly.reduce(
    (sum, r) => sum + Math.round(finiteNonNeg(r.amountNpr) / 12),
    0,
  );

  const monthlyCategories = new Set(
    monthly
      .filter((r) => !isEmergencyFundContributionCategory(r.category))
      .map((r) => normalizeEmergencyFinanceCategory(r.category)),
  );
  const yearlyCategories = new Set(yearly.map((r) => normalizeEmergencyFinanceCategory(r.category)));

  // Projection detection uses non-contribution monthly total.
  const monthlyForProjection = monthly
    .filter((r) => !isEmergencyFundContributionCategory(r.category))
    .reduce((sum, r) => sum + monthlyEquivalentExact(r), 0);

  const projectionDuplicate = isYearlyProjectionOfMonthly(
    monthlyForProjection,
    yearlyBudgetTotalNpr,
    monthlyCategories,
    yearlyCategories,
  );

  const monthlyByCategory = new Map<string, BudgetRecord[]>();
  for (const record of monthly) {
    const key = normalizeEmergencyFinanceCategory(record.category);
    const list = monthlyByCategory.get(key) ?? [];
    list.push(record);
    monthlyByCategory.set(key, list);
  }

  const allLines: EmergencyBudgetLine[] = [];
  let emergencyFundContributionExcludedNpr = 0;
  let annualAllocationsAlreadyIncludedNpr = 0;
  let yearlyProjectionDuplicateNpr = 0;
  let additionalAnnualMonthlyAllocationsNpr = 0;
  const provisionalLines: EmergencyBudgetLine[] = [];

  for (const record of monthly) {
    if (isEmergencyFundContributionCategory(record.category)) {
      const line = buildLine(record, "emergency_contribution");
      allLines.push(line);
      emergencyFundContributionExcludedNpr += line.monthlyEquivalentNpr;
      continue;
    }
    allLines.push(buildLine(record, "included"));
  }

  for (const record of yearly) {
    const monthlyEq = monthlyEquivalentExact(record);

    if (isEmergencyFundContributionCategory(record.category)) {
      const line = buildLine(record, "emergency_contribution");
      allLines.push(line);
      emergencyFundContributionExcludedNpr += monthlyEq;
      continue;
    }

    if (projectionDuplicate) {
      const line = buildLine(record, "projection_duplicate");
      allLines.push(line);
      yearlyProjectionDuplicateNpr += monthlyEq;
      continue;
    }

    const match = findMatchingMonthlyAllocation(record, monthlyByCategory);
    if (match) {
      const line = buildLine(record, "already_included");
      allLines.push(line);
      annualAllocationsAlreadyIncludedNpr += monthlyEq;
      continue;
    }

    const category = normalizeEmergencyFinanceCategory(record.category);
    const sameCategoryMonthly = (monthlyByCategory.get(category) ?? []).filter(
      (r) => !isEmergencyFundContributionCategory(r.category),
    );
    const candidateIds = sameCategoryMonthly.map((r) => r.id);
    const decision = decisions[record.id];

    // User confirmed the yearly amount is already represented monthly / linked.
    if (
      decision?.resolution === "already_included" ||
      decision?.resolution === "linked"
    ) {
      const line = buildLine(record, "already_included", {
        reviewCandidateMonthlyIds: candidateIds,
      });
      allLines.push(line);
      annualAllocationsAlreadyIncludedNpr += monthlyEq;
      continue;
    }

    // Default and explicit "separate": INCLUDE independent annual obligations.
    // Category overlap alone is never enough to drop them.
    const needsReview =
      decision?.resolution !== "separate" && sameCategoryMonthly.length > 0;
    const line = buildLine(record, "included", {
      needsReview,
      reviewCandidateMonthlyIds: candidateIds,
    });
    allLines.push(line);
    additionalAnnualMonthlyAllocationsNpr += monthlyEq;
    if (needsReview) provisionalLines.push(line);
  }

  const originalMonthlyBudgetNpr = grossMonthlyBudgetNpr;
  const totalNormalizedBudgetNpr =
    grossMonthlyBudgetNpr -
    emergencyFundContributionExcludedNpr +
    additionalAnnualMonthlyAllocationsNpr;

  // Legacy alias: effective monthly before mode selection = total normalized protection pool.
  const effectiveMonthlyBudgetNpr = totalNormalizedBudgetNpr;

  const protectionEligibleLines = allLines.filter((line) => line.inclusion === "included");
  const hasBudgetData = monthly.length > 0 || yearly.length > 0;
  const isPartialBudget = hasBudgetData && monthly.length === 0 && yearly.length > 0;
  const isProvisional = provisionalLines.length > 0;

  return {
    hasBudgetData,
    isPartialBudget,
    isProvisional,
    originalMonthlyBudgetNpr,
    grossMonthlyBudgetNpr,
    yearlyBudgetTotalNpr,
    annualMonthlyEquivalentNpr,
    roundedAnnualMonthlyEquivalentNpr,
    annualAllocationsAlreadyIncludedNpr,
    yearlyProjectionDuplicateNpr,
    additionalAnnualMonthlyAllocationsNpr,
    emergencyFundContributionExcludedNpr,
    totalNormalizedBudgetNpr,
    effectiveMonthlyBudgetNpr,
    includedLines: protectionEligibleLines,
    protectionEligibleLines,
    allLines,
    ambiguousLines: provisionalLines,
    provisionalLines,
    lastBudgetUpdatedAt: latestUpdatedAt(active),
    currency: "NPR",
  };
}

export type ResolveProtectionBasisOptions = {
  /** Essential Survival: selected protection-eligible record ids. */
  essentialRecordIds?: readonly string[];
  /** Full Lifestyle: optional explicit user exclusions from the eligible set. */
  excludedRecordIds?: readonly string[];
};

/**
 * Monthly protection basis for the selected mode.
 * Essential and Full Lifestyle both select from the same protection-eligible dataset.
 */
export function resolveMonthlyProtectionBasis(
  breakdown: NormalizedBudgetBreakdown,
  mode: ProtectionMode,
  essentialRecordIds: readonly string[] = [],
  options: ResolveProtectionBasisOptions = {},
): {
  monthlyProtectionBasisNpr: number;
  essentialSelectedBudgetNpr: number;
  excludedBudgetNpr: number;
  otherUserExclusionsNpr: number;
  selectedLines: EmergencyBudgetLine[];
  excludedLines: EmergencyBudgetLine[];
  finalMonthlyProtectionBasisNpr: number;
} {
  const eligible = breakdown.protectionEligibleLines ?? breakdown.includedLines;
  const userExcluded = new Set(options.excludedRecordIds ?? []);

  if (mode === "full_lifestyle") {
    const selectedLines = eligible.filter((line) => !userExcluded.has(line.id));
    const excludedLines = eligible.filter((line) => userExcluded.has(line.id));
    const total = selectedLines.reduce((sum, line) => sum + line.monthlyEquivalentNpr, 0);
    const otherUserExclusionsNpr = excludedLines.reduce(
      (sum, line) => sum + line.monthlyEquivalentNpr,
      0,
    );
    return {
      monthlyProtectionBasisNpr: total,
      essentialSelectedBudgetNpr: total,
      excludedBudgetNpr: otherUserExclusionsNpr,
      otherUserExclusionsNpr,
      selectedLines,
      excludedLines,
      finalMonthlyProtectionBasisNpr: total,
    };
  }

  const selected = new Set(essentialRecordIds);
  // Only protection-eligible ids count — never emergency_contribution / already_included / projection.
  const selectedLines = eligible.filter((line) => selected.has(line.id));
  const excludedLines = eligible.filter((line) => !selected.has(line.id));
  const essentialSelectedBudgetNpr = selectedLines.reduce(
    (sum, line) => sum + line.monthlyEquivalentNpr,
    0,
  );
  const excludedBudgetNpr = excludedLines.reduce((sum, line) => sum + line.monthlyEquivalentNpr, 0);

  return {
    monthlyProtectionBasisNpr: essentialSelectedBudgetNpr,
    essentialSelectedBudgetNpr,
    excludedBudgetNpr,
    otherUserExclusionsNpr: 0,
    selectedLines,
    excludedLines,
    finalMonthlyProtectionBasisNpr: essentialSelectedBudgetNpr,
  };
}

/** Default essential selection: suggested essential categories among protection-eligible lines. */
export function defaultEssentialRecordIds(breakdown: NormalizedBudgetBreakdown): string[] {
  const eligible = breakdown.protectionEligibleLines ?? breakdown.includedLines;
  return eligible.filter((line) => line.suggestedEssential).map((line) => line.id);
}

/** Planned monthly Emergency Fund contribution implied by budget (never auto-posts reserve). */
export function plannedEmergencyContributionFromBudget(
  breakdown: NormalizedBudgetBreakdown,
): number {
  return breakdown.allLines
    .filter((line) => line.inclusion === "emergency_contribution")
    .reduce((sum, line) => sum + line.monthlyEquivalentNpr, 0);
}
