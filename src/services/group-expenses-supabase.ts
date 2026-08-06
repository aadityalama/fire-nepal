import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeGroupCategory } from "@/lib/group-expenses/categories";
import { memberDisplayName } from "@/lib/expense-members";
import type { Expense, RoommateProfile } from "@/lib/expense-utils";
import type { Database, Json } from "@/types/supabase-database";
import { ensureAuthenticatedWorkspace } from "@/services/workspace-supabase";

type Client = SupabaseClient<Database>;

export class GroupExpenseHistoryError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GroupExpenseHistoryError";
  }
}

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

function formatGroupExpenseError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object") {
    const e = error as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    if (parts.length > 0) return e.code ? `${parts.join(" ")} (${e.code})` : parts.join(" ");
  }
  return fallback;
}

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
    console.error("[group-expenses] list failed", { workspaceId: workspace.id, userId, error });
    throw new GroupExpenseHistoryError(
      formatGroupExpenseError(error, "Could not load group expense history."),
      "group-expense-list",
      error,
    );
  }

  const hasMore = data.length > limit;
  const slice = hasMore ? data.slice(0, limit) : data;
  const rows = slice.map(rowToGroupExpense);
  const nextCursor = hasMore ? slice[slice.length - 1]?.created_at ?? null : null;
  console.info("[group-expenses] list ok", {
    workspaceId: workspace.id,
    userId,
    count: rows.length,
    hasMore,
    payerMemberIds: rows.map((row) => row.payer_member_id),
    splitAmongIds: rows.flatMap((row) => row.split_among),
  });
  return { rows, nextCursor };
}

export async function syncLocalExpensesToGroupExpenses(
  client: Client,
  userId: string,
  expenses: Expense[],
): Promise<void> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-expense-sync");
  if (!workspace) return;

  const { count, error } = await client
    .from("group_expenses")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[group-expenses] sync guard failed", { workspaceId: workspace.id, error });
    }
    return;
  }
  if ((count ?? 0) > 0) return;

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

const GROUP_MEMBER_COLUMNS =
  "id,workspace_id,user_id,local_member_id,name,avatar_url,phone,kakao_id,bank_name,account_number,emergency_contact,notes,sort_order,deleted_at,created_at,updated_at" as const;

export type GroupMemberRow = Database["public"]["Tables"]["group_members"]["Row"];

export function groupMemberRowToProfile(row: GroupMemberRow): RoommateProfile {
  return {
    name: row.name,
    avatarUrl: row.avatar_url ?? undefined,
    phone: row.phone ?? "",
    kakaoId: row.kakao_id ?? "",
    bankName: row.bank_name ?? "",
    accountNumber: row.account_number ?? "",
    emergencyContact: row.emergency_contact ?? "",
    notes: row.notes ?? "",
  };
}

export async function listGroupMembers(
  client: Client,
  userId: string,
): Promise<GroupMemberRow[]> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-member-list");
  if (!workspace) {
    console.error("[group-members] list aborted: no workspace", { userId });
    return [];
  }

  const { data, error } = await client
    .from("group_members")
    .select(GROUP_MEMBER_COLUMNS)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[group-members] fetch failed", {
      workspaceId: workspace.id,
      userId,
      error,
    });
    throw new GroupExpenseHistoryError(
      formatGroupExpenseError(error, "Could not load group members."),
      "group-member-list",
      error,
    );
  }

  const rows = data ?? [];
  console.info("[group-members] fetch ok", {
    workspaceId: workspace.id,
    count: rows.length,
    localMemberIds: rows.map((row) => row.local_member_id),
    names: rows.map((row) => row.name),
  });
  return rows;
}

