"use client";

import {
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DualCurrencyAmount } from "@/components/DualCurrencyAmount";
import { TransactionDetailModal } from "@/components/TransactionDetailModal";
import { EXPENSE_CATEGORIES } from "@/lib/expense-analytics";
import type { TimelineActivity } from "@/lib/expense-storage";
import { memberDisplayName } from "@/lib/expense-members";
import type { GroupProfile } from "@/lib/group-profile";
import type { Currency, Expense, RoommateProfile } from "@/lib/expense-utils";
import { formatMoney } from "@/lib/expense-utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  exportTransactionHistoryCsv,
  exportTransactionHistoryPdf,
  exportTransactionHistoryXlsx,
} from "@/lib/transaction-history-exports";
import {
  defaultTransactionFilters,
  EXPENSE_TRANSACTION_TYPES,
  transactionTypeBadgeClass,
  transactionTypeLabel,
  type ExpenseTransactionRow,
  type TransactionHistoryFilters,
  type TransactionHistorySummary,
} from "@/lib/transaction-history-types";
import {
  listAllExpenseTransactionsForExport,
  listExpenseTransactions,
  syncLocalDataToTransactions,
} from "@/services/expense-transactions-supabase";

type TransactionHistoryPanelProps = {
  userId?: string;
  actorName?: string;
  groupProfile: GroupProfile;
  currency: Currency;
  krwPerNpr: number;
  members: string[];
  profiles: Record<string, RoommateProfile>;
  expenses: Expense[];
  activities: TimelineActivity[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
};

export function TransactionHistoryPanel({
  userId,
  actorName,
  groupProfile,
  currency,
  krwPerNpr,
  members,
  profiles,
  expenses,
  activities,
  onEditExpense,
  onDeleteExpense,
}: TransactionHistoryPanelProps) {
  const [filters, setFilters] = useState<TransactionHistoryFilters>(defaultTransactionFilters);
  const [rows, setRows] = useState<ExpenseTransactionRow[]>([]);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<ExpenseTransactionRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncedRef = useRef(false);

  const canUseRemote = Boolean(userId && isSupabaseConfigured());

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!canUseRemote || !userId) return;
      setLoading(true);
      try {
        const client = getSupabaseBrowserClient();
        const result = await listExpenseTransactions(client, userId, filters, {
          cursor: reset ? null : cursorRef.current,
        });
        setRows((current) => (reset ? result.rows : [...current, ...result.rows]));
        cursorRef.current = result.nextCursor;
        setHasMore(Boolean(result.nextCursor));
      } catch {
        toast.error("Could not load transaction history");
      } finally {
        setLoading(false);
      }
    },
    [canUseRemote, userId, filters],
  );

  const refresh = useCallback(() => {
    cursorRef.current = null;
    setHasMore(true);
    void loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    if (!canUseRemote || !userId || syncedRef.current) return;
    syncedRef.current = true;
    void (async () => {
      const client = getSupabaseBrowserClient();
      await syncLocalDataToTransactions(client, userId, expenses, profiles, activities, actorName);
      await refresh();
    })();
  }, [canUseRemote, userId, expenses, profiles, activities, actorName, refresh]);

  useEffect(() => {
    if (!canUseRemote) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      cursorRef.current = null;
      setHasMore(true);
      void loadPage(true);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, canUseRemote]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canUseRemote || !hasMore || loading) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          void loadPage(false);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canUseRemote, hasMore, loading, loadPage]);

  const displaySummary = useMemo(() => {
    return rows.reduce<TransactionHistorySummary>(
      (acc, row) => {
        if (row.transaction_type === "income") acc.totalIncome += row.amount;
        if (row.transaction_type === "expense") acc.totalExpense += row.amount;
        acc.netBalance = acc.totalIncome - acc.totalExpense;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, netBalance: 0 },
    );
  }, [rows]);

  async function handleExport(kind: "csv" | "xlsx" | "pdf") {
    if (!canUseRemote || !userId) {
      toast.error("Sign in to export transaction history");
      return;
    }
    setExporting(true);
    try {
      const client = getSupabaseBrowserClient();
      const { rows: exportRows, summary: exportSummary } = await listAllExpenseTransactionsForExport(
        client,
        userId,
        filters,
      );
      if (kind === "csv") exportTransactionHistoryCsv(exportRows, groupProfile, filters, exportSummary);
      if (kind === "xlsx") await exportTransactionHistoryXlsx(exportRows, groupProfile, filters, exportSummary);
      if (kind === "pdf") await exportTransactionHistoryPdf(exportRows, groupProfile, filters, exportSummary, currency);
      toast.success("Export ready");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  }

  function openDetail(row: ExpenseTransactionRow) {
    setSelected(row);
    setDetailOpen(true);
  }

  return (
    <div className="mt-4 space-y-4 pb-24">
      <section className="dark-glass-card overflow-hidden rounded-[1.6rem] p-5 text-white md:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">Transaction History</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Permanent transaction archive</h2>
        <p className="mt-2 max-w-2xl text-sm text-emerald-50/85">
          Income, expenses, transfers, settlements, and adjustments — stored securely in your workspace.
        </p>
      </section>

      <div className="sticky top-[4.5rem] z-30 -mx-1 space-y-3 rounded-[1.4rem] border border-emerald-100/80 bg-white/95 p-3 shadow-lg backdrop-blur-md sm:top-20 sm:p-4">
        <div className="flex items-center gap-2">
          <Filter className="text-emerald-700" size={16} />
          <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-800">Search &amp; Filter</span>
        </div>

        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
            <Search size={11} /> Fast search
          </span>
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Description, category, member..."
            className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-2.5 text-sm font-bold outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["custom", "Custom"],
            ] as const
          ).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, datePreset: preset }))}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                filters.datePreset === preset
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filters.datePreset === "custom" ? (
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">From</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm font-bold"
              />
            </label>
            <label>
              <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">To</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                className="w-full rounded-xl border border-emerald-100 px-3 py-2 text-sm font-bold"
              />
            </label>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={filters.category}
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold"
          >
            <option value="all">All categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={filters.memberId}
            onChange={(e) => setFilters((f) => ({ ...f, memberId: e.target.value }))}
            className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold"
          >
            <option value="all">All members</option>
            {members.map((id) => (
              <option key={id} value={id}>
                {memberDisplayName(id, profiles)}
              </option>
            ))}
          </select>
          <select
            value={filters.transactionType}
            onChange={(e) => setFilters((f) => ({ ...f, transactionType: e.target.value }))}
            className="rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-sm font-bold"
          >
            <option value="all">All types</option>
            {EXPENSE_TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {transactionTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-emerald-50 pt-3">
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport("pdf")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white"
          >
            <FileText size={14} /> PDF
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport("xlsx")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport("csv")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800"
          >
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="glass-card rounded-2xl p-3 sm:p-4">
          <p className="text-[10px] font-black uppercase text-slate-500">Income</p>
          <p className="mt-1 text-lg font-black text-emerald-700 sm:text-xl">
            {formatMoney(displaySummary.totalIncome, currency)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-3 sm:p-4">
          <p className="text-[10px] font-black uppercase text-slate-500">Expense</p>
          <p className="mt-1 text-lg font-black text-rose-700 sm:text-xl">
            {formatMoney(displaySummary.totalExpense, currency)}
          </p>
        </div>
        <div className="glass-card rounded-2xl p-3 sm:p-4">
          <p className="text-[10px] font-black uppercase text-slate-500">Net</p>
          <p className="mt-1 text-lg font-black text-emerald-900 sm:text-xl">
            {formatMoney(displaySummary.netBalance, currency)}
          </p>
        </div>
      </div>

      {!canUseRemote ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <CalendarDays className="mx-auto text-emerald-600" />
          <p className="mt-3 font-black text-emerald-950">Sign in to sync transaction history</p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Your transactions will be stored permanently in Supabase once you sign in.
          </p>
        </div>
      ) : (
        <section className="glass-card overflow-hidden rounded-[1.5rem]">
          <div className="hidden overflow-x-auto md:block">
            <table className="fintech-table min-w-full text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th className="text-right">Amount</th>
                  <th>Currency</th>
                  <th>Created By</th>
                  <th>Created At</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-emerald-50/60"
                    onClick={() => openDetail(row)}
                  >
                    <td>{row.transaction_date}</td>
                    <td className="font-bold text-emerald-950">{row.description}</td>
                    <td>{row.category ?? "—"}</td>
                    <td className="text-right">
                      <DualCurrencyAmount
                        amountNpr={row.amount}
                        krwPerNpr={krwPerNpr}
                        currency={currency}
                        size="sm"
                      />
                    </td>
                    <td>{row.currency}</td>
                    <td>{row.created_by_name ?? "—"}</td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${transactionTypeBadgeClass(row.transaction_type)}`}
                      >
                        {transactionTypeLabel(row.transaction_type)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-emerald-100 md:hidden">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openDetail(row)}
                className="w-full px-4 py-4 text-left transition hover:bg-emerald-50/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-emerald-950">{row.description}</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-500">
                      {row.transaction_date} · {row.category ?? "—"}
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">
                      {row.created_by_name ?? "—"} · {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <DualCurrencyAmount
                      amountNpr={row.amount}
                      krwPerNpr={krwPerNpr}
                      currency={currency}
                      size="sm"
                    />
                    <span
                      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${transactionTypeBadgeClass(row.transaction_type)}`}
                    >
                      {transactionTypeLabel(row.transaction_type)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {rows.length === 0 && !loading ? (
            <p className="p-8 text-center text-sm font-bold text-slate-500">No transactions match your filters.</p>
          ) : null}

          <div ref={sentinelRef} className="flex justify-center py-4">
            {loading ? <Loader2 className="animate-spin text-emerald-600" size={22} /> : null}
            {!hasMore && rows.length > 0 ? (
              <p className="text-xs font-bold text-slate-400">End of history</p>
            ) : null}
          </div>
        </section>
      )}

      <TransactionDetailModal
        open={detailOpen}
        transaction={selected}
        userId={userId}
        actorName={actorName}
        currency={currency}
        krwPerNpr={krwPerNpr}
        profiles={profiles}
        expenses={expenses}
        onClose={() => setDetailOpen(false)}
        onUpdated={refresh}
        onEditExpense={onEditExpense}
        onDeleteExpense={onDeleteExpense}
      />
    </div>
  );
}
