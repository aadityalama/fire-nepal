import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeGroupCategory } from "@/lib/group-expenses/categories";
import { memberDisplayName } from "@/lib/expense-members";
import type { Expense, RoommateProfile } from "@/lib/expense-utils";
import type { Database, Json } from "@/types/supabase-database";
import { ensureAuthenticatedWorkspace } from "@/services/workspace-supabase";

type Client = SupabaseClient<Database>;

export type GroupExpenseRow = Database["public"]["Tables"]["group_expenses"]["Row"] & {
  amount: number;
  split_percentages: Record<string, number>;
};

export type SettlementRow = Database["public"]["Tables"]["settlements"]["Row"] & {
  amount: number;
  metadata: Record<string, unknown>;
};

const GROUP_EXPENSE_COLUMNS =
  "id,workspace_id,user_id,local_expense_id,title,amount,payer_member_id,category,split_equally,expense_date,split_among,split_percentages,amount_currency,receipt_image_url,notes,deleted_at,created_at,updated_at" as const;

function rowToGroupExpense(row: Database["public"]["Tables"]["group_expenses"]["Row"]): GroupExpenseRow {
  return {
    ...row,
    amount: Number(row.amount),
    split_percentages: (row.split_percentages ?? {}) as Record<string, number>,
  };
}

export type GroupExpenseInput = {
  localExpenseId: number;
  title: string;
  amount: number;
  payerMemberId: string;
  category: string;
  splitEqually: boolean;
  expenseDate: string;
  splitAmong?: string[];
  splitPercentages?: Record<string, number>;
  amountCurrency?: string;
  receiptImageUrl?: string | null;
  notes?: string | null;
};

export async function upsertGroupExpenseByLocalId(
  client: Client,
  userId: string,
  input: GroupExpenseInput,
): Promise<GroupExpenseRow | null> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-expense-upsert");
  if (!workspace) return null;

  const insertPayload: Database["public"]["Tables"]["group_expenses"]["Insert"] = {
    workspace_id: workspace.id,
    user_id: userId,
    local_expense_id: input.localExpenseId,
    title: input.title,
    amount: input.amount,
    payer_member_id: input.payerMemberId,
    category: normalizeGroupCategory(input.category),
    split_equally: input.splitEqually,
    expense_date: input.expenseDate,
    split_among: input.splitAmong ?? [],
    split_percentages: (input.splitPercentages ?? {}) as Json,
    amount_currency: input.amountCurrency ?? "NPR",
    receipt_image_url: input.receiptImageUrl ?? null,
    notes: input.notes ?? null,
  };

  const updatePayload: Database["public"]["Tables"]["group_expenses"]["Update"] = {
    title: input.title,
    amount: input.amount,
    payer_member_id: input.payerMemberId,
    category: normalizeGroupCategory(input.category),
    split_equally: input.splitEqually,
    expense_date: input.expenseDate,
    split_among: input.splitAmong ?? [],
    split_percentages: (input.splitPercentages ?? {}) as Json,
    amount_currency: input.amountCurrency ?? "NPR",
    receipt_image_url: input.receiptImageUrl ?? null,
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from("group_expenses")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("local_expense_id", input.localExpenseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    const { data, error } = await client
      .from("group_expenses")
      .update(updatePayload)
      .eq("id", existing.id)
      .select(GROUP_EXPENSE_COLUMNS)
      .single();
    if (error || !data) {
      console.warn("[group-expenses] update failed", error);
      return null;
    }
    return rowToGroupExpense(data);
  }

  const { data, error } = await client
    .from("group_expenses")
    .insert(insertPayload)
    .select(GROUP_EXPENSE_COLUMNS)
    .single();

  if (error || !data) {
    console.warn("[group-expenses] insert failed", error);
    return null;
  }
  return rowToGroupExpense(data);
}

export async function softDeleteGroupExpenseByLocalId(
  client: Client,
  userId: string,
  localExpenseId: number,
): Promise<boolean> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-expense-delete");
  if (!workspace) return false;

  const { error } = await client
    .from("group_expenses")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("local_expense_id", localExpenseId)
    .is("deleted_at", null);

  if (error) {
    console.warn("[group-expenses] soft delete failed", error);
    return false;
  }
  return true;
}

