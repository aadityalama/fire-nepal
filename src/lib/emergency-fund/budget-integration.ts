/**
 * Normalize Monthly + Yearly Budget Planner records into one Emergency Fund dataset.
 *
 * Canonical rules (Emergency Fund 3.0 final normalization correction):
 * - Monthly and Yearly rows are independent in `finance_budget_records`.
 * - Monthly dashboard totals do NOT auto-include Yearly monthly equivalents.
 * - Yearly monthly equivalent uses exact `amountNpr / 12`.
 * - Independent yearly obligations are INCLUDED by default.
 * - Category overlap or near-matching amounts only flag review — never auto-exclude.
 * - `already_included` / linked status requires an explicit user decision (or a
 *   verified linkedMonthlyRecordId from that decision). There is no DB source link.
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
 * Stable fingerprint of Budget Planner record amounts/periods (not EF rule output).
 * Used so Smart Insights only report budget changes when planner data actually changed.
 */
export function budgetPlannerSignature(records: readonly BudgetRecord[]): string {
  const parts = records
    .map((r) => {
      const amount = finiteNonNeg(r.amountNpr);
      const monthly = finiteNonNeg(r.monthlyBudgetNpr);
      return `${r.id}|${r.period}|${r.category}|${amount}|${monthly}|${r.updatedAt ?? ""}`;
    })
    .sort();
  return parts.join(";");
}

/**
 * Detect whether the yearly set is essentially an annual projection of the monthly set.
 * Uses totals (within 1 NPR) and overlapping categories — not names alone.
 * This is a full-set projection check, not per-row amount matching.
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
 * Find same-category monthly candidates for review / explicit linking.
 * Does NOT auto-classify as already_included — category+amount alone is insufficient.
 */
export function findSameCategoryMonthlyCandidates(
  yearly: BudgetRecord,
  monthlyByCategory: Map<string, BudgetRecord[]>,
): { candidates: BudgetRecord[]; nearAmountMatchIds: string[] } {
  const category = normalizeEmergencyFinanceCategory(yearly.category);
  const candidates = (monthlyByCategory.get(category) ?? []).filter(
    (r) => !isEmergencyFundContributionCategory(r.category),
  );
  const yearlyMonthly = monthlyEquivalentExact(yearly);
  const nearAmountMatchIds: string[] = [];
  for (const monthly of candidates) {
    const monthlyAmt = monthlyEquivalentExact(monthly);
    if (approxEqual(monthlyAmt, yearlyMonthly, 1)) {
      nearAmountMatchIds.push(monthly.id);
    }
  }
  return { candidates, nearAmountMatchIds };
}

function buildLine(
  record: BudgetRecord,
  inclusion: EmergencyBudgetLine["inclusion"],
  options: {
    needsReview?: boolean;
    reviewCandidateMonthlyIds?: string[];
    classificationSource?: EmergencyBudgetLine["classificationSource"];
    nearAmountMatch?: boolean;
  } = {},
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
    classificationSource: options.classificationSource ?? "automatic",
    nearAmountMatch: Boolean(options.nearAmountMatch),
  };
}

