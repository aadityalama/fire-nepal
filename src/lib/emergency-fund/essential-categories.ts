import {
  ESSENTIAL_FINANCE_CATEGORY_IDS,
  type EssentialFinanceCategoryId,
} from "@/lib/emergency-fund/types";
import { normalizeEmergencyCategory } from "@/lib/emergency-fund/category-normalize";
import type { FinanceCategoryId } from "@/lib/finance/categories";
import type { ExpenseCategoryKey } from "@/components/cashflow/types";

/** Cashflow category keys that map to essential / mandatory outflows. */
export const ESSENTIAL_CASHFLOW_KEYS: readonly ExpenseCategoryKey[] = [
  "rent",
  "food",
  "transportation",
  "familySupport",
  "emiLoans",
  "insurance",
] as const;

const ESSENTIAL_SET = new Set<string>(ESSENTIAL_FINANCE_CATEGORY_IDS);

export function isEssentialFinanceCategory(
  category: string,
  extraIncluded: readonly FinanceCategoryId[] = [],
): boolean {
  const id = normalizeEmergencyCategory(category);
  if (ESSENTIAL_SET.has(id)) return true;
  return extraIncluded.includes(id);
}

export function essentialCategoryIds(
  extraIncluded: readonly FinanceCategoryId[] = [],
): EssentialFinanceCategoryId[] {
  const base = [...ESSENTIAL_FINANCE_CATEGORY_IDS];
  for (const id of extraIncluded) {
    if (!base.includes(id as EssentialFinanceCategoryId) && ESSENTIAL_SET.has(id) === false) {
      // Discretionary opt-ins stay as FinanceCategoryId — callers use isEssentialFinanceCategory.
    }
  }
  return base;
}

/** Map cashflow expense key → finance category for classification display. */
export function cashflowKeyToFinanceCategory(key: ExpenseCategoryKey): FinanceCategoryId {
  switch (key) {
    case "rent":
      return "Rent";
    case "food":
      return "Food";
    case "transportation":
      return "Transport";
    case "familySupport":
      return "Other";
    case "emiLoans":
      return "Debt";
    case "insurance":
      return "Insurance";
    case "entertainment":
      return "Entertainment";
    default:
      return "Other";
  }
}
