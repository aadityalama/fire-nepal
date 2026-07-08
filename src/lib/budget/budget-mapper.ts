import {
  BUDGET_NOTIFICATION_OPTIONS,
  defaultBudgetNotificationSettings,
  type BudgetAiRecommendation,
  type BudgetNotificationSettings,
  type BudgetPeriod,
  type BudgetRecord,
  type CreateBudgetInput,
} from "@/lib/budget/types";
import type { Database } from "@/types/supabase-database";

type BudgetRow = Database["public"]["Tables"]["finance_budget_records"]["Row"];

function sanitizeNotificationSettings(raw: unknown): BudgetNotificationSettings {
  const defaults = defaultBudgetNotificationSettings();
  if (!raw || typeof raw !== "object") return defaults;
  const source = raw as Record<string, unknown>;
  const out = { ...defaults };
  for (const key of BUDGET_NOTIFICATION_OPTIONS) {
    if (typeof source[key] === "boolean") out[key] = source[key];
  }
  return out;
}

function sanitizeAiRecommendation(raw: unknown): BudgetAiRecommendation | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Partial<BudgetAiRecommendation>;
  if (typeof source.title !== "string" || typeof source.message !== "string") return null;
  return {
    title: source.title,
    message: source.message,
    available: Boolean(source.available),
    recommendedMonthlyNpr:
      typeof source.recommendedMonthlyNpr === "number" ? source.recommendedMonthlyNpr : null,
    potentialSavingsNpr: typeof source.potentialSavingsNpr === "number" ? source.potentialSavingsNpr : null,
    confidence: typeof source.confidence === "number" ? source.confidence : null,
  };
}

export function mapBudgetRow(row: BudgetRow): BudgetRecord {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    category: row.category,
    period: row.period as BudgetPeriod,
    amountNpr: Number(row.amount_npr),
    monthlyBudgetNpr: Number(row.monthly_budget_npr),
    monthlySpentNpr: Number(row.monthly_spent_npr),
    daysRemaining: row.days_remaining,
    gradient: row.gradient,
    notificationSettings: sanitizeNotificationSettings(row.notification_settings),
    aiRecommendation: sanitizeAiRecommendation(row.ai_recommendation),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildBudgetInsertPayload(
  userId: string,
  input: CreateBudgetInput,
  sortOrder: number,
) {
  const monthlyBudgetNpr = input.period === "Yearly" ? Math.round(input.amountNpr / 12) : Math.round(input.amountNpr);
  const now = new Date().toISOString();

  return {
    user_id: userId,
    name: input.name.trim() || input.category,
    category: input.category,
    icon: input.icon,
    gradient: input.gradient,
    period: input.period,
    amount_npr: input.amountNpr,
    monthly_budget_npr: monthlyBudgetNpr,
    monthly_spent_npr: 0,
    days_remaining: input.period === "Yearly" ? 365 : 30,
    notification_settings: input.notificationSettings,
    ai_recommendation: input.aiRecommendation,
    sort_order: sortOrder,
    updated_at: now,
  } satisfies Database["public"]["Tables"]["finance_budget_records"]["Insert"];
}
