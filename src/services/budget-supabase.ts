import type { SupabaseClient } from "@supabase/supabase-js";
import { buildBudgetInsertPayload, mapBudgetRow } from "@/lib/budget/budget-mapper";
import {
  daysRemainingForPeriod,
  sanitizeBudgetNotes,
  sortBudgetRecords,
  type BudgetRecord,
  type CreateBudgetInput,
} from "@/lib/budget/types";
import type { Database } from "@/types/supabase-database";

type Client = SupabaseClient<Database>;
type BudgetQueryError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
} | null | undefined;

const BUDGET_COLUMNS =
  "id,user_id,name,category,icon,gradient,period,amount_npr,monthly_budget_npr,monthly_spent_npr,days_remaining,notes,notification_settings,ai_recommendation,sort_order,deleted_at,created_at,updated_at" as const;
const BUDGET_COLUMNS_NO_SOFT_DELETE =
  "id,user_id,name,category,icon,gradient,period,amount_npr,monthly_budget_npr,monthly_spent_npr,days_remaining,notes,notification_settings,ai_recommendation,sort_order,created_at,updated_at" as const;
const LEGACY_BUDGET_COLUMNS =
  "id,user_id,name,category,icon,gradient,period,amount_npr,monthly_budget_npr,monthly_spent_npr,days_remaining,notification_settings,ai_recommendation,sort_order,created_at,updated_at" as const;

function missingDeletedAtColumn(error: BudgetQueryError) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || error?.code === "PGRST204" || message.includes("deleted_at");
}

function missingNotesColumn(error: BudgetQueryError) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "42703" || error?.code === "PGRST204" || message.includes("notes");
}

function mapBudgetError(error: BudgetQueryError, fallback: string) {
  const message = error?.message?.trim() ?? "";
  const details = error?.details?.trim() ?? "";
  const hint = error?.hint?.trim() ?? "";
  const pieces = [message, details, hint].filter(Boolean);
  if (pieces.length > 0) return pieces.join(" ");
  if (error?.code) return `Database error ${error.code}`;
  return fallback;
}

function withEmptyNotes<T extends Record<string, unknown>>(row: T) {
  return { ...row, notes: typeof row.notes === "string" ? row.notes : "", deleted_at: null as string | null };
}

async function getNextBudgetSortOrder(client: Client, userId: string): Promise<number> {
  const result = await client
    .from("finance_budget_records")
    .select("sort_order")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (missingDeletedAtColumn(result.error)) {
    const legacyResult = await client
      .from("finance_budget_records")
      .select("sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    if (legacyResult.error) {
      throw new Error(mapBudgetError(legacyResult.error, "Could not prepare budget save."));
    }
    const legacyLastSortOrder = legacyResult.data?.[0]?.sort_order ?? -1;
    return legacyLastSortOrder + 1;
  }

  if (result.error) {
    throw new Error(mapBudgetError(result.error, "Could not prepare budget save."));
  }

  const lastSortOrder = result.data?.[0]?.sort_order ?? -1;
  return lastSortOrder + 1;
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

  if (!result.error) {
    return sortBudgetRecords((result.data ?? []).map((row) => mapBudgetRow({ ...row, deleted_at: null })));
  }

  if (missingNotesColumn(result.error) || missingDeletedAtColumn(result.error)) {
    const noSoft = await client
      .from("finance_budget_records")
      .select(BUDGET_COLUMNS_NO_SOFT_DELETE)
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("name", { ascending: true });

    if (!noSoft.error) {
      return sortBudgetRecords((noSoft.data ?? []).map((row) => mapBudgetRow(withEmptyNotes(row))));
    }

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
    return sortBudgetRecords((legacyResult.data ?? []).map((row) => mapBudgetRow(withEmptyNotes(row))));
  }

  throw new Error(mapBudgetError(result.error, "Could not load budgets."));
}

export async function createBudgetRecordForUser(
  client: Client,
  userId: string,
  input: CreateBudgetInput,
): Promise<BudgetRecord> {
  const sortOrder = await getNextBudgetSortOrder(client, userId);
  const payload = buildBudgetInsertPayload(userId, input, sortOrder);
  payload.days_remaining = daysRemainingForPeriod(input.period);

  const withNotes = await client.from("finance_budget_records").insert(payload).select(BUDGET_COLUMNS_NO_SOFT_DELETE).single();
  if (!withNotes.error && withNotes.data) {
    return mapBudgetRow(withEmptyNotes(withNotes.data));
  }

  if (withNotes.error && missingNotesColumn(withNotes.error)) {
    const { notes: _drop, ...legacyPayload } = payload;
    void _drop;
    const legacy = await client.from("finance_budget_records").insert(legacyPayload).select(LEGACY_BUDGET_COLUMNS).single();
    if (legacy.error || !legacy.data) {
      throw new Error(mapBudgetError(legacy.error, "Could not save budget."));
    }
    return mapBudgetRow(withEmptyNotes({ ...legacy.data, notes: sanitizeBudgetNotes(input.notes ?? "") }));
  }

  throw new Error(mapBudgetError(withNotes.error, "Could not save budget."));
}

export async function updateBudgetRecordForUser(
  client: Client,
  userId: string,
  budgetId: string,
  input: CreateBudgetInput,
): Promise<BudgetRecord> {
  const monthlyBudgetNpr = input.period === "Yearly" ? Math.round(input.amountNpr / 12) : Math.round(input.amountNpr);
  const notes = sanitizeBudgetNotes(input.notes ?? "");

  const updatePayload = {
    name: input.name.trim() || input.category,
    category: input.category,
    icon: input.icon,
    gradient: input.gradient,
    period: input.period,
    amount_npr: input.amountNpr,
    monthly_budget_npr: monthlyBudgetNpr,
    days_remaining: daysRemainingForPeriod(input.period),
    notes,
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

  if (!updateResult.error && updateResult.data) {
    return mapBudgetRow({ ...updateResult.data, deleted_at: null });
  }

  if (updateResult.error && (missingNotesColumn(updateResult.error) || missingDeletedAtColumn(updateResult.error))) {
    const { notes: _drop, ...legacyPayload } = updatePayload;
    void _drop;
    const legacyUpdateResult = await client
      .from("finance_budget_records")
      .update(legacyPayload)
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
    return mapBudgetRow(withEmptyNotes({ ...legacyUpdateResult.data, notes }));
  }

  if (updateResult.error) {
    throw new Error(mapBudgetError(updateResult.error, "Could not update budget."));
  }
  throw new Error("Budget not found.");
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
