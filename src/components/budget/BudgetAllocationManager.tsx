"use client";

import { PieChart, Plus, Save, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { BudgetRecord } from "@/lib/budget/types";

function formatNpr(amount: number) {
  return `NPR ${Math.round(Math.max(0, amount)).toLocaleString("en-IN")}`;
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeAmountInput(raw: string) {
  return raw.replace(/[^\d]/g, "");
}

function parseAmount(raw: string) {
  if (!raw.trim()) return 0;
  const n = Number(sanitizeAmountInput(raw));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

const DONUT_COLORS = [
  "#bef264",
  "#34d399",
  "#2dd4bf",
  "#67e8f9",
  "#a3e635",
  "#4ade80",
  "#5eead4",
  "#fde047",
  "#86efac",
  "#22d3ee",
  "#c084fc",
  "#fb923c",
];

type DraftRow = {
  id: string;
  name: string;
  icon: string;
  gradient: string;
  amountInput: string;
};

export type BudgetAllocationSaveItem = {
  id: string;
  monthlyAmountNpr: number;
};

type BudgetAllocationManagerProps = {
  open: boolean;
  budgets: BudgetRecord[];
  saving?: boolean;
  onClose: () => void;
  onSave: (updates: BudgetAllocationSaveItem[]) => Promise<void>;
  onCreateBudget: () => void;
};

function AllocationDonut({
  rows,
  totalBudget,
}: {
  rows: Array<{ id: string; amount: number; color: string }>;
  totalBudget: number;
}) {
  const allocated = rows.reduce((sum, row) => sum + row.amount, 0);
  const remaining = Math.max(0, totalBudget - allocated);
  const base = totalBudget > 0 ? totalBudget : Math.max(allocated, 1);

  const stops: string[] = [];
  let cursor = 0;
  for (const row of rows) {
    if (row.amount <= 0) continue;
    const start = (cursor / base) * 100;
    cursor += row.amount;
    const end = (cursor / base) * 100;
    stops.push(`${row.color} ${start}% ${end}%`);
  }
  if (remaining > 0 && totalBudget > 0) {
    const start = (cursor / base) * 100;
    stops.push(`rgba(255,255,255,0.12) ${start}% 100%`);
  }
  if (stops.length === 0) {
    stops.push("rgba(255,255,255,0.12) 0% 100%");
  }

  const pct = totalBudget > 0 ? clampPct((allocated / totalBudget) * 100) : 0;

  return (
    <div
      className="relative mx-auto grid h-36 w-36 place-items-center rounded-full"
      style={{ background: `conic-gradient(${stops.join(", ")})` }}
      aria-label={`Allocation ${pct}%`}
    >
      <div className="grid h-[6.75rem] w-[6.75rem] place-items-center rounded-full bg-[#063326] shadow-[inset_0_0_28px_rgba(0,0,0,0.35)]">
        <div className="text-center">
          <p className="text-2xl font-black tracking-tighter text-white">{pct}%</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Allocated</p>
        </div>
      </div>
    </div>
  );
}

export function BudgetAllocationManager({
  open,
  budgets,
  saving = false,
  onClose,
  onSave,
  onCreateBudget,
}: BudgetAllocationManagerProps) {
  const titleId = useId();
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const sorted = [...budgets].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
    setDrafts(
      sorted.map((budget) => ({
        id: budget.id,
        name: budget.name,
        icon: budget.icon,
        gradient: budget.gradient,
        amountInput: String(Math.round(budget.monthlyBudgetNpr)),
      })),
    );
    setTotalBudget(sorted.reduce((sum, budget) => sum + Math.max(0, Math.round(budget.monthlyBudgetNpr)), 0));
  }, [open, budgets]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, saving]);

  const computed = useMemo(() => {
    const rows = drafts.map((draft, index) => {
      const amount = parseAmount(draft.amountInput);
      return {
        id: draft.id,
        name: draft.name,
        icon: draft.icon,
        gradient: draft.gradient,
        amountInput: draft.amountInput,
        amount,
        color: DONUT_COLORS[index % DONUT_COLORS.length],
      };
    });
    const allocated = rows.reduce((sum, row) => sum + row.amount, 0);
    const remaining = totalBudget - allocated;
    const exceeds = allocated > totalBudget && totalBudget > 0;
    const hasZero = rows.some((row) => row.amount <= 0);
    const hasNegative = rows.some((row) => row.amount < 0);
    const allocationPct = totalBudget > 0 ? clampPct((allocated / totalBudget) * 100) : 0;
    return { rows, allocated, remaining, exceeds, hasZero, hasNegative, allocationPct };
  }, [drafts, totalBudget]);

  const canSave =
    !saving &&
    computed.rows.length > 0 &&
    !computed.exceeds &&
    !computed.hasZero &&
    !computed.hasNegative &&
    totalBudget > 0;

  function updateAmount(id: string, raw: string) {
    const next = sanitizeAmountInput(raw);
    setDrafts((current) => current.map((row) => (row.id === id ? { ...row, amountInput: next } : row)));
  }

  async function handleSave() {
    if (!canSave) return;
    await onSave(computed.rows.map((row) => ({ id: row.id, monthlyAmountNpr: row.amount })));
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close budget allocation manager"
            className="absolute inset-0 bg-[#020806]/78 backdrop-blur-md"
            onClick={() => {
              if (!saving) onClose();
            }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 48, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 36, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.85rem] border border-emerald-300/15 bg-[#04140f]/96 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:max-h-[88vh] sm:rounded-[2rem]"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20 sm:hidden" />

            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 pb-4 pt-3 sm:px-5 sm:pt-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-lime-300 text-emerald-950 shadow-lg shadow-emerald-500/20">
                    <PieChart size={18} strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0">
                    <h2 id={titleId} className="truncate text-lg font-black tracking-tight text-white sm:text-xl">
                      Budget Allocation Manager
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold text-emerald-100/55 sm:text-sm">
                      Plan how your monthly budget is distributed.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label="Close"
                className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-full bg-white/[0.06] text-emerald-100 transition active:scale-95 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-5">
              {computed.rows.length === 0 ? (
                <div className="rounded-[1.6rem] border border-dashed border-emerald-300/25 bg-gradient-to-br from-white/[0.06] via-emerald-400/10 to-lime-300/10 px-5 py-10 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.25rem] bg-gradient-to-br from-emerald-300/25 to-lime-300/20 text-3xl">
                    🐷
                  </div>
                  <p className="mt-4 text-lg font-black text-white">No budgets created yet.</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm font-semibold text-emerald-100/55">
                    Create a budget category to start planning your monthly allocation.
                  </p>
                  <button
                    type="button"
                    onClick={onCreateBudget}
                    className="mt-6 inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 px-6 text-base font-black text-emerald-950 shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
                  >
                    <Plus size={20} strokeWidth={2.5} /> Create Budget
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <section className="relative overflow-hidden rounded-[1.6rem] border border-emerald-300/20 bg-gradient-to-br from-emerald-500/20 via-white/[0.05] to-lime-300/10 p-4">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-lime-300/20 blur-3xl" aria-hidden />
                    <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 text-center sm:text-left">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">
                          Total Monthly Budget
                        </p>
                        <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-lime-100">{formatNpr(totalBudget)}</p>
                      </div>
                      <AllocationDonut
                        rows={computed.rows.map((row) => ({ id: row.id, amount: row.amount, color: row.color }))}
                        totalBudget={totalBudget}
                      />
                    </div>
                  </section>

                  <section className="space-y-3">
                    {computed.rows.map((row) => {
                      const pct = totalBudget > 0 ? ((row.amount / totalBudget) * 100).toFixed(1) : "0.0";
                      return (
                        <article
                          key={row.id}
                          className="rounded-[1.45rem] border border-white/10 bg-white/[0.055] p-3.5 backdrop-blur-xl"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${row.gradient} text-xl shadow-lg`}
                            >
                              {row.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h3 className="truncate text-base font-black text-white">{row.name}</h3>
                                  <p className="mt-0.5 text-sm font-black tabular-nums text-emerald-50">
                                    {formatNpr(row.amount)}
                                  </p>
                                </div>
                                <span className="shrink-0 rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-1 text-xs font-black text-lime-100">
                                  {pct}%
                                </span>
                              </div>
                              <label className="mt-3 flex min-h-[48px] items-center rounded-2xl border border-white/10 bg-black/25 px-3">
                                <span className="mr-2 text-sm font-black text-lime-200">NPR</span>
                                <input
                                  value={row.amountInput}
                                  onChange={(event) => updateAmount(row.id, event.target.value)}
                                  inputMode="numeric"
                                  aria-label={`Edit amount for ${row.name}`}
                                  className="min-w-0 flex-1 bg-transparent text-base font-black tabular-nums text-white outline-none placeholder:text-emerald-100/25"
                                  placeholder="0"
                                />
                              </label>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </section>

                  {computed.exceeds ? (
                    <p
                      role="alert"
                      className="rounded-2xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100"
                    >
                      Allocated budget exceeds your monthly budget.
                    </p>
                  ) : null}

                  {computed.hasZero && !computed.exceeds ? (
                    <p className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-50">
                      Each category needs a budget greater than zero.
                    </p>
                  ) : null}

                  <section className="rounded-[1.55rem] border border-lime-300/20 bg-gradient-to-br from-white/[0.07] via-emerald-400/10 to-lime-300/10 p-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Allocated</p>
                        <p className="mt-1 text-sm font-black tabular-nums text-white sm:text-base">
                          {formatNpr(computed.allocated)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Remaining</p>
                        <p
                          className={`mt-1 text-sm font-black tabular-nums sm:text-base ${
                            computed.remaining < 0 ? "text-red-200" : "text-lime-100"
                          }`}
                        >
                          {formatNpr(Math.max(0, computed.remaining))}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Allocation</p>
                        <p className="mt-1 text-sm font-black tabular-nums text-lime-100 sm:text-base">
                          {computed.allocationPct}%
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {computed.rows.length > 0 ? (
              <footer className="shrink-0 border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-5">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!canSave}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-base font-black text-emerald-950 shadow-lg shadow-emerald-500/25 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <Save size={18} /> {saving ? "Saving..." : "Save Allocation"}
                </button>
              </footer>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
