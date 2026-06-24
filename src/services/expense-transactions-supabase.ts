import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimelineActivity } from "@/lib/expense-storage";
import { normalizeCategory } from "@/lib/expense-analytics";
import { memberDisplayName } from "@/lib/expense-members";
import type { Expense, RoommateProfile } from "@/lib/expense-utils";
import {
  resolveDateRange,
  type ExpenseTransactionAuditRow,
  type ExpenseTransactionRow,
  type ExpenseTransactionType,
  type TransactionHistoryFilters,
  type TransactionHistorySummary,
} from "@/lib/transaction-history-types";
import type { Database, Json } from "@/types/supabase-database";
import { ensureAuthenticatedWorkspace } from "@/services/workspace-supabase";

type Client = SupabaseClient<Database>;

export class ExpenseTransactionHistoryError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExpenseTransactionHistoryError";
  }
}

function formatSupabaseError(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export type ExpenseTransactionInput = {
  localExpenseId?: number | null;
  transactionType: ExpenseTransactionType;
  description: string;
  category?: string | null;
  amount: number;
  currency?: string;
  memberId?: string | null;
  memberName?: string | null;
  transactionDate: string;
  metadata?: Record<string, unknown>;
  createdByName?: string | null;
};

const PAGE_SIZE = 30;

const TRANSACTION_COLUMNS =
  "id,workspace_id,user_id,local_expense_id,transaction_type,description,category,amount,currency,member_id,member_name,transaction_date,metadata,created_by_name,deleted_at,created_at,updated_at" as const;

function rowToTransaction(row: Database["public"]["Tables"]["expense_transactions"]["Row"]): ExpenseTransactionRow {
  return {
    ...row,
    amount: Number(row.amount),
    local_expense_id: row.local_expense_id != null ? Number(row.local_expense_id) : null,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  };
}

async function appendAudit(
  client: Client,
  workspaceId: string,
  userId: string,
  transactionId: string,
  action: ExpenseTransactionAuditRow["action"],
  changes: Record<string, unknown>,
  actorName?: string | null,
) {
  await client.from("expense_transaction_audit_log").insert({
    transaction_id: transactionId,
    workspace_id: workspaceId,
    user_id: userId,
    action,
    changes: changes as Json,
    actor_name: actorName ?? null,
  });
}

export async function insertExpenseTransaction(
  client: Client,
  userId: string,
  input: ExpenseTransactionInput,
  actorName?: string | null,
): Promise<ExpenseTransactionRow | null> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-insert");
  if (!workspace) return null;

  const payload: Database["public"]["Tables"]["expense_transactions"]["Insert"] = {
    workspace_id: workspace.id,
    user_id: userId,
    local_expense_id: input.localExpenseId ?? null,
    transaction_type: input.transactionType,
    description: input.description,
    category: input.category ?? null,
    amount: input.amount,
    currency: input.currency ?? "NPR",
    member_id: input.memberId ?? null,
    member_name: input.memberName ?? null,
    transaction_date: input.transactionDate,
    metadata: (input.metadata ?? {}) as Database["public"]["Tables"]["expense_transactions"]["Insert"]["metadata"],
    created_by_name: input.createdByName ?? actorName ?? null,
  };

  const { data, error } = await client
    .from("expense_transactions")
    .insert(payload)
    .select(TRANSACTION_COLUMNS)
    .single();

  if (error || !data) {
    console.warn("[expense-transactions] insert failed", error);
    return null;
  }

  await appendAudit(client, workspace.id, userId, data.id, "created", { after: data }, actorName);
  return rowToTransaction(data);
}

export async function upsertExpenseTransactionByLocalId(
  client: Client,
  userId: string,
  input: ExpenseTransactionInput,
  actorName?: string | null,
): Promise<ExpenseTransactionRow | null> {
  if (input.localExpenseId == null) {
    return insertExpenseTransaction(client, userId, input, actorName);
  }

  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-upsert");
  if (!workspace) return null;

  const { data: existing } = await client
    .from("expense_transactions")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("local_expense_id", input.localExpenseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) {
    return insertExpenseTransaction(client, userId, input, actorName);
  }

  return updateExpenseTransaction(client, userId, existing.id, input, actorName);
}

