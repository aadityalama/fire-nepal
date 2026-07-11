"use client";

import { Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DualCurrencyAmount } from "@/components/DualCurrencyAmount";
import { memberDisplayName } from "@/lib/expense-members";
import type { Currency, Expense, RoommateProfile } from "@/lib/expense-utils";
import {
  transactionTypeBadgeClass,
  transactionTypeLabel,
  type ExpenseTransactionAuditRow,
  type ExpenseTransactionRow,
} from "@/lib/transaction-history-types";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getTransactionAuditLog,
  softDeleteExpenseTransaction,
  updateExpenseTransaction,
} from "@/services/expense-transactions-supabase";

type TransactionDetailModalProps = {
  open: boolean;
  transaction: ExpenseTransactionRow | null;
  userId?: string;
  actorName?: string;
  currency: Currency;
  krwPerNpr: number;
  profiles: Record<string, RoommateProfile>;
  expenses: Expense[];
  onClose: () => void;
  onUpdated: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
};

function formatAuditAction(action: ExpenseTransactionAuditRow["action"]) {
  const labels = { created: "Created", updated: "Updated", deleted: "Deleted", restored: "Restored" };
  return labels[action];
}

export function TransactionDetailModal({
  open,
  transaction,
  userId,
  actorName,
  currency,
  krwPerNpr,
  profiles,
  expenses,
  onClose,
  onUpdated,
  onEditExpense,
  onDeleteExpense,
}: TransactionDetailModalProps) {
  const [auditLog, setAuditLog] = useState<ExpenseTransactionAuditRow[]>([]);
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setCategory(transaction.category ?? "");
    setEditing(false);
  }, [open, transaction]);

  useEffect(() => {
    if (!open || !transaction || !userId || !isSupabaseConfigured()) {
      setAuditLog([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const client = getSupabaseBrowserClient();
      const rows = await getTransactionAuditLog(client, userId, transaction.id);
      if (!cancelled) setAuditLog(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, transaction, userId]);

  if (!open || !transaction) return null;

  const linkedExpense =
    transaction.local_expense_id != null
      ? expenses.find((e) => e.id === transaction.local_expense_id)
      : undefined;

  async function handleSave() {
    if (!userId || !isSupabaseConfigured()) return;
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const updated = await updateExpenseTransaction(
        client,
        userId,
        transaction!.id,
        {
          description: description.trim(),
          amount: Number(amount),
          category: category.trim() || null,
        },
        actorName,
      );
      if (!updated) throw new Error("Transaction was not updated.");
      toast.success("Transaction updated");
      setEditing(false);
      onUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update transaction");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!userId || !isSupabaseConfigured()) return;
    if (!window.confirm("Delete this transaction from history?")) return;
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const ok = await softDeleteExpenseTransaction(client, userId, transaction!.id, actorName);
      if (!ok) throw new Error("Transaction was not deleted.");
      if (linkedExpense) onDeleteExpense(linkedExpense);
      toast.success("Transaction deleted");
      onUpdated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[1.8rem] bg-white shadow-2xl sm:rounded-[1.8rem]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-emerald-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${transactionTypeBadgeClass(transaction.transaction_type)}`}
            >
              {transactionTypeLabel(transaction.transaction_type)}
            </span>
            <h3 className="mt-2 text-lg font-black text-emerald-950">{transaction.description}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-emerald-50 p-2 text-emerald-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {editing ? (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-500">Description</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-500">Amount (NPR)</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm font-bold"
                />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-slate-500">Category</span>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-emerald-100 px-4 py-3 text-sm font-bold"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="flex-1 rounded-2xl bg-emerald-700 py-3 text-sm font-black text-white"
                >
                  Save changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-black text-emerald-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid gap-3 text-sm">
              {[
                ["Date", transaction.transaction_date],
                ["Category", transaction.category ?? "—"],
                [
                  "Amount",
                  <DualCurrencyAmount
                    key="amount"
                    amountNpr={transaction.amount}
                    krwPerNpr={krwPerNpr}
                    currency={currency}
                    size="sm"
                  />,
                ],
                ["Currency", transaction.currency],
                [
                  "Member",
                  transaction.member_id
                    ? memberDisplayName(transaction.member_id, profiles)
                    : transaction.member_name ?? "—",
                ],
                ["Created by", transaction.created_by_name ?? "—"],
                ["Created at", new Date(transaction.created_at).toLocaleString()],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between gap-4 border-b border-emerald-50 pb-2">
                  <dt className="font-bold text-slate-500">{label}</dt>
                  <dd className="text-right font-black text-emerald-950">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {!editing ? (
            <div className="flex flex-wrap gap-2">
              {linkedExpense ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditExpense(linkedExpense);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white"
                >
                  <Pencil size={14} /> Edit expense
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2.5 text-xs font-black text-white"
                >
                  <Pencil size={14} /> Edit
                </button>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          ) : null}

          <section>
            <h4 className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">Audit trail</h4>
            {auditLog.length === 0 ? (
              <p className="text-sm font-bold text-slate-500">No audit entries yet.</p>
            ) : (
              <ul className="space-y-2">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="rounded-2xl bg-emerald-50/70 px-4 py-3 text-sm">
                    <p className="font-black text-emerald-900">
                      {formatAuditAction(entry.action)} · {new Date(entry.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {entry.actor_name ?? "System"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
