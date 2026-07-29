import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBudgetInsertPayload, mapBudgetRow } from "@/lib/budget/budget-mapper";
import { daysRemainingForPeriod, sortBudgetRecords, type BudgetRecord, type CreateBudgetInput } from "@/lib/budget/types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

const BUDGET_COLUMNS =
  "id,user_id,name,category,icon,gradient,period,amount_npr,monthly_budget_npr,monthly_spent_npr,days_remaining,notification_settings,ai_recommendation,sort_order,deleted_at,created_at,updated_at" as const;
const LEGACY_BUDGET_COLUMNS =
  "id,user_id,name,category,icon,gradient,period,amount_npr,monthly_budget_npr,monthly_spent_npr,days_remaining,notification_settings,ai_recommendation,sort_order,created_at,updated_at" as const;

function missingDeletedAtColumn(error: { message?: string; code?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || error?.code === "PGRST204" || message.includes("deleted_at");
}

function mapBudgetError(error: { message?: string; code?: string } | null | undefined, fallback: string): string {
  if (!error) return fallback;

  const message = error.message ?? fallback;
  const lower = message.toLowerCase();
  const code = error.code ?? "";

  // Table missing
  if (
    lower.includes("finance_budget_records") &&
    (lower.includes("does not exist") || lower.includes("schema cache") || code === "42P01" || code === "PGRST205")
  ) {
    return `Missing table: finance_budget_records does not exist in production. Run the budget migration SQL. (code: ${code || "PGRST205"})`;
  }

  // Column missing
  if (code === "42703" || code === "PGRST204" || lower.includes("column") && lower.includes("does not exist")) {
    return `Column does not exist: ${message} (code: ${code})`;
  }

  // RLS / permission denied
  if (lower.includes("permission denied") || code === "42501" || lower.includes("new row violates row-level security")) {
    return `RLS blocked: ${message} (code: ${code || "42501"})`;
  }

  // Foreign key failure
  if (lower.includes("foreign key") || lower.includes("violates foreign key constraint") || code === "23503") {
    return `Foreign key failed: ${message} (code: ${code || "23503"})`;
  }

  // Unique constraint
  if (lower.includes("unique") || lower.includes("duplicate") || code === "23505") {
    return `Duplicate record: ${message} (code: ${code || "23505"})`;
  }

  // Check constraint
  if (lower.includes("violates check constraint") || code === "23514") {
    return `Check constraint failed: ${message} (code: ${code || "23514"})`;
  }

  // Auth / JWT
  if (lower.includes("jwt") || lower.includes("not authenticated") || code === "PGRST301") {
    return `Authentication required: ${message} (code: ${code || "PGRST301"})`;
  }

  // Missing workspace
  if (lower.includes("workspace") && lower.includes("not found")) {
    return `Missing workspace: ${message}`;
  }

  // Return the actual DB error message with code for all other cases
  return message ? `${message}${code ? ` (code: ${code})` : ""}` : fallback;
}

export async function listBudgetRecordsForUser(client: Client, userId: string): Promise<BudgetRecord[]> {
  const result = await client
    .from("finance_budget_records")
    .select(BUDGET_COLUMNS)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (missingDeletedAtColumn(result.error)) {
    const legacyResult = await client
      .from("finance_budget_records")
      .select(LEGACY_BUDGET_COLUMNS)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("name", { ascending: true });
    if (legacyResult.error) {
      throw new Error(mapBudgetError(legacyResult.error, "Could not load budgets."));
    }
    return sortBudgetRecords((legacyResult.data ?? []).map((row) => mapBudgetRow({ ...row, deleted_at: null })));
  }

  const { data, error } = result;
  if (error) {
    throw new Error(mapBudgetError(error, "Could not load budgets."));
  }

  return sortBudgetRecords((data ?? []).map((row) => mapBudgetRow({ ...row, deleted_at: null })));
}

export async function createBudgetRecordForUser(
  client: Client,
  userId: string,
  input: CreateBudgetInput,
): Promise<BudgetRecord> {
  let countResult = await client
    .from("finance_budget_records")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (missingDeletedAtColumn(countResult.error)) {
    countResult = await client
      .from("finance_budget_records")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
  }

  const { count, error: countError } = countResult;
  if (countError) {
    throw new Error(mapBudgetError(countError, "Could not prepare budget save."));
  }

  const sortOrder = count ?? 0;
  const payload = buildBudgetInsertPayload(userId, input, sortOrder);
  payload.days_remaining = daysRemainingForPeriod(input.period);

  const insertResult = await client
    .from("finance_budget_records")
    .insert(payload)
    .select(BUDGET_COLUMNS)
    .single();

  if (missingDeletedAtColumn(insertResult.error)) {
    const legacyInsertResult = await client
      .from("finance_budget_records")
      .insert(payload)
      .select(LEGACY_BUDGET_COLUMNS)
      .single();
    if (legacyInsertResult.error || !legacyInsertResult.data) {
      throw new Error(mapBudgetError(legacyInsertResult.error, "Could not save budget."));
    }
    return mapBudgetRow({ ...legacyInsertResult.data, deleted_at: null });
  }

  if (insertResult.error || !insertResult.data) {
    throw new Error(mapBudgetError(insertResult.error, "Could not save budget."));
  }

  return mapBudgetRow({ ...insertResult.data, deleted_at: insertResult.data.deleted_at ?? null });
}

export async function updateBudgetRecordForUser(
  client: Client,
  userId: string,
  budgetId: string,
  input: CreateBudgetInput,
): Promise<BudgetRecord> {
  const monthlyBudgetNpr = input.period === "Yearly" ? Math.round(input.amountNpr / 12) : Math.round(input.amountNpr);

  const updatePayload = {
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
  };

  const updateResult = await client
    .from("finance_budget_records")
    .update(updatePayload)
    .eq("id", budgetId)
    .eq("user_id", userId)
    .select(BUDGET_COLUMNS)
    .maybeSingle();

  if (missingDeletedAtColumn(updateResult.error)) {
    const legacyUpdateResult = await client
      .from("finance_budget_records")
      .update(updatePayload)
      .eq("id", budgetId)
      .eq("user_id", userId)
      .select(LEGACY_BUDGET_COLUMNS)
      .maybeSingle();
    if (legacyUpdateResult.error) {
      throw new Error(mapBudgetError(legacyUpdateResult.error, "Could not update budget."));
    }
    if (!legacyUpdateResult.data) {
      throw new Error("Budget not found.");
    }
    return mapBudgetRow({ ...legacyUpdateResult.data, deleted_at: null });
  }

  const { data, error } = updateResult;
  if (error) {
    throw new Error(mapBudgetError(error, "Could not update budget."));
  }
  if (!data) {
    throw new Error("Budget not found.");
  }

  return mapBudgetRow({ ...data, deleted_at: null });
}

export async function deleteBudgetRecordForUser(client: Client, userId: string, budgetId: string): Promise<void> {
  const { error, data } = await client
    .from("finance_budget_records")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", budgetId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    if (missingDeletedAtColumn(error)) {
      throw new Error("Budget cloud delete is unavailable until the soft-delete migration is applied. Existing data was not changed.");
    }
    throw new Error(mapBudgetError(error, "Could not delete budget."));
  }
  if (!data) {
    throw new Error("Budget not found.");
  }
}
