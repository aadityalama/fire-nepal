/**
 * Normalize Monthly + Yearly Budget Planner records into an Emergency Fund basis.
 *
 * Audit notes (FIRE Nepal Budget Planner):
 * - Monthly and Yearly records are independent rows in `finance_budget_records`.
 * - The Monthly dashboard total does NOT automatically include Yearly monthly equivalents.
 * - Yearly rows already store `monthlyBudgetNpr = amountNpr / 12`.
 * - There are no source-link IDs between monthly and yearly rows; relationships are inferred
 *   carefully using category + amount relationships, never name-only matching.
 */

import type { BudgetRecord } from "@/lib/budget/types";
import {
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
} from "@/lib/emergency-fund/types";

/** Categories suggested as essential during an emergency (user can override). */
export const SUGGESTED_ESSENTIAL_CATEGORIES = SUGGESTED_ESSENTIAL_CATEGORY_IDS;

function monthlyEquivalent(record: BudgetRecord): number {
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
  // Require meaningful category overlap when both sides have categories.
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
  const yearlyMonthly = monthlyEquivalent(yearly);
  for (const monthly of candidates) {
    const monthlyAmt = monthlyEquivalent(monthly);
    if (approxEqual(monthlyAmt, yearlyMonthly, 1)) return monthly;
  }
  return null;
}

/**
 * Build the transparent normalized budget breakdown used by Emergency Fund.
 */
