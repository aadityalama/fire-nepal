"use client";

import { Receipt, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import {
  FireBizEmptyState,
  FireBizGlassCard,
  FireBizInput,
  FireBizPageActions,
  FireBizPrimaryButton,
  FireBizSecondaryButton,
} from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizExpensesPage() {
  const copy = useFireBizCopy();
  const ex = copy.expenses;
  const { transactions, expenseCategories, loading, saveExpense, deleteExpense, addExpenseCategory } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  const expenses = useMemo(
    () => transactions.filter((t) => t.transaction_type === "expense"),
    [transactions],
  );

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState("");
  const [partyName, setPartyName] = useState("");
  const [notes, setNotes] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const categoryMap = useMemo(
    () => new Map(expenseCategories.map((c) => [c.id, c.name])),
    [expenseCategories],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error(ex.invalidAmount);
      return;
    }
    setSaving(true);
    try {
      await saveExpense({
        id: editId ?? undefined,
        amount: amt,
        transaction_date: date,
        expense_category_id: categoryId || null,
        party_name: partyName || null,
        notes: notes || null,
      });
      toast.success(editId ? ex.updated : ex.added);
      setAmount("");
      setPartyName("");
      setNotes("");
      setEditId(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={ex.title} subtitle={ex.subtitle} />

      <FireBizGlassCard title={editId ? ex.editExpense : ex.addExpense} icon={Receipt}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => void handleSubmit(e)}>
          <FireBizInput label={ex.amount} value={amount} onChange={setAmount} type="number" />
          <FireBizInput label={ex.date} value={date} onChange={setDate} type="date" />
          <label className="block sm:col-span-2">
            <span className={`mb-1 block text-xs font-bold ${light ? "text-slate-700" : "text-emerald-200/80"}`}>{ex.category}</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={`w-full rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                light ? "border-emerald-200/80 bg-white text-slate-900" : "border-emerald-400/20 bg-black/30 text-white"
              }`}
            >
              <option value="">{ex.selectCategory}</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <FireBizInput label={ex.party} value={partyName} onChange={setPartyName} />
          <FireBizInput label={ex.notes} value={notes} onChange={setNotes} />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <FireBizPrimaryButton type="submit" disabled={saving}>{saving ? copy.common.loading : editId ? ex.saveEdit : ex.save}</FireBizPrimaryButton>
            {editId ? (
              <FireBizSecondaryButton type="button" onClick={() => { setEditId(null); setAmount(""); }}>{copy.common.cancel}</FireBizSecondaryButton>
            ) : null}
          </div>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-emerald-400/10 pt-4">
          <FireBizInput label={ex.newCategory} value={newCategory} onChange={setNewCategory} />
          <div className="flex items-end">
            <FireBizSecondaryButton
              onClick={() => {
                if (!newCategory.trim()) return;
                void addExpenseCategory(newCategory.trim()).then(() => {
                  toast.success(ex.categoryAdded);
                  setNewCategory("");
                });
              }}
            >
              {ex.addCategory}
            </FireBizSecondaryButton>
          </div>
        </div>
      </FireBizGlassCard>

      <FireBizGlassCard title={ex.list} icon={Receipt}>
        {loading ? (
          <p className="text-sm font-semibold text-emerald-200/60">{copy.common.loading}</p>
        ) : expenses.length === 0 ? (
          <FireBizEmptyState message={ex.empty} />
        ) : (
          <ul className="space-y-2">
            {expenses.map((row) => (
              <li key={row.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"}`}>
                <div>
                  <p className="text-sm font-bold">{categoryMap.get(row.expense_category_id ?? "") ?? row.party_name ?? ex.uncategorized}</p>
                  <p className="text-[11px] opacity-70">{row.transaction_date}{row.notes ? ` · ${row.notes}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black tabular-nums text-rose-300">{formatBizNpr(Number(row.amount))}</p>
                  <button type="button" className="rounded-lg p-2 text-emerald-400 hover:bg-emerald-500/10" onClick={() => {
                    setEditId(row.id);
                    setAmount(String(row.amount));
                    setDate(row.transaction_date);
                    setCategoryId(row.expense_category_id ?? "");
                    setPartyName(row.party_name ?? "");
                    setNotes(row.notes ?? "");
                  }}>{ex.edit}</button>
                  <button type="button" className="rounded-lg p-2 text-rose-400 hover:bg-rose-500/10" onClick={() => void deleteExpense(row.id).then(() => toast.success(ex.deleted))}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </FireBizGlassCard>
    </div>
  );
}