export async function updateExpenseTransaction(
  client: Client,
  userId: string,
  transactionId: string,
  input: Partial<ExpenseTransactionInput>,
  actorName?: string | null,
): Promise<ExpenseTransactionRow | null> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-update");
  if (!workspace) return null;

  const { data: before } = await client
    .from("expense_transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("id", transactionId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!before) return null;

  const patch: Database["public"]["Tables"]["expense_transactions"]["Update"] = {};
  if (input.transactionType) patch.transaction_type = input.transactionType;
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.amount !== undefined) patch.amount = input.amount;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.memberId !== undefined) patch.member_id = input.memberId;
  if (input.memberName !== undefined) patch.member_name = input.memberName;
  if (input.transactionDate !== undefined) patch.transaction_date = input.transactionDate;
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata as Database["public"]["Tables"]["expense_transactions"]["Update"]["metadata"];
  }

  const { data, error } = await client
    .from("expense_transactions")
    .update(patch)
    .eq("id", transactionId)
    .eq("workspace_id", workspace.id)
    .select(TRANSACTION_COLUMNS)
    .single();

  if (error || !data) {
    console.warn("[expense-transactions] update failed", error);
    return null;
  }

  await appendAudit(client, workspace.id, userId, transactionId, "updated", { before, after: data }, actorName);
  return rowToTransaction(data);
}

export async function softDeleteExpenseTransaction(
  client: Client,
  userId: string,
  transactionId: string,
  actorName?: string | null,
): Promise<boolean> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-delete");
  if (!workspace) return false;

  const { data: before } = await client
    .from("expense_transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("id", transactionId)
    .eq("workspace_id", workspace.id)
    .maybeSingle();

  if (!before) return false;

  const deletedAt = new Date().toISOString();
  const { error } = await client
    .from("expense_transactions")
    .update({ deleted_at: deletedAt })
    .eq("id", transactionId)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.warn("[expense-transactions] soft delete failed", error);
    return false;
  }

  await appendAudit(client, workspace.id, userId, transactionId, "deleted", { before, deleted_at: deletedAt }, actorName);
  return true;
}

export async function softDeleteExpenseTransactionByLocalId(
  client: Client,
  userId: string,
  localExpenseId: number,
  actorName?: string | null,
): Promise<boolean> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-delete-local");
  if (!workspace) return false;

  const { data: existing } = await client
    .from("expense_transactions")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("local_expense_id", localExpenseId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) return false;
  return softDeleteExpenseTransaction(client, userId, existing.id, actorName);
}

export async function listExpenseTransactions(
  client: Client,
  userId: string,
  filters: TransactionHistoryFilters,
  options?: { cursor?: string | null; limit?: number; includeDeleted?: boolean },
): Promise<{ rows: ExpenseTransactionRow[]; nextCursor: string | null; summary: TransactionHistorySummary }> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-list");
  if (!workspace) {
    return { rows: [], nextCursor: null, summary: { totalIncome: 0, totalExpense: 0, netBalance: 0 } };
  }

  const limit = options?.limit ?? PAGE_SIZE;
  const { from, to } = resolveDateRange(filters);

  let query = client
    .from("expense_transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("workspace_id", workspace.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (!options?.includeDeleted) {
    query = query.is("deleted_at", null);
  }
  if (from) query = query.gte("transaction_date", from);
  if (to) query = query.lte("transaction_date", to);
  if (filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.memberId !== "all") query = query.eq("member_id", filters.memberId);
  if (filters.transactionType !== "all") {
    query = query.eq("transaction_type", filters.transactionType as ExpenseTransactionType);
  }
  if (options?.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[expense-transactions] list failed", {
      context: "expense-transaction-list",
      workspaceId: workspace.id,
      filters,
      error,
    });
    throw new ExpenseTransactionHistoryError(
      formatSupabaseError(error, "Could not load expense transactions."),
      "expense-transaction-list",
      error,
    );
  }
  if (!data) {
    throw new ExpenseTransactionHistoryError(
      "Expense transaction query returned no data.",
      "expense-transaction-list",
    );
  }

  let rows = data.map(rowToTransaction);
  const search = filters.search.trim().toLowerCase();
  if (search) {
    rows = rows.filter(
      (row) =>
        row.description.toLowerCase().includes(search) ||
        (row.category?.toLowerCase().includes(search) ?? false) ||
        (row.member_name?.toLowerCase().includes(search) ?? false) ||
        (row.created_by_name?.toLowerCase().includes(search) ?? false),
    );
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore && page.length > 0 ? page[page.length - 1].created_at : null;

  const summary = page.reduce<TransactionHistorySummary>(
    (acc, row) => {
      if (row.transaction_type === "income") acc.totalIncome += row.amount;
      if (row.transaction_type === "expense") acc.totalExpense += row.amount;
      acc.netBalance = acc.totalIncome - acc.totalExpense;
      return acc;
    },
    { totalIncome: 0, totalExpense: 0, netBalance: 0 },
  );

  return { rows: page, nextCursor, summary };
}

