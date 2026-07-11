"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Save, X } from "lucide-react";
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { IncomeEntry } from "@/components/cashflow/types";
import {
  CASHFLOW_INCOME_TYPES,
  INCOME_FREQUENCY_OPTIONS,
  normalizeIncomeFrequency,
  type CashflowIncomeTypeId,
  type IncomeFrequency,
} from "@/lib/cashflow/income-types";

export type IncomeFormState = {
  name: string;
  amount: string;
  incomeType: CashflowIncomeTypeId;
  frequency: IncomeFrequency;
  date: string;
  note: string;
};

export function defaultIncomeForm(todayIso: string): IncomeFormState {
  return {
    name: "",
    amount: "",
    incomeType: "salary",
    frequency: "monthly",
    date: todayIso,
    note: "",
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">{label}</span>
      {children}
    </label>
  );
}

export function incomeFormFromEntry(entry: IncomeEntry): IncomeFormState {
  return {
    name: entry.name,
    amount: String(entry.amount),
    incomeType: entry.incomeType,
    frequency: normalizeIncomeFrequency(entry),
    date: entry.date,
    note: entry.note ?? "",
  };
}

export function parseIncomeForm(form: IncomeFormState): Omit<IncomeEntry, "id" | "createdAt"> | null {
  const amount = Number(form.amount.replace(/,/g, "").trim());
  if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return null;
  return {
    name: form.name.trim(),
    amount: Math.round(amount),
    incomeType: form.incomeType,
    frequency: form.frequency,
    date: form.date,
    note: form.note.trim() || undefined,
  };
}

export function CashflowIncomeFormSheet({
  open,
  editingId,
  form,
  setForm,
  onClose,
  onSave,
  saving = false,
}: {
  open: boolean;
  editingId: string | null;
  form: IncomeFormState;
  setForm: Dispatch<SetStateAction<IncomeFormState>>;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  saving?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-[#020806]/85 backdrop-blur-xl"
        >
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            className="mx-auto flex h-full max-w-lg flex-col overflow-hidden bg-[#04140f] sm:max-w-xl"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
              <button type="button" onClick={onClose} className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06]" aria-label="Close">
                <X size={20} />
              </button>
              <h2 className="text-lg font-black">{editingId ? "Edit Income" : "Add Income"}</h2>
              <span className="min-w-[44px]" />
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
              <div className="space-y-4">
                <Field label="Income Name">
                  <input
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base font-bold text-white outline-none"
                    placeholder="July Salary"
                  />
                </Field>

                <Field label="Amount">
                  <div className="flex min-h-[58px] items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4">
                    <span className="mr-2 text-lg font-black text-lime-200">NPR</span>
                    <input
                      value={form.amount}
                      onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                      inputMode="numeric"
                      className="min-w-0 flex-1 bg-transparent text-2xl font-black text-white outline-none"
                      placeholder="120,000"
                    />
                  </div>
                </Field>

                <Field label="Income Type">
                  <div className="grid grid-cols-2 gap-2">
                    {CASHFLOW_INCOME_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, incomeType: type.id }))}
                        className={`min-h-[48px] rounded-2xl border px-3 text-left text-sm font-black ${
                          form.incomeType === type.id
                            ? "border-lime-300/60 bg-lime-300/18 text-white"
                            : "border-white/10 bg-white/[0.04] text-emerald-100/75"
                        }`}
                      >
                        <span className="mr-1.5">{type.emoji}</span>
                        {type.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Frequency">
                  <div className="grid grid-cols-2 gap-2">
                    {INCOME_FREQUENCY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, frequency: option.id }))}
                        className={`min-h-[44px] rounded-2xl border px-3 text-sm font-black ${
                          form.frequency === option.id
                            ? "border-lime-300/60 bg-lime-300/18 text-white"
                            : "border-white/10 bg-white/[0.04] text-emerald-100/75"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Date">
                  <input
                    type="date"
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    className="min-h-[52px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm font-bold text-white outline-none"
                  />
                </Field>

                <Field label="Notes">
                  <textarea
                    value={form.note}
                    onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white outline-none"
                    placeholder="Optional note"
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
              <button
                type="button"
                onClick={() => void onSave()}
                disabled={saving}
                className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-base font-black text-emerald-950 shadow-lg shadow-emerald-500/25 active:scale-[0.99]"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