export async function upsertGroupMember(
  client: Client,
  userId: string,
  localMemberId: string,
  profile: RoommateProfile,
  sortOrder: number,
): Promise<GroupMemberRow | null> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-member-upsert");
  if (!workspace) {
    console.error("[group-members] upsert aborted: no workspace", { userId, localMemberId });
    return null;
  }

  const name = profile.name?.trim();
  if (!name) {
    console.error("[group-members] upsert aborted: empty name", { workspaceId: workspace.id, localMemberId });
    return null;
  }

  const insertPayload: Database["public"]["Tables"]["group_members"]["Insert"] = {
    workspace_id: workspace.id,
    user_id: userId,
    local_member_id: localMemberId,
    name,
    avatar_url: profile.avatarUrl ?? null,
    phone: profile.phone,
    kakao_id: profile.kakaoId,
    bank_name: profile.bankName,
    account_number: profile.accountNumber,
    emergency_contact: profile.emergencyContact,
    notes: profile.notes,
    sort_order: sortOrder,
    deleted_at: null,
  };

  const updatePayload: Database["public"]["Tables"]["group_members"]["Update"] = {
    name,
    avatar_url: profile.avatarUrl ?? null,
    phone: profile.phone,
    kakao_id: profile.kakaoId,
    bank_name: profile.bankName,
    account_number: profile.accountNumber,
    emergency_contact: profile.emergencyContact,
    notes: profile.notes,
    sort_order: sortOrder,
    deleted_at: null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await client
    .from("group_members")
    .select("id,deleted_at")
    .eq("workspace_id", workspace.id)
    .eq("local_member_id", localMemberId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("[group-members] upsert lookup failed", {
      workspaceId: workspace.id,
      localMemberId,
      error: existingError,
    });
    return null;
  }

  if (existing) {
    const { data, error } = await client
      .from("group_members")
      .update(updatePayload)
      .eq("id", existing.id)
      .select(GROUP_MEMBER_COLUMNS)
      .single();
    if (error || !data) {
      console.error("[group-members] update failed", {
        workspaceId: workspace.id,
        localMemberId,
        memberRowId: existing.id,
        error,
      });
      return null;
    }
    console.info("[group-members] update ok", {
      workspaceId: workspace.id,
      localMemberId,
      name: data.name,
      restored: Boolean(existing.deleted_at),
    });
    return data;
  }

  const { data, error } = await client
    .from("group_members")
    .insert(insertPayload)
    .select(GROUP_MEMBER_COLUMNS)
    .single();

  if (error || !data) {
    console.error("[group-members] insert failed", {
      workspaceId: workspace.id,
      localMemberId,
      name,
      error,
    });
    return null;
  }

  console.info("[group-members] insert ok", {
    workspaceId: workspace.id,
    localMemberId,
    name: data.name,
    id: data.id,
  });
  return data;
}

export async function softDeleteGroupMemberByLocalId(
  client: Client,
  userId: string,
  localMemberId: string,
): Promise<boolean> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "group-member-delete");
  if (!workspace) {
    console.error("[group-members] soft delete aborted: no workspace", { userId, localMemberId });
    return false;
  }

  const { error } = await client
    .from("group_members")
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("local_member_id", localMemberId)
    .is("deleted_at", null);

  if (error) {
    console.error("[group-members] soft delete failed", {
      workspaceId: workspace.id,
      localMemberId,
      error,
    });
    return false;
  }

  console.info("[group-members] soft delete ok", { workspaceId: workspace.id, localMemberId });
  return true;
}

export async function syncGroupMembers(
  client: Client,
  userId: string,
  memberIds: string[],
  profiles: Record<string, RoommateProfile>,
): Promise<void> {
  console.info("[group-members] sync start", {
    userId,
    count: memberIds.length,
    localMemberIds: memberIds,
  });
  for (let index = 0; index < memberIds.length; index += 1) {
    const memberId = memberIds[index];
    const profile = profiles[memberId];
    if (!profile?.name?.trim()) {
      console.error("[group-members] sync skipped member without name", { memberId, index });
      continue;
    }
    await upsertGroupMember(client, userId, memberId, profile, index);
  }
  console.info("[group-members] sync complete", { userId, count: memberIds.length });
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