export async function listAllExpenseTransactionsForExport(
  client: Client,
  userId: string,
  filters: TransactionHistoryFilters,
): Promise<{ rows: ExpenseTransactionRow[]; summary: TransactionHistorySummary }> {
  const all: ExpenseTransactionRow[] = [];
  let cursor: string | null = null;
  let summary: TransactionHistorySummary = { totalIncome: 0, totalExpense: 0, netBalance: 0 };

  for (let i = 0; i < 50; i += 1) {
    const page = await listExpenseTransactions(client, userId, filters, {
      cursor,
      limit: 100,
    });
    all.push(...page.rows);
    summary = page.summary;
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return { rows: all, summary };
}

export async function getTransactionAuditLog(
  client: Client,
  userId: string,
  transactionId: string,
): Promise<ExpenseTransactionAuditRow[]> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-audit");
  if (!workspace) return [];

  const { data, error } = await client
    .from("expense_transaction_audit_log")
    .select("id,transaction_id,workspace_id,user_id,action,changes,actor_name,created_at")
    .eq("workspace_id", workspace.id)
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => ({
    ...row,
    changes: (row.changes ?? {}) as Record<string, unknown>,
  }));
}

function activityToTransactionType(activity: TimelineActivity): ExpenseTransactionType | null {
  if (activity.type === "expense_added" || activity.type === "expense_edited") return "expense";
  if (activity.type === "expense_deleted") return "adjustment";
  if (activity.type === "settlement") return "settlement";
  return null;
}

export async function syncLocalDataToTransactions(
  client: Client,
  userId: string,
  expenses: Expense[],
  profiles: Record<string, RoommateProfile>,
  activities: TimelineActivity[],
  actorName?: string | null,
): Promise<void> {
  const workspace = await ensureAuthenticatedWorkspace(client, userId, "expense-transaction-sync");
  if (!workspace) return;

  const { count } = await client
    .from("expense_transactions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id);

  if ((count ?? 0) > 0) return;

  for (const expense of expenses) {
    await insertExpenseTransaction(
      client,
      userId,
      {
        localExpenseId: expense.id,
        transactionType: "expense",
        description: expense.title,
        category: normalizeCategory(expense.category),
        amount: expense.amount,
        currency: expense.amountCurrency ?? "NPR",
        memberId: expense.payerId,
        memberName: memberDisplayName(expense.payerId, profiles),
        transactionDate: expense.date,
        metadata: { source: "migration", splitEqually: expense.splitEqually },
        createdByName: actorName,
      },
      actorName,
    );
  }

  for (const activity of activities) {
    const type = activityToTransactionType(activity);
    if (!type) continue;
    if (type === "settlement") {
      await insertExpenseTransaction(
        client,
        userId,
        {
          transactionType: "settlement",
          description: activity.message,
          amount: 0,
          transactionDate: activity.timestamp.slice(0, 10),
          metadata: { monthKey: activity.monthKey, source: "migration" },
          createdByName: actorName,
        },
        actorName,
      );
      continue;
    }
    if (activity.amount == null) continue;
    await insertExpenseTransaction(
      client,
      userId,
      {
        transactionType: type,
        description: activity.message,
        category: activity.category ?? null,
        amount: activity.amount ?? 0,
        memberId: activity.memberId ?? null,
        memberName: activity.memberId ? memberDisplayName(activity.memberId, profiles) : null,
        transactionDate: activity.timestamp.slice(0, 10),
        metadata: { monthKey: activity.monthKey, activityType: activity.type, source: "migration" },
        createdByName: actorName,
      },
      actorName,
    );
  }
}
