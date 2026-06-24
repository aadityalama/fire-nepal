export const EXPENSE_TRANSACTION_TYPES = [
  "income",
  "expense",
  "transfer",
  "settlement",
  "adjustment",
] as const;

export type ExpenseTransactionType = (typeof EXPENSE_TRANSACTION_TYPES)[number];

export type ExpenseTransactionRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  local_expense_id: number | null;
  transaction_type: ExpenseTransactionType;
  description: string;
  category: string | null;
  amount: number;
  currency: string;
  member_id: string | null;
  member_name: string | null;
  transaction_date: string;
  metadata: Record<string, unknown>;
  created_by_name: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseTransactionAuditRow = {
  id: string;
  transaction_id: string;
  workspace_id: string;
  user_id: string;
  action: "created" | "updated" | "deleted" | "restored";
  changes: Record<string, unknown>;
  actor_name: string | null;
  created_at: string;
};

export type DateRangePreset = "today" | "week" | "month" | "custom" | "all";

export type TransactionHistoryFilters = {
  search: string;
  datePreset: DateRangePreset;
  dateFrom: string;
  dateTo: string;
  category: string;
  memberId: string;
  transactionType: string;
};

export type TransactionHistorySummary = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
};

export function defaultTransactionFilters(): TransactionHistoryFilters {
  return {
    search: "",
    datePreset: "all",
    dateFrom: "",
    dateTo: "",
    category: "all",
    memberId: "all",
    transactionType: "all",
  };
}

export function transactionTypeLabel(type: ExpenseTransactionType): string {
  const labels: Record<ExpenseTransactionType, string> = {
    income: "Income",
    expense: "Expense",
    transfer: "Transfer",
    settlement: "Settlement",
    adjustment: "Adjustment",
  };
  return labels[type];
}

export function transactionTypeBadgeClass(type: ExpenseTransactionType): string {
  const classes: Record<ExpenseTransactionType, string> = {
    income: "bg-emerald-100 text-emerald-800",
    expense: "bg-rose-100 text-rose-800",
    transfer: "bg-sky-100 text-sky-800",
    settlement: "bg-violet-100 text-violet-800",
    adjustment: "bg-amber-100 text-amber-800",
  };
  return classes[type];
}

export function resolveDateRange(filters: TransactionHistoryFilters): { from: string | null; to: string | null } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  if (filters.datePreset === "today") {
    const d = fmt(today);
    return { from: d, to: d };
  }
  if (filters.datePreset === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return { from: fmt(start), to: fmt(today) };
  }
  if (filters.datePreset === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: fmt(start), to: fmt(today) };
  }
  if (filters.datePreset === "custom") {
    return {
      from: filters.dateFrom || null,
      to: filters.dateTo || null,
    };
  }
  return { from: null, to: null };
}
