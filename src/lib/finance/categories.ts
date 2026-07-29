import type { LucideIcon } from "lucide-react";
import {
  Bus,
  CreditCard,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  PiggyBank,
  Plane,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Utensils,
  WalletCards,
  Zap,
} from "lucide-react";

/**
 * Canonical category ids shared by Budget, Expense, Planned Payments, AI Insights, and Reports.
 * Existing production ids are preserved; new ids are additive.
 */
export const FINANCE_CATEGORY_IDS = [
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

export type FinanceCategoryId = (typeof FINANCE_CATEGORY_IDS)[number];

export type FinanceCategoryGroupId = "financial-priorities" | "essential-living" | "growth-lifestyle";

export type FinanceCategory = {
  id: FinanceCategoryId;
  label: string;
  emoji: string;
  helper: string;
  icon: LucideIcon;
  groupId: FinanceCategoryGroupId;
};

export type FinanceCategoryGroup = {
  id: FinanceCategoryGroupId;
  label: string;
  emoji: string;
  subtitle: string;
  sheetSubtitle: string;
  categoryIds: readonly FinanceCategoryId[];
};

export const FINANCE_CATEGORY_GROUPS: FinanceCategoryGroup[] = [
  {
    id: "financial-priorities",
    label: "Financial Priorities",
    emoji: "🎯",
    subtitle: "Build your financial foundation",
    sheetSubtitle: "Build your financial future.",
    categoryIds: ["Emergency", "Debt", "Insurance", "Investment", "Savings"],
  },
  {
    id: "essential-living",
    label: "Essential Living",
    emoji: "🏡",
    subtitle: "Manage your essential monthly expenses",
    sheetSubtitle: "Cover the basics that keep life running.",
    categoryIds: ["Rent", "Food", "Utilities", "Transport", "Health"],
  },
  {
    id: "growth-lifestyle",
    label: "Growth & Lifestyle",
    emoji: "🚀",
    subtitle: "Invest in yourself and enjoy life responsibly",
    sheetSubtitle: "Grow skills, experiences, and joy with intention.",
    categoryIds: ["Education", "Travel", "Shopping", "Entertainment", "Gifts", "Other"],
  },
];

export const FINANCE_CATEGORIES: FinanceCategory[] = [
  { id: "Emergency", label: "Emergency Funds", emoji: "🛡️", helper: "Unexpected expenses", icon: ShieldAlert, groupId: "financial-priorities" },
  { id: "Debt", label: "Debt Repayment", emoji: "💳", helper: "Pay off loans and liabilities", icon: CreditCard, groupId: "financial-priorities" },
  { id: "Insurance", label: "Insurance", emoji: "🛡️", helper: "Financial protection", icon: Shield, groupId: "financial-priorities" },
  { id: "Investment", label: "Investment", emoji: "📈", helper: "Grow your wealth", icon: Landmark, groupId: "financial-priorities" },
  { id: "Savings", label: "Savings", emoji: "💰", helper: "Future goals", icon: PiggyBank, groupId: "financial-priorities" },
  { id: "Rent", label: "Housing (Rent/Home Loan)", emoji: "🏠", helper: "Rent or home loan payments", icon: Home, groupId: "essential-living" },
  { id: "Food", label: "Food", emoji: "🍔", helper: "Groceries and meals", icon: Utensils, groupId: "essential-living" },
  { id: "Utilities", label: "Utilities", emoji: "⚡", helper: "Electricity, water, internet", icon: Zap, groupId: "essential-living" },
  { id: "Transport", label: "Transport", emoji: "🚌", helper: "Commute and travel costs", icon: Bus, groupId: "essential-living" },
  { id: "Health", label: "Healthcare", emoji: "🩺", helper: "Medical and wellness", icon: HeartPulse, groupId: "essential-living" },
  { id: "Education", label: "Education & Skill Development", emoji: "🎓", helper: "Skills and learning", icon: GraduationCap, groupId: "growth-lifestyle" },
  { id: "Travel", label: "Travel", emoji: "✈️", helper: "Trips and experiences", icon: Plane, groupId: "growth-lifestyle" },
  { id: "Shopping", label: "Shopping", emoji: "🛍️", helper: "Personal purchases", icon: ShoppingBag, groupId: "growth-lifestyle" },
  { id: "Entertainment", label: "Entertainment", emoji: "🎮", helper: "Fun and leisure", icon: Gamepad2, groupId: "growth-lifestyle" },
  { id: "Gifts", label: "Gifts & Donations", emoji: "🎁", helper: "Giving and celebrations", icon: Gift, groupId: "growth-lifestyle" },
  { id: "Other", label: "Other", emoji: "💼", helper: "Everything else", icon: WalletCards, groupId: "growth-lifestyle" },
];

export const DEFAULT_FINANCE_CATEGORY_ID: FinanceCategoryId = "Food";

const FINANCE_CATEGORY_BY_ID = Object.fromEntries(FINANCE_CATEGORIES.map((category) => [category.id, category])) as Record<
  FinanceCategoryId,
  FinanceCategory
>;

/** Maps legacy / alternate labels onto canonical finance category ids. */
const LEGACY_CATEGORY_ALIASES: Record<string, FinanceCategoryId> = {
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

export function getFinanceCategoryLabel(category: string): string {
  return getFinanceCategoryMeta(category).label;
}

export function getFinanceCategoryGroup(category: string): FinanceCategoryGroup {
  const meta = getFinanceCategoryMeta(category);
  return FINANCE_CATEGORY_GROUPS.find((group) => group.id === meta.groupId) ?? FINANCE_CATEGORY_GROUPS[2]!;
}

export function getFinanceCategoriesForGroup(groupId: FinanceCategoryGroupId): FinanceCategory[] {
  const group = FINANCE_CATEGORY_GROUPS.find((item) => item.id === groupId);
  if (!group) return [];
  return group.categoryIds.map((id) => FINANCE_CATEGORY_BY_ID[id]);
}

export function isInvestmentCategory(category: string): boolean {
  return normalizeFinanceCategory(category) === "Investment";
}

export function isLivingExpenseCategory(category: string): boolean {
  return !isInvestmentCategory(category);
}
