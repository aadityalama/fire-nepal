/**
 * Lightweight finance category normalization for Emergency Fund engine tests
 * (avoids importing lucide-backed FINANCE_CATEGORIES).
 */

import type { FinanceCategoryId } from "@/lib/finance/categories";

const CANONICAL = new Set<string>([
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
]);

const ALIASES: Record<string, FinanceCategoryId> = {
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
  Family: "Other",
  "Family Support": "Other",
};

export function normalizeEmergencyCategory(category: string): FinanceCategoryId {
  const trimmed = category.trim();
  if (CANONICAL.has(trimmed)) return trimmed as FinanceCategoryId;
  return ALIASES[trimmed] ?? "Other";
}