export function normalizeBudgetForEmergencyFund(
  records: readonly BudgetRecord[],
): NormalizedBudgetBreakdown {
  const active = records.filter((r) => finiteNonNeg(r.amountNpr) > 0 || finiteNonNeg(r.monthlyBudgetNpr) > 0);
  const monthly = active.filter((r) => r.period === "Monthly");
  const yearly = active.filter((r) => r.period === "Yearly");

  const originalMonthlyBudgetNpr = monthly.reduce((sum, r) => sum + monthlyEquivalent(r), 0);
  const yearlyBudgetTotalNpr = yearly.reduce((sum, r) => sum + finiteNonNeg(r.amountNpr), 0);
  const annualMonthlyEquivalentNpr = yearly.reduce((sum, r) => sum + monthlyEquivalent(r), 0);

  const monthlyCategories = new Set(monthly.map((r) => normalizeEmergencyFinanceCategory(r.category)));
  const yearlyCategories = new Set(yearly.map((r) => normalizeEmergencyFinanceCategory(r.category)));

  const projectionDuplicate = isYearlyProjectionOfMonthly(
    originalMonthlyBudgetNpr,
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

  for (const record of monthly) {
    allLines.push({
      id: record.id,
      name: record.name,
      category: record.category,
      period: "Monthly",
      originalAmountNpr: finiteNonNeg(record.amountNpr),
      monthlyEquivalentNpr: monthlyEquivalent(record),
      inclusion: "included",
      source: "monthly_budget",
      suggestedEssential: isSuggestedEssential(record.category),
    });
  }

  let annualAllocationsAlreadyIncludedNpr = 0;
  let yearlyProjectionDuplicateNpr = 0;
  let additionalAnnualMonthlyAllocationsNpr = 0;
  const ambiguousLines: EmergencyBudgetLine[] = [];

  for (const record of yearly) {
    const monthlyEq = monthlyEquivalent(record);
    const base: Omit<EmergencyBudgetLine, "inclusion"> = {
      id: record.id,
      name: record.name,
      category: record.category,
      period: "Yearly",
      originalAmountNpr: finiteNonNeg(record.amountNpr),
      monthlyEquivalentNpr: monthlyEq,
      source: "yearly_budget",
      suggestedEssential: isSuggestedEssential(record.category),
    };

    if (projectionDuplicate) {
      const line: EmergencyBudgetLine = { ...base, inclusion: "projection_duplicate" };
      allLines.push(line);
      yearlyProjectionDuplicateNpr += monthlyEq;
      continue;
    }

    const match = findMatchingMonthlyAllocation(record, monthlyByCategory);
    if (match) {
      const line: EmergencyBudgetLine = { ...base, inclusion: "already_included" };
      allLines.push(line);
      annualAllocationsAlreadyIncludedNpr += monthlyEq;
      continue;
    }

    // Same category exists monthly but amounts don't match ≈ yearly/12 → ambiguous.
    const category = normalizeEmergencyFinanceCategory(record.category);
    const sameCategoryMonthly = monthlyByCategory.get(category) ?? [];
    if (sameCategoryMonthly.length > 0) {
      const line: EmergencyBudgetLine = { ...base, inclusion: "ambiguous" };
      allLines.push(line);
      ambiguousLines.push(line);
      // Do not silently add or exclude — exclude from effective total and flag.
      continue;
    }

    const line: EmergencyBudgetLine = { ...base, inclusion: "included" };
    allLines.push(line);
    additionalAnnualMonthlyAllocationsNpr += monthlyEq;
  }

  const effectiveMonthlyBudgetNpr = originalMonthlyBudgetNpr + additionalAnnualMonthlyAllocationsNpr;
  const includedLines = allLines.filter((line) => line.inclusion === "included");
  const hasBudgetData = monthly.length > 0 || yearly.length > 0;
  const isPartialBudget = hasBudgetData && monthly.length === 0 && yearly.length > 0;

  return {
    hasBudgetData,
    isPartialBudget,
    originalMonthlyBudgetNpr,
    yearlyBudgetTotalNpr,
    annualMonthlyEquivalentNpr,
    annualAllocationsAlreadyIncludedNpr,
    yearlyProjectionDuplicateNpr,
    additionalAnnualMonthlyAllocationsNpr,
    effectiveMonthlyBudgetNpr,
    includedLines,
    allLines,
    ambiguousLines,
    lastBudgetUpdatedAt: latestUpdatedAt(active),
    currency: "NPR",
  };
}

/**
 * Monthly protection basis for the selected mode.
 * Essential mode sums user-selected record ids; unknown ids are ignored.
 * Unclassified categories are never auto-excluded without explicit selection.
 */
export function resolveMonthlyProtectionBasis(
  breakdown: NormalizedBudgetBreakdown,
  mode: ProtectionMode,
  essentialRecordIds: readonly string[],
): {
  monthlyProtectionBasisNpr: number;
  essentialSelectedBudgetNpr: number;
  excludedBudgetNpr: number;
  selectedLines: EmergencyBudgetLine[];
  excludedLines: EmergencyBudgetLine[];
} {
  const selectable = breakdown.allLines.filter(
    (line) => line.inclusion === "included" || line.inclusion === "ambiguous",
  );

  if (mode === "full_lifestyle") {
    const selectedLines = selectable.filter((line) => line.inclusion === "included");
    const total = selectedLines.reduce((sum, line) => sum + line.monthlyEquivalentNpr, 0);
    return {
      monthlyProtectionBasisNpr: total,
      essentialSelectedBudgetNpr: total,
      excludedBudgetNpr: 0,
      selectedLines,
      excludedLines: [],
    };
  }

  const selected = new Set(essentialRecordIds);
  const selectedLines = selectable.filter((line) => selected.has(line.id));
  const excludedLines = selectable.filter((line) => !selected.has(line.id));
  const essentialSelectedBudgetNpr = selectedLines.reduce(
    (sum, line) => sum + line.monthlyEquivalentNpr,
    0,
  );
  const excludedBudgetNpr = excludedLines.reduce((sum, line) => sum + line.monthlyEquivalentNpr, 0);

  return {
    monthlyProtectionBasisNpr: essentialSelectedBudgetNpr,
    essentialSelectedBudgetNpr,
    excludedBudgetNpr,
    selectedLines,
    excludedLines,
  };
}

/** Default essential selection: suggested essential categories among included lines. */
export function defaultEssentialRecordIds(breakdown: NormalizedBudgetBreakdown): string[] {
  return breakdown.allLines
    .filter((line) => line.inclusion === "included" && line.suggestedEssential)
    .map((line) => line.id);
}
