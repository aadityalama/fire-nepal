import type { LucideIcon } from "lucide-react";
import {
  Bus,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  ShieldAlert,
  ShoppingBag,
  Utensils,
  WalletCards,
  Zap,
} from "lucide-react";

/** Canonical category ids shared by Budget, Expense, Planned Payments, AI Insights, and Reports. */
export const FINANCE_CATEGORY_IDS = [
  "Food",
  "Rent",
  "Transport",
  "Health",
  "Shopping",
  "Entertainment",
  "Education",
  "Utilities",
  "Investment",
  "Emergency",
  "Other",
] as const;

export type FinanceCategoryId = (typeof FINANCE_CATEGORY_IDS)[number];

export type FinanceCategory = {
  id: FinanceCategoryId;
  label: FinanceCategoryId;
  emoji: string;
  icon: LucideIcon;
};

export const FINANCE_CATEGORIES: FinanceCategory[] = [
  { id: "Food", label: "Food", emoji: "🍔", icon: Utensils },
  { id: "Rent", label: "Rent", emoji: "🏠", icon: Home },
  { id: "Transport", label: "Transport", emoji: "🚌", icon: Bus },
  { id: "Health", label: "Health", emoji: "🩺", icon: HeartPulse },
  { id: "Shopping", label: "Shopping", emoji: "🛍️", icon: ShoppingBag },
  { id: "Entertainment", label: "Entertainment", emoji: "🎮", icon: Gamepad2 },
  { id: "Education", label: "Education", emoji: "🎓", icon: GraduationCap },
  { id: "Utilities", label: "Utilities", emoji: "⚡", icon: Zap },
  { id: "Investment", label: "Investment", emoji: "📈", icon: Landmark },
  { id: "Emergency", label: "Emergency", emoji: "🛡️", icon: ShieldAlert },
  { id: "Other", label: "Other", emoji: "💼", icon: WalletCards },
];

export const DEFAULT_FINANCE_CATEGORY_ID: FinanceCategoryId = "Food";

const FINANCE_CATEGORY_BY_ID = Object.fromEntries(FINANCE_CATEGORIES.map((category) => [category.id, category])) as Record<
  FinanceCategoryId,
  FinanceCategory
>;

/** Maps legacy expense category labels to the unified finance category ids. */
const LEGACY_CATEGORY_ALIASES: Record<string, FinanceCategoryId> = {
  "Food/Mart": "Food",
  Mart: "Food",
  Food: "Food",
  Rent: "Rent",
  Transport: "Transport",
  Transportation: "Transport",
  Health: "Health",
  Shopping: "Shopping",
  Entertainment: "Entertainment",
  Education: "Education",
  Utilities: "Utilities",
  Utility: "Utilities",
  Electricity: "Utilities",
  Internet: "Utilities",
  Investment: "Investment",
  Investments: "Investment",
  Emergency: "Emergency",
  Remittance: "Other",
  Other: "Other",
};

export function normalizeFinanceCategory(category: string): FinanceCategoryId {
  const trimmed = category.trim();
  if ((FINANCE_CATEGORY_IDS as readonly string[]).includes(trimmed)) {
    return trimmed as FinanceCategoryId;
  }
  return LEGACY_CATEGORY_ALIASES[trimmed] ?? "Other";
}

export function getFinanceCategoryMeta(category: string): FinanceCategory {
  return FINANCE_CATEGORY_BY_ID[normalizeFinanceCategory(category)];
}

export function getFinanceCategoryEmoji(category: string): string {
  return getFinanceCategoryMeta(category).emoji;
}

export function getFinanceCategoryLabel(category: string): FinanceCategoryId {
  return normalizeFinanceCategory(category);
}

export function isInvestmentCategory(category: string): boolean {
  return normalizeFinanceCategory(category) === "Investment";
}

export function isLivingExpenseCategory(category: string): boolean {
  return !isInvestmentCategory(category);
}
