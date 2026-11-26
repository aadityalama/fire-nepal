/**
 * Lightweight finance category helpers for Emergency Fund (no UI icon deps).
 * Mirrors `normalizeFinanceCategory` / essential group membership from finance/categories.
 */

const FINANCE_CATEGORY_IDS = [
  "Emergency",
  "Debt",
  "Insurance",
  "Investment",
  "Savings",
  "Rent",
  "Food",
  "Utilities",
  "Transport",
  "Health",
  "Education",
  "Travel",
  "Shopping",
  "Entertainment",
  "Gifts",
  "Other",
] as const;

export type EmergencyFinanceCategoryId = (typeof FINANCE_CATEGORY_IDS)[number];

const LEGACY_CATEGORY_ALIASES: Record<string, EmergencyFinanceCategoryId> = {
  "Food/Mart": "Food",
  Mart: "Food",
  Food: "Food",
  Rent: "Rent",
  Housing: "Rent",
  "Housing (Rent/Home Loan)": "Rent",
  "Home Loan": "Rent",
  Transport: "Transport",
  Transportation: "Transport",
  Health: "Health",
  Healthcare: "Health",
  Shopping: "Shopping",
  Entertainment: "Entertainment",
  Education: "Education",
  "Education & Skill Development": "Education",
  Utilities: "Utilities",
  Utility: "Utilities",
  Electricity: "Utilities",
  Internet: "Utilities",
  Investment: "Investment",
  Investments: "Investment",
  Emergency: "Emergency",
  "Emergency Funds": "Emergency",
  "Emergency Fund": "Emergency",
  Debt: "Debt",
  "Debt Repayment": "Debt",
  Insurance: "Insurance",
  Savings: "Savings",
  Saving: "Savings",
  Travel: "Travel",
  Trip: "Travel",
  Gifts: "Gifts",
  Gift: "Gifts",
  Donation: "Gifts",
  Donations: "Gifts",
  "Gifts & Donations": "Gifts",
  Remittance: "Other",
  Other: "Other",
};

export const SUGGESTED_ESSENTIAL_CATEGORY_IDS: ReadonlySet<EmergencyFinanceCategoryId> = new Set([
  "Rent",
  "Food",
  "Utilities",
  "Transport",
  "Health",
  "Debt",
  "Insurance",
]);

export function normalizeEmergencyFinanceCategory(category: string): EmergencyFinanceCategoryId {
  const trimmed = category.trim();
  if ((FINANCE_CATEGORY_IDS as readonly string[]).includes(trimmed)) {
    return trimmed as EmergencyFinanceCategoryId;
  }
  return LEGACY_CATEGORY_ALIASES[trimmed] ?? "Other";
}

export function isSuggestedEssentialCategory(category: string): boolean {
  return SUGGESTED_ESSENTIAL_CATEGORY_IDS.has(normalizeEmergencyFinanceCategory(category));
}

/**
 * Planned Emergency Fund contributions are transfers into the reserve,
 * not living expenses that the reserve must cover.
 */
export function isEmergencyFundContributionCategory(category: string): boolean {
  return normalizeEmergencyFinanceCategory(category) === "Emergency";
}
