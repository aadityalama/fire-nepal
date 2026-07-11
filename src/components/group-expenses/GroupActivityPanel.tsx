"use client";

import { Loader2, ReceiptText, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DualCurrencyAmount } from "@/components/DualCurrencyAmount";
import { getGroupCategoryLabel } from "@/lib/group-expenses/categories";
import type { GroupTimelineActivity } from "@/lib/group-expenses/storage";
import { memberDisplayName } from "@/lib/expense-members";
import type { GroupProfile } from "@/lib/group-profile";
import type { Currency, Expense, RoommateProfile } from "@/lib/expense-utils";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  groupExpensePayerName,
  groupExpenseRowToExpense,
  listGroupExpenses,
  syncLocalExpensesToGroupExpenses,
  type GroupExpenseRow,
} from "@/services/group-expenses-supabase";
import { buildActivityMessage } from "@/components/ExpenseTimeline";

type GroupActivityPanelProps = {
  userId?: string;
  groupProfile: GroupProfile;
  currency: Currency;
  krwPerNpr: number;
  members: string[];
  profiles: Record<string, RoommateProfile>;
  expenses: Expense[];
  activities: GroupTimelineActivity[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
};

export function GroupActivityPanel({
  userId,
  groupProfile,
  currency,
  krwPerNpr,
  members,
  profiles,
  expenses,
  activities,
  onEditExpense,
  onDeleteExpense,
}: GroupActivityPanelProps) {
  const [rows, setRows] = useState<GroupExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const syncedRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const canUseRemote = Boolean(userId && isSupabaseConfigured());

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!canUseRemote || !userId) return;
      setLoading(true);
      try {
        const client = getSupabaseBrowserClient();
        const result = await listGroupExpenses(client, userId, {
          cursor: reset ? null : cursorRef.current,
        });
        setRows((current) => (reset ? result.rows : [...current, ...result.rows]));
        cursorRef.current = result.nextCursor;
        setHasMore(Boolean(result.nextCursor));
      } catch (error) {
        console.error("Group activity load failed", error);
        toast.error("Unable to load group expenses. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [canUseRemote, userId],
  );

  useEffect(() => {
    if (!canUseRemote || !userId || syncedRef.current) return;
    syncedRef.current = true;
    void (async () => {
      try {
        const client = getSupabaseBrowserClient();
        await syncLocalExpensesToGroupExpenses(client, userId, expenses);
        await loadPage(true);
      } catch {
        await loadPage(true);
      }
    })();
  }, [canUseRemote, userId, expenses, loadPage]);

  useEffect(() => {
    if (!canUseRemote) return;
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

  const displayRows = useMemo(() => {
    if (canUseRemote && rows.length > 0) {
      const q = search.trim().toLowerCase();
      return rows.filter((row) => {
        if (!q) return true;
        return (
          row.title.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          groupExpensePayerName(row, profiles).toLowerCase().includes(q)
        );
      });
    }
    const q = search.trim().toLowerCase();
    return expenses
      .filter((expense) => {
        if (!q) return true;
        return (
          expense.title.toLowerCase().includes(q) ||
          expense.category.toLowerCase().includes(q) ||
          memberDisplayName(expense.payerId, profiles).toLowerCase().includes(q)
        );
      })
      .map((expense) => ({
        id: String(expense.id),
        local_expense_id: expense.id,
        title: expense.title,
        amount: expense.amount,
        payer_member_id: expense.payerId,
        category: expense.category,
        expense_date: expense.date,
        amount_currency: expense.amountCurrency ?? "NPR",
        split_equally: expense.splitEqually !== false,
        split_among: expense.splitAmong ?? [],
        split_percentages: expense.splitPercentages ?? {},
        workspace_id: "",
        user_id: "",
        receipt_image_url: expense.receiptImage ?? null,
        notes: expense.notes ?? null,
        deleted_at: null,
        created_at: expense.date,
        updated_at: expense.date,
      })) as GroupExpenseRow[];
  }, [canUseRemote, rows, expenses, search, profiles]);

  const recentActivities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activities.filter((activity) => {
      if (activity.type === "member_added" || activity.type === "settlement") return !q;
      if (!q) return true;
      const msg = buildActivityMessage(activity, profiles).toLowerCase();
      return msg.includes(q) || (activity.title?.toLowerCase().includes(q) ?? false);
    });
  }, [activities, search, profiles]);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200/80 bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-emerald-950">Group Activity</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Shared group expenses only — no personal finance data.
            </p>
          </div>
          {groupProfile.companyName ? (
            <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
              {groupProfile.companyName}
            </span>
          ) : null}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search group expenses…"
            className="w-full rounded-xl border border-emerald-100 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {recentActivities.length > 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4">
          <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Recent Activity</h3>
          <ol className="space-y-2">
            {recentActivities.slice(0, 12).map((activity) => (
              <li key={activity.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-[10px] font-bold tabular-nums text-slate-400">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
                <span className="font-semibold text-emerald-950">{buildActivityMessage(activity, profiles)}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200/80 bg-white p-4">
        <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">Shared Expenses</h3>
        {displayRows.length === 0 ? (
          <div className="py-8 text-center">
            <ReceiptText className="mx-auto mb-2 text-emerald-600" size={28} />
            <p className="text-sm font-bold text-slate-500">No group expenses yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayRows.map((row) => {
              const expense = groupExpenseRowToExpense(row);
              return (
                <div key={row.id ?? row.local_expense_id} className="flex items-center justify-between gap-3 py-3">
                  <button
                    type="button"
                    onClick={() => onEditExpense(expense)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-black text-emerald-950">{row.title}</p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      {getGroupCategoryLabel(row.category)} · {groupExpensePayerName(row, profiles)} · {row.expense_date}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <DualCurrencyAmount
                      amountNpr={row.amount}
                      currency={currency}
                      krwPerNpr={krwPerNpr}
                      className="text-sm font-black tabular-nums text-emerald-800"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(expense)}
                      className="text-[10px] font-bold text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {canUseRemote ? (
          <div ref={sentinelRef} className="flex justify-center py-4">
            {loading ? <Loader2 className="animate-spin text-emerald-600" size={20} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
