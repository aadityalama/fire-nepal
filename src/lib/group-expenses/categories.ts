import type { LucideIcon } from "lucide-react";
import {
  Bus,
  Droplets,
  Flame,
  Home,
  ShoppingCart,
  Sparkles,
  Utensils,
  Wifi,
  Zap,
  ChefHat,
  Users,
  WalletCards,
} from "lucide-react";

/** Categories supported by the Group Expenses workspace — isolated from personal finance. */
export const GROUP_EXPENSE_CATEGORY_IDS = [
  "Rent",
  "Electricity",
  "Water",
  "Gas",
  "Internet",
  "Grocery",
  "Kitchen",
  "Cleaning",
  "Shared Transport",
  "Group Food",
  "Other",
] as const;

export type GroupExpenseCategoryId = (typeof GROUP_EXPENSE_CATEGORY_IDS)[number];

export type GroupExpenseCategory = {
  id: GroupExpenseCategoryId;
  label: GroupExpenseCategoryId;
  emoji: string;
  icon: LucideIcon;
};

export const GROUP_EXPENSE_CATEGORIES: GroupExpenseCategory[] = [
  { id: "Rent", label: "Rent", emoji: "🏠", icon: Home },
  { id: "Electricity", label: "Electricity", emoji: "⚡", icon: Zap },
  { id: "Water", label: "Water", emoji: "💧", icon: Droplets },
  { id: "Gas", label: "Gas", emoji: "🔥", icon: Flame },
  { id: "Internet", label: "Internet", emoji: "📶", icon: Wifi },
  { id: "Grocery", label: "Grocery", emoji: "🛒", icon: ShoppingCart },
  { id: "Kitchen", label: "Kitchen", emoji: "🍳", icon: ChefHat },
  { id: "Cleaning", label: "Cleaning", emoji: "✨", icon: Sparkles },
  { id: "Shared Transport", label: "Shared Transport", emoji: "🚌", icon: Bus },
  { id: "Group Food", label: "Group Food", emoji: "🍽️", icon: Utensils },
  { id: "Other", label: "Other", emoji: "💼", icon: WalletCards },
];

export const DEFAULT_GROUP_EXPENSE_CATEGORY_ID: GroupExpenseCategoryId = "Grocery";

const CATEGORY_BY_ID = Object.fromEntries(
  GROUP_EXPENSE_CATEGORIES.map((category) => [category.id, category]),
) as Record<GroupExpenseCategoryId, GroupExpenseCategory>;

const LEGACY_ALIASES: Record<string, GroupExpenseCategoryId> = {
  Rent: "Rent",
  Electricity: "Electricity",
  Water: "Water",
  Gas: "Gas",
  Internet: "Internet",
  Grocery: "Grocery",
  Kitchen: "Kitchen",
  Cleaning: "Cleaning",
  "Shared Transport": "Shared Transport",
  Transport: "Shared Transport",
  "Group Food": "Group Food",
  Food: "Group Food",
  "Food/Mart": "Grocery",
  Mart: "Grocery",
  Utilities: "Electricity",
  Utility: "Electricity",
  Other: "Other",
};

export function normalizeGroupCategory(category: string): GroupExpenseCategoryId {
  const trimmed = category.trim();
  if ((GROUP_EXPENSE_CATEGORY_IDS as readonly string[]).includes(trimmed)) {
    return trimmed as GroupExpenseCategoryId;
  }
  return LEGACY_ALIASES[trimmed] ?? DEFAULT_GROUP_EXPENSE_CATEGORY_ID;
}

export function getGroupCategoryLabel(category: string): string {
  const id = normalizeGroupCategory(category);
  return CATEGORY_BY_ID[id]?.label ?? id;
}
