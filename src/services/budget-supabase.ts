import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBudgetInsertPayload, mapBudgetRow } from "@/lib/budget/budget-mapper";
import { daysRemainingForPeriod, sortBudgetRecords, type BudgetRecord, type CreateBudgetInput } from "@/lib/budget/types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

const BUDGET_COLUMNS =
  "id,user_id,name,category,icon,gradient,period,amount_npr,monthly_budget_npr,monthly_spent_npr,days_remaining,notification_settings,ai_recommendation,sort_order,created_at,updated_at" as const;

function mapBudgetError(error: { message?: string; code?: string } | null | undefined, fallback: string) {
  const message = error?.message ?? fallback;
  const lower = message.toLowerCase();

  if (
    lower.includes("finance_budget_records") &&
    (lower.includes("does not exist") || lower.includes("schema cache") || error?.code === "42P01" || error?.code === "PGRST205")
  ) {
    return "Budget storage is being set up. Please try again in a minute or contact support if this continues.";
  }
  if (lower.includes("permission denied") || error?.code === "42501") {
    return "You do not have permission to save this budget.";
  }
  if (lower.includes("invalid input") || lower.includes("violates check constraint")) {
    return "Please check your budget amount and try again.";
  }
  if (lower.includes("jwt") || lower.includes("not authenticated")) {
    return "Please sign in again to save your budget.";
  }

  return message || fallback;
}

export async function listBudgetRecordsForUser(client: Client, userId: string): Promise<BudgetRecord[]> {
  const { data, error } = await client
    .from("finance_budget_records")
    .select(BUDGET_COLUMNS)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(mapBudgetError(error, "Could not load budgets."));
  }

  return sortBudgetRecords((data ?? []).map(mapBudgetRow));
}

export async function createBudgetRecordForUser(
  client: Client,
  userId: string,
  input: CreateBudgetInput,
): Promise<BudgetRecord> {
  const { count, error: countError } = await client
    .from("finance_budget_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw new Error(mapBudgetError(countError, "Could not prepare budget save."));
  }

  const sortOrder = count ?? 0;
  const payload = buildBudgetInsertPayload(userId, input, sortOrder);
  payload.days_remaining = daysRemainingForPeriod(input.period);

  const { data, error } = await client.from("finance_budget_records").insert(payload).select(BUDGET_COLUMNS).single();

  if (error || !data) {
    throw new Error(mapBudgetError(error, "Could not save budget."));
  }

  return mapBudgetRow(data);
}

export async function updateBudgetRecordForUser(
  client: Client,
  userId: string,
  budgetId: string,
  input: CreateBudgetInput,
): Promise<BudgetRecord> {
  const monthlyBudgetNpr = input.period === "Yearly" ? Math.round(input.amountNpr / 12) : Math.round(input.amountNpr);

  const { data, error } = await client
    .from("finance_budget_records")
    .update({
      name: input.name.trim() || input.category,
      category: input.category,
      icon: input.icon,
      gradient: input.gradient,
      period: input.period,
      amount_npr: input.amountNpr,
      monthly_budget_npr: monthlyBudgetNpr,
      days_remaining: daysRemainingForPeriod(input.period),
      notification_settings: input.notificationSettings,
      ai_recommendation: input.aiRecommendation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", budgetId)
    .eq("user_id", userId)
    .select(BUDGET_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(mapBudgetError(error, "Could not update budget."));
  }
  if (!data) {
    throw new Error("Budget not found.");
  }

  return mapBudgetRow(data);
}

export async function deleteBudgetRecordForUser(client: Client, userId: string, budgetId: string): Promise<void> {
  const { error, count } = await client
    .from("finance_budget_records")
    .delete({ count: "exact" })
    .eq("id", budgetId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(mapBudgetError(error, "Could not delete budget."));
  }
  if (!count) {
    throw new Error("Budget not found.");
  }
}
