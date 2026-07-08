export type BudgetPeriod = "Monthly" | "Yearly";

export const BUDGET_NOTIFICATION_OPTIONS = [
  "50% used",
  "75% used",
  "90% used",
  "100% used",
  "Overspend Alert",
] as const;

export type BudgetNotificationOption = (typeof BUDGET_NOTIFICATION_OPTIONS)[number];

export type BudgetNotificationSettings = Record<BudgetNotificationOption, boolean>;

export type BudgetAiRecommendation = {
  title: string;
  message: string;
  available: boolean;
  recommendedMonthlyNpr?: number | null;
  potentialSavingsNpr?: number | null;
  confidence?: number | null;
};

export type BudgetRecord = {
  id: string;
  name: string;
  icon: string;
  category: string;
  period: BudgetPeriod;
  amountNpr: number;
  monthlyBudgetNpr: number;
  monthlySpentNpr: number;
  daysRemaining: number;
  gradient: string;
  notificationSettings: BudgetNotificationSettings;
  aiRecommendation: BudgetAiRecommendation | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateBudgetInput = {
  name: string;
  category: string;
  icon: string;
  gradient: string;
  period: BudgetPeriod;
  amountNpr: number;
  notificationSettings: BudgetNotificationSettings;
  aiRecommendation: BudgetAiRecommendation | null;
};

export function defaultBudgetNotificationSettings(): BudgetNotificationSettings {
  return {
    "50% used": true,
    "75% used": true,
    "90% used": true,
    "100% used": true,
    "Overspend Alert": true,
  };
}

export function daysRemainingForPeriod(period: BudgetPeriod, now = new Date()) {
  if (period === "Yearly") {
    const end = new Date(now.getFullYear(), 11, 31);
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, daysInMonth - now.getDate());
}

export function monthlyBudgetFromAmount(amountNpr: number, period: BudgetPeriod) {
  return period === "Yearly" ? Math.round(amountNpr / 12) : Math.round(amountNpr);
}

export function sortBudgetRecords(records: BudgetRecord[]) {
  return [...records].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    if (a.createdAt !== b.createdAt) return a.createdAt.localeCompare(b.createdAt);
    return a.name.localeCompare(b.name);
  });
}
