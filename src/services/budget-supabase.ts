import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBudgetInsertPayload, mapBudgetRow } from "@/lib/budget/budget-mapper";
import { daysRemainingForPeriod, sortBudgetRecords, type BudgetRecord, type CreateBudgetInput } from "@/lib/budget/types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;

const BUDGET_COLUMNS =
  "id,user_id,name,category,icon,gradient,period,amount_npr,monthly_budget_npr,monthly_spent_npr,days_remaining,notification_settings,ai_recommendation,sort_order,created_at,updated_at" as const;

export async function listBudgetRecordsForUser(client: Client, userId: string): Promise<BudgetRecord[]> {
  const { data, error } = await client
    .from("finance_budget_records")
    .select(BUDGET_COLUMNS)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      error.message.includes("finance_budget_records")
        ? "Budget sync is not ready. Apply the finance_budget_records migration."
        : error.message,
    );
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
    throw new Error(countError.message);
  }

  const sortOrder = count ?? 0;
  const payload = buildBudgetInsertPayload(userId, input, sortOrder);
  payload.days_remaining = daysRemainingForPeriod(input.period);

  const { data, error } = await client.from("finance_budget_records").insert(payload).select(BUDGET_COLUMNS).single();

  if (error || !data) {
    throw new Error(
      error?.message.includes("finance_budget_records")
        ? "Budget sync is not ready. Apply the finance_budget_records migration."
        : error?.message ?? "Could not save budget.",
    );
  }

  return mapBudgetRow(data);
}