export async function listGroupExpenses(
  client: Client,
  userId: string,
  options?: { monthKey?: string; limit?: number; cursor?: string | null },
): Promise<{ rows: GroupExpenseRow[]; nextCursor: string | null }> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-expense-list");
  if (!workspace) return { rows: [], nextCursor: null };

  const limit = options?.limit ?? 30;
  let query = client
    .from("group_expenses")
    .select(GROUP_EXPENSE_COLUMNS)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (options?.monthKey) {
    const [year, month] = options.monthKey.split("-").map(Number);
    const start = `${options.monthKey}-01`;
    const endDay = new Date(year, month, 0).getDate();
    const end = `${options.monthKey}-${String(endDay).padStart(2, "0")}`;
    query = query.gte("expense_date", start).lte("expense_date", end);
  }

  if (options?.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.warn("[group-expenses] list failed", error);
    return { rows: [], nextCursor: null };
  }

  const hasMore = data.length > limit;
  const slice = hasMore ? data.slice(0, limit) : data;
  const rows = slice.map(rowToGroupExpense);
  const nextCursor = hasMore ? slice[slice.length - 1]?.created_at ?? null : null;
  return { rows, nextCursor };
}

export async function syncLocalExpensesToGroupExpenses(
  client: Client,
  userId: string,
  expenses: Expense[],
): Promise<void> {
  for (const expense of expenses) {
    await upsertGroupExpenseByLocalId(client, userId, {
      localExpenseId: expense.id,
      title: expense.title,
      amount: expense.amount,
      payerMemberId: expense.payerId,
      category: expense.category,
      splitEqually: expense.splitEqually !== false,
      expenseDate: expense.date,
      splitAmong: expense.splitAmong,
      splitPercentages: expense.splitPercentages,
      amountCurrency: expense.amountCurrency,
      receiptImageUrl: expense.receiptImage,
      notes: expense.notes,
    });
  }
}

export type SettlementInput = {
  monthKey: string;
  fromMemberId?: string | null;
  toMemberId?: string | null;
  amount: number;
  settlementType: "transfer" | "complete" | "override";
  metadata?: Record<string, unknown>;
};

export async function recordSettlement(
  client: Client,
  userId: string,
  input: SettlementInput,
): Promise<SettlementRow | null> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "settlement-record");
  if (!workspace) return null;

  const { data, error } = await client
    .from("settlements")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      month_key: input.monthKey,
      from_member_id: input.fromMemberId ?? null,
      to_member_id: input.toMemberId ?? null,
      amount: input.amount,
      settlement_type: input.settlementType,
      metadata: (input.metadata ?? {}) as Json,
    })
    .select("id,workspace_id,user_id,month_key,from_member_id,to_member_id,amount,settlement_type,metadata,created_at")
    .single();

  if (error || !data) {
    console.warn("[settlements] insert failed", error);
    return null;
  }
  return {
    ...data,
    amount: Number(data.amount),
    metadata: (data.metadata ?? {}) as Json & Record<string, unknown>,
  };
}

export async function upsertGroupMember(
  client: Client,
  userId: string,
  localMemberId: string,
  profile: RoommateProfile,
  sortOrder: number,
): Promise<void> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-member-upsert");
  if (!workspace) return;

  const insertPayload: Database["public"]["Tables"]["group_members"]["Insert"] = {
    workspace_id: workspace.id,
    user_id: userId,
    local_member_id: localMemberId,
    name: profile.name,
    avatar_url: profile.avatarUrl ?? null,
    phone: profile.phone,
    kakao_id: profile.kakaoId,
    bank_name: profile.bankName,
    account_number: profile.accountNumber,
    emergency_contact: profile.emergencyContact,
    notes: profile.notes,
    sort_order: sortOrder,
  };

  const updatePayload: Database["public"]["Tables"]["group_members"]["Update"] = {
    name: profile.name,
    avatar_url: profile.avatarUrl ?? null,
    phone: profile.phone,
    kakao_id: profile.kakaoId,
    bank_name: profile.bankName,
    account_number: profile.accountNumber,
    emergency_contact: profile.emergencyContact,
    notes: profile.notes,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await client
    .from("group_members")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("local_member_id", localMemberId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    await client.from("group_members").update(updatePayload).eq("id", existing.id);
  } else {
    await client.from("group_members").insert(insertPayload);
  }
}

export function groupExpenseRowToExpense(row: GroupExpenseRow): Expense {
  return {
    id: row.local_expense_id ?? Date.now(),
    title: row.title,
    amount: row.amount,
    payerId: row.payer_member_id,
    category: row.category,
    splitEqually: row.split_equally,
    date: row.expense_date,
    splitAmong: row.split_among.length > 0 ? row.split_among : undefined,
    splitPercentages: Object.keys(row.split_percentages).length > 0 ? row.split_percentages : undefined,
    amountCurrency: row.amount_currency as "NPR" | "KRW",
    receiptImage: row.receipt_image_url ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function groupExpensePayerName(
  row: GroupExpenseRow,
  profiles: Record<string, RoommateProfile>,
): string {
  return memberDisplayName(row.payer_member_id, profiles);
}