export type NormalizeBudgetOptions = {
  /**
   * Persisted user resolutions for yearly ↔ monthly relationships.
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
  const active = records.filter(
    (r) => finiteNonNeg(r.amountNpr) > 0 || finiteNonNeg(r.monthlyBudgetNpr) > 0,
  );
  const monthly = active.filter((r) => r.period === "Monthly");
  const yearly = active.filter((r) => r.period === "Yearly");

  const grossMonthlyBudgetNpr = monthly.reduce((sum, r) => sum + monthlyEquivalentExact(r), 0);
  const yearlyBudgetTotalNpr = yearly.reduce((sum, r) => sum + finiteNonNeg(r.amountNpr), 0);
  const annualMonthlyEquivalentNpr = yearly.reduce((sum, r) => sum + monthlyEquivalentExact(r), 0);

  const roundedAnnualMonthlyEquivalentNpr = yearly.reduce(
    (sum, r) => sum + Math.round(finiteNonNeg(r.amountNpr) / 12),
    0,
  );

  const monthlyCategories = new Set(
    monthly
      .filter((r) => !isEmergencyFundContributionCategory(r.category))
      .map((r) => normalizeEmergencyFinanceCategory(r.category)),
  );
  const yearlyCategories = new Set(
    yearly.map((r) => normalizeEmergencyFinanceCategory(r.category)),
  );

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
  const userDecisionLines: EmergencyBudgetLine[] = [];

  for (const record of monthly) {
    if (isEmergencyFundContributionCategory(record.category)) {
      const line = buildLine(record, "emergency_contribution", {
        classificationSource: "automatic",
      });
      allLines.push(line);
      emergencyFundContributionExcludedNpr += line.monthlyEquivalentNpr;
      continue;
    }
    allLines.push(buildLine(record, "included", { classificationSource: "automatic" }));
  }

  for (const record of yearly) {
    const monthlyEq = monthlyEquivalentExact(record);

    if (isEmergencyFundContributionCategory(record.category)) {
      const line = buildLine(record, "emergency_contribution", {
        classificationSource: "automatic",
      });
      allLines.push(line);
      emergencyFundContributionExcludedNpr += monthlyEq;
      continue;
    }

    if (projectionDuplicate) {
      const line = buildLine(record, "projection_duplicate", {
        classificationSource: "automatic",
      });
      allLines.push(line);
      yearlyProjectionDuplicateNpr += monthlyEq;
      continue;
    }

    const { candidates, nearAmountMatchIds } = findSameCategoryMonthlyCandidates(
      record,
      monthlyByCategory,
    );
    const candidateIds = candidates.map((r) => r.id);
    const decision = decisions[record.id];

    // Explicit user decision only — never auto-exclude from category/amount heuristics.
    if (
      decision?.resolution === "already_included" ||
      decision?.resolution === "linked"
    ) {
      const linkedId =
        decision.resolution === "linked" && decision.linkedMonthlyRecordId
          ? decision.linkedMonthlyRecordId
          : nearAmountMatchIds[0] ?? candidateIds[0] ?? null;
      const line = buildLine(record, "already_included", {
        classificationSource: "user_decision",
        reviewCandidateMonthlyIds: candidateIds,
        nearAmountMatch: nearAmountMatchIds.length > 0,
      });
      // Preserve verified link id on the decision path (surfaced via candidates).
      if (linkedId && !line.reviewCandidateMonthlyIds?.includes(linkedId)) {
        line.reviewCandidateMonthlyIds = [linkedId, ...(line.reviewCandidateMonthlyIds ?? [])];
      }
      allLines.push(line);
      userDecisionLines.push(line);
      annualAllocationsAlreadyIncludedNpr += monthlyEq;
      continue;
    }

    // Default and explicit "separate": INCLUDE independent annual obligations.
    const needsReview =
      decision?.resolution !== "separate" &&
      (candidates.length > 0 || nearAmountMatchIds.length > 0);
    const line = buildLine(record, "included", {
      needsReview,
      reviewCandidateMonthlyIds: candidateIds,
      classificationSource:
        decision?.resolution === "separate" ? "user_decision" : "automatic",
      nearAmountMatch: nearAmountMatchIds.length > 0,
    });
    allLines.push(line);
    additionalAnnualMonthlyAllocationsNpr += monthlyEq;
    if (decision?.resolution === "separate") {
      userDecisionLines.push(line);
    }
    if (needsReview) provisionalLines.push(line);
  }

  const originalMonthlyBudgetNpr = grossMonthlyBudgetNpr;
  const totalNormalizedBudgetNpr =
    grossMonthlyBudgetNpr -
    emergencyFundContributionExcludedNpr +
    additionalAnnualMonthlyAllocationsNpr;

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
    userDecisionLines,
    lastBudgetUpdatedAt: latestUpdatedAt(active),
    currency: "NPR",
  };
}

export type ResolveProtectionBasisOptions = {
  essentialRecordIds?: readonly string[];
  excludedRecordIds?: readonly string[];
};

/**
 * Monthly protection basis for the selected mode.
 * Essential and Full Lifestyle both select from the same protection-eligible dataset.
 * Linked / already_included yearly lines are not eligible (counted via monthly side only).
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

/**
 * Previously selected essential ids that are no longer protection-eligible.
 * IDs are preserved in settings; this surfaces a warning instead of silent removal.
 */
export function findIneligibleEssentialSelections(
  breakdown: NormalizedBudgetBreakdown,
  essentialRecordIds: readonly string[],
): EmergencyBudgetLine[] {
  if (essentialRecordIds.length === 0) return [];
  const eligibleIds = new Set(
    (breakdown.protectionEligibleLines ?? breakdown.includedLines).map((l) => l.id),
  );
  const byId = new Map(breakdown.allLines.map((l) => [l.id, l]));
  const out: EmergencyBudgetLine[] = [];
  for (const id of essentialRecordIds) {
    if (eligibleIds.has(id)) continue;
    const line = byId.get(id);
    if (line) out.push(line);
  }
  return out;
}

/** Planned monthly Emergency Fund contribution implied by budget (never auto-posts reserve). */
export function plannedEmergencyContributionFromBudget(
  breakdown: NormalizedBudgetBreakdown,
): number {
  return breakdown.allLines
    .filter((line) => line.inclusion === "emergency_contribution")
    .reduce((sum, line) => sum + line.monthlyEquivalentNpr, 0);
}
