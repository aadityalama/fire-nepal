"use client";

import {
  ArrowLeft,
  Bell,
  Bot,
  Flame,
  PieChart,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import {
  BudgetAllocationManager,
  type BudgetAllocationSaveItem,
} from "@/components/budget/BudgetAllocationManager";
import { BudgetDetailsSheet, getBudgetStatus } from "@/components/budget/BudgetDetailsSheet";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FinanceCategoryPicker } from "@/components/finance/FinanceCategoryPicker";
import { createBudgetRecord, deleteBudgetRecord, fetchBudgetRecords, updateBudgetRecord } from "@/lib/budget/budget-api";
import {
  BUDGET_NOTES_MAX_LENGTH,
  BUDGET_NOTIFICATION_OPTIONS,
  defaultBudgetNotificationSettings,
  sanitizeBudgetNotes,
  sortBudgetRecords,
  type BudgetAiRecommendation,
  type BudgetNotificationSettings,
  type BudgetPeriod,
  type BudgetRecord,
  type CreateBudgetInput,
} from "@/lib/budget/types";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import {
  DEFAULT_FINANCE_CATEGORY_ID,
  getFinanceCategoryEmoji,
  getFinanceCategoryLabel,
  normalizeFinanceCategory,
  type FinanceCategoryId,
} from "@/lib/finance/categories";

const BudgetMonthlyTrendChart = dynamic(
  () => import("@/components/budget/BudgetMonthlyTrendChart").then((mod) => mod.BudgetMonthlyTrendChart),
  { ssr: false, loading: () => null },
);

const PLACEHOLDER_AI_RECOMMENDATION: BudgetAiRecommendation = {
  title: "FIRE AI Recommendation",
  message:
    "Add budgets or connect spending history to unlock a personalized recommendation. No financial estimate is shown until user data is available.",
  available: false,
};

function formatNpr(amount: number) {
  return `NPR ${Math.round(amount).toLocaleString("en-IN")}`;
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function periodAmount(monthlyAmount: number, period: BudgetPeriod) {
  return period === "Yearly" ? monthlyAmount * 12 : monthlyAmount;
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
        checked ? "border-emerald-300/50 bg-emerald-400/15" : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <span className="text-sm font-bold text-emerald-50">{label}</span>
      <span className={`relative h-8 w-14 rounded-full p-1 transition ${checked ? "bg-emerald-400" : "bg-white/18"}`}>
        <span
          className={`block h-6 w-6 rounded-full bg-white shadow-lg transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function SegmentedControl({
  value,
  onChange,
  compact = false,
}: {
  value: BudgetPeriod;
  onChange: (value: BudgetPeriod) => void;
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 rounded-full bg-emerald-950/70 p-1 ring-1 ring-white/10 ${compact ? "w-full" : "w-full sm:w-64"}`}>
      {(["Monthly", "Yearly"] as const).map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          className={`min-h-[44px] rounded-full px-4 text-sm font-black transition active:scale-[0.98] ${
            value === period
              ? "bg-gradient-to-r from-emerald-300 to-lime-300 text-emerald-950 shadow-lg shadow-emerald-500/20"
              : "text-emerald-100/70"
          }`}
        >
          {period}
        </button>
      ))}
    </div>
  );
}

function allocatePercentsThatSumTo100(amounts: number[]): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0) return amounts.map(() => 0);

  // Largest-remainder in tenths so displayed one-decimal percentages always sum to 100.0
  const exactTenths = amounts.map((amount) => (amount / total) * 1000);
  const floors = exactTenths.map((value) => Math.floor(value));
  let remainder = 1000 - floors.reduce((sum, value) => sum + value, 0);
  const ranked = exactTenths
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction);
  const adjusted = [...floors];
  for (let i = 0; i < remainder; i += 1) {
    adjusted[ranked[i % ranked.length].index] += 1;
  }
  return adjusted.map((tenths) => tenths / 10);
}

const ALLOCATION_COLORS = [
  "#bef264",
  "#34d399",
  "#2dd4bf",
  "#67e8f9",
  "#a3e635",
  "#4ade80",
  "#fde047",
  "#fb923c",
  "#86efac",
  "#22d3ee",
  "#c084fc",
  "#f472b6",
];

function BudgetAllocationDashboard({
  budgets,
  period,
  light,
}: {
  budgets: BudgetRecord[];
  period: BudgetPeriod;
  light: boolean;
}) {
  const slices = useMemo(() => {
    const rows = budgets.map((budget) => ({
      id: budget.id,
      name: budget.name,
      icon: budget.icon,
      gradient: budget.gradient,
      amount: periodAmount(budget.monthlyBudgetNpr, period),
    }));
    const percents = allocatePercentsThatSumTo100(rows.map((row) => row.amount));
    return rows.map((row, index) => ({
      ...row,
      percent: percents[index] ?? 0,
      color: ALLOCATION_COLORS[index % ALLOCATION_COLORS.length],
    }));
  }, [budgets, period]);

  const totalBudget = slices.reduce((sum, slice) => sum + slice.amount, 0);
  const hasAllocation = slices.length > 0 && totalBudget > 0;
  const allocatedPct = hasAllocation ? 100 : 0;

  const donutStops = useMemo(() => {
    if (!hasAllocation) return "rgba(255,255,255,0.12) 0% 100%";
    let cursor = 0;
    const stops: string[] = [];
    for (const slice of slices) {
      const start = cursor;
      cursor += slice.percent;
      stops.push(`${slice.color} ${start}% ${cursor}%`);
    }
    return stops.join(", ");
  }, [hasAllocation, slices]);

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border p-4 shadow-[0_28px_90px_-48px_rgba(16,185,129,0.55)] sm:p-5 lg:p-6 ${
        light
          ? "border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/80 to-white"
          : "border-emerald-200/15 bg-gradient-to-br from-emerald-500/18 via-emerald-950/90 to-[#03110d]"
      }`}
    >
      <div className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-lime-300/16 blur-3xl" aria-hidden />
      <div className="relative mb-4">
        <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700/80" : "text-emerald-100/55"}`}>
          Budget Allocation
        </p>
        <h2 className={`mt-1 text-xl font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>
          How your budget is distributed
        </h2>
      </div>

      <div className="relative grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="mx-auto flex flex-col items-center lg:mx-0">
          <div
            className="relative grid h-44 w-44 place-items-center rounded-full sm:h-52 sm:w-52"
            style={{ background: `conic-gradient(${donutStops})` }}
            aria-label={hasAllocation ? `Budget allocation ${allocatedPct}%` : "No budget allocated yet"}
          >
            <div
              className={`grid h-[8.15rem] w-[8.15rem] place-items-center rounded-full shadow-[inset_0_0_32px_rgba(0,0,0,0.35)] sm:h-[9.6rem] sm:w-[9.6rem] ${
                light ? "bg-emerald-950" : "bg-[#063326]"
              }`}
            >
              {hasAllocation ? (
                <div className="text-center">
                  <p className="text-3xl font-black tracking-tighter text-white sm:text-4xl">{allocatedPct}%</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/55">Allocated</p>
                </div>
              ) : (
                <div className="max-w-[6.5rem] px-2 text-center">
                  <p className="text-xs font-black leading-snug text-emerald-100/80">No budget allocated yet.</p>
                </div>
              )}
            </div>
          </div>
          {hasAllocation ? (
            <p className={`mt-3 text-center text-xs font-semibold ${light ? "text-emerald-800/70" : "text-emerald-100/55"}`}>
              Total {formatNpr(totalBudget)}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-3">
          {!hasAllocation ? (
            <div
              className={`rounded-2xl border border-dashed px-4 py-8 text-center text-sm font-semibold ${
                light ? "border-emerald-200 text-emerald-800/70" : "border-emerald-300/20 text-emerald-100/55"
              }`}
            >
              Create budgets to see category allocation here.
            </div>
          ) : (
            slices.map((slice) => (
              <div
                key={slice.id}
                className={`rounded-2xl border p-3 ${light ? "border-emerald-200/70 bg-white/85" : "border-white/10 bg-white/[0.05]"}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl"
                    style={{ backgroundColor: `${slice.color}28` }}
                  >
                    {slice.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-black ${light ? "text-slate-900" : "text-white"}`}>{slice.name}</p>
                        <p className={`mt-0.5 text-xs font-black tabular-nums ${light ? "text-emerald-800" : "text-emerald-50"}`}>
                          {formatNpr(slice.amount)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-100"}`}>
                        {slice.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className={`mt-2.5 h-2 overflow-hidden rounded-full ${light ? "bg-emerald-100" : "bg-white/10"}`}>
                      <div
                        className="h-full rounded-full transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.min(100, slice.percent)}%`, backgroundColor: slice.color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function BudgetCard({
  budget,
  period,
  index,
  totalBudget,
  onOpen,
}: {
  budget: BudgetRecord;
  period: BudgetPeriod;
  index: number;
  totalBudget: number;
  onOpen: (budget: BudgetRecord) => void;
}) {
  const amount = periodAmount(budget.monthlyBudgetNpr, period);
  const spent = periodAmount(budget.monthlySpentNpr, period);
  const remaining = Math.max(0, amount - spent);
  const pct = amount > 0 ? clampPct((spent / amount) * 100) : 0;
  const status = getBudgetStatus(spent, amount);
  const daysLabel =
    period === "Yearly" ? `${budget.daysRemaining + 334} days left` : `${budget.daysRemaining} days left`;
  const allocationPct = totalBudget > 0 ? (amount / totalBudget) * 100 : 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -28, scale: 0.98 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="w-full min-w-0 overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[0.06] shadow-[0_18px_60px_-34px_rgba(0,0,0,0.8)] backdrop-blur-xl motion-safe:hover:-translate-y-0.5 motion-safe:transition-transform"
    >
      <button
        type="button"
        onClick={() => onOpen(budget)}
        className="w-full min-w-0 p-3.5 text-left transition active:scale-[0.99] sm:p-4"
        aria-label={`Open details for ${budget.name}`}
      >
        <div className="flex w-full min-w-0 items-start gap-3">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${budget.gradient} text-xl shadow-lg`}>
            {budget.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-black text-white">{budget.name}</h3>
                <p className="mt-0.5 truncate text-xs font-bold text-emerald-100/55">
                  {getFinanceCategoryLabel(budget.category)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${status.className}`}>
                {status.label}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/8 bg-black/15 px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/45">Budget</p>
                <p className="mt-1 truncate text-xs font-black tabular-nums text-white">{formatNpr(amount)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/15 px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/45">Spent</p>
                <p className="mt-1 truncate text-xs font-black tabular-nums text-emerald-50">{formatNpr(spent)}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/15 px-2.5 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/45">Left</p>
                <p className="mt-1 truncate text-xs font-black tabular-nums text-lime-100">{formatNpr(remaining)}</p>
              </div>
            </div>

            <div className="mt-3">
              <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2 text-[11px] font-black">
                <span className="text-emerald-100/55">{pct}% used · {daysLabel}</span>
                <span className="shrink-0 text-lime-100">{allocationPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full max-w-full rounded-full bg-gradient-to-r ${budget.gradient} shadow-[0_0_22px_rgba(190,242,100,0.25)] transition-[width] duration-700 ease-out`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </button>
    </motion.article>
  );
}

function BudgetEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.75rem] border border-dashed border-emerald-300/25 bg-gradient-to-br from-white/[0.06] via-emerald-400/10 to-lime-300/10 px-6 py-10 text-center backdrop-blur-xl"
    >
      <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.5rem] bg-gradient-to-br from-emerald-300/25 to-lime-300/20 text-4xl shadow-lg shadow-emerald-500/10">
        🐷
      </div>
      <h3 className="mt-5 text-xl font-black tracking-tight text-white">No budgets yet</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-relaxed text-emerald-100/55">
        Create your first monthly budget to start tracking your finances.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex min-h-[52px] w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 px-6 text-base font-black text-emerald-950 shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
      >
        <Plus size={20} strokeWidth={2.5} /> Create Budget
      </button>
    </motion.div>
  );
}

function DeleteBudgetDialog({
  open,
  onClose,
  onConfirm,
  deleting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#020806]/80 p-4 backdrop-blur-md sm:items-center">
      <button type="button" aria-label="Close delete confirmation" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#04140f] p-5 shadow-2xl"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-500/15 text-2xl">
          <Trash2 size={24} className="text-red-300" />
        </div>
        <h3 className="mt-4 text-center text-xl font-black text-white">Delete Budget?</h3>
        <p className="mt-2 text-center text-sm font-semibold leading-relaxed text-emerald-100/55">
          This will permanently remove this budget.
          <br />
          This action cannot be undone.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="min-h-[52px] rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-black text-emerald-100/80 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="min-h-[52px] rounded-2xl bg-red-500 text-sm font-black text-white shadow-lg shadow-red-500/25 disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function BudgetNotesField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 96), 220)}px`;
  }, [value]);

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Notes</p>
        <span className="text-[11px] font-bold text-emerald-100/45">
          {value.length}/{BUDGET_NOTES_MAX_LENGTH}
        </span>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, BUDGET_NOTES_MAX_LENGTH))}
        rows={3}
        className="min-h-[96px] w-full resize-y overflow-x-hidden overflow-y-auto break-words whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold leading-relaxed text-white outline-none placeholder:text-emerald-100/30 focus:border-emerald-300/45"
        placeholder={"Example:\n• Buy every month\n• SIP allocation\n• Personal reminder..."}
        aria-label="Budget notes"
      />
    </section>
  );
}

function budgetFormDefaults(initialBudget?: BudgetRecord | null) {
  if (!initialBudget) {
    return {
      period: "Monthly" as BudgetPeriod,
      amountInput: "80000",
      name: "",
      category: DEFAULT_FINANCE_CATEGORY_ID,
      notes: "",
      enabledAlerts: defaultBudgetNotificationSettings(),
      gradient: "from-emerald-300 to-lime-300",
      aiRecommendation: PLACEHOLDER_AI_RECOMMENDATION,
    };
  }

  return {
    period: initialBudget.period,
    amountInput: String(Math.round(initialBudget.amountNpr)),
    name: initialBudget.name,
    category: normalizeFinanceCategory(initialBudget.category),
    notes: initialBudget.notes ?? "",
    enabledAlerts: { ...defaultBudgetNotificationSettings(), ...initialBudget.notificationSettings },
    gradient: initialBudget.gradient,
    aiRecommendation: initialBudget.aiRecommendation ?? PLACEHOLDER_AI_RECOMMENDATION,
  };
}

function BudgetFormModal({
  open,
  mode,
  initialBudget,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialBudget?: BudgetRecord | null;
  onClose: () => void;
  onSave: (input: CreateBudgetInput) => Promise<void>;
  saving: boolean;
}) {
  const defaults = budgetFormDefaults(mode === "edit" ? initialBudget : null);
  const [period, setPeriod] = useState<BudgetPeriod>(defaults.period);
  const [amountInput, setAmountInput] = useState(defaults.amountInput);
  const [name, setName] = useState(defaults.name);
  const [category, setCategory] = useState<FinanceCategoryId>(defaults.category);
  const [notes, setNotes] = useState(defaults.notes);
  const [enabledAlerts, setEnabledAlerts] = useState<BudgetNotificationSettings>(defaults.enabledAlerts);
  const [gradient] = useState(defaults.gradient);
  const [aiRecommendation] = useState<BudgetAiRecommendation | null>(defaults.aiRecommendation);

  useEffect(() => {
    if (!open) return;
    const next = budgetFormDefaults(mode === "edit" ? initialBudget : null);
    setPeriod(next.period);
    setAmountInput(next.amountInput);
    setName(next.name);
    setCategory(next.category);
    setNotes(next.notes);
    setEnabledAlerts(next.enabledAlerts);
  }, [open, mode, initialBudget]);

  if (!open) return null;

  const parsedAmount = Number(amountInput.replace(/[^\d]/g, "")) || 0;
  const isEdit = mode === "edit";

  async function handleSave() {
    if (!parsedAmount || saving) return;
    await onSave({
      name: name.trim() || category,
      category,
      icon: getFinanceCategoryEmoji(category),
      gradient,
      period,
      amountNpr: parsedAmount,
      notes: sanitizeBudgetNotes(notes),
      notificationSettings: enabledAlerts,
      aiRecommendation,
    });
    if (!isEdit) {
      setName("");
      setAmountInput("80000");
      setPeriod("Monthly");
      setCategory(DEFAULT_FINANCE_CATEGORY_ID);
      setNotes("");
      setEnabledAlerts(defaultBudgetNotificationSettings());
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#020806]/85 p-0 text-white backdrop-blur-xl sm:p-5">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex h-full max-w-2xl flex-col overflow-hidden bg-[#04140f] shadow-2xl shadow-black/60 sm:rounded-[2rem] sm:border sm:border-emerald-300/15"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
          <button
            type="button"
            onClick={onClose}
            aria-label={isEdit ? "Close edit budget" : "Close add budget"}
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded-full bg-white/[0.06] text-emerald-100 transition active:scale-95"
          >
            <X size={20} />
          </button>
          <h2 className="text-lg font-black tracking-tight">{isEdit ? "Edit Budget" : "Add Budget"}</h2>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !parsedAmount}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={16} /> {saving ? (isEdit ? "Updating..." : "Saving...") : isEdit ? "Update Budget" : "Save"}
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
          <div className="space-y-5">
            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Budget Amount</p>
              <label className="mt-3 flex min-h-[64px] items-center rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4">
                <span className="mr-2 text-xl font-black text-lime-200">NPR</span>
                <input
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  inputMode="numeric"
                  className="min-w-0 flex-1 bg-transparent text-3xl font-black tracking-tight text-white outline-none placeholder:text-emerald-100/25"
                  placeholder="80,000"
                  aria-label="Budget amount in NPR"
                />
              </label>
            </section>

            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Budget Name</p>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-3 min-h-[54px] w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base font-bold text-white outline-none placeholder:text-emerald-100/28 focus:border-emerald-300/45"
                placeholder="Food, Living, Transport..."
              />
            </section>

            <FinanceCategoryPicker value={category} onChange={setCategory} />

            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Period</p>
              <SegmentedControl value={period} onChange={setPeriod} compact />
            </section>

            <BudgetNotesField value={notes} onChange={setNotes} />

            <section className="rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Notifications</p>
                <Bell size={17} className="text-lime-200" />
              </div>
              <div className="space-y-2">
                {BUDGET_NOTIFICATION_OPTIONS.map((option) => (
                  <ToggleSwitch
                    key={option}
                    label={option}
                    checked={enabledAlerts[option]}
                    onChange={() => setEnabledAlerts((prev) => ({ ...prev, [option]: !prev[option] }))}
                  />
                ))}
              </div>
            </section>

            <section className="relative overflow-hidden rounded-[1.6rem] border border-lime-300/20 bg-gradient-to-br from-emerald-400/18 via-white/[0.06] to-lime-300/10 p-4">
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-lime-300/20 blur-3xl" aria-hidden />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-300 text-emerald-950">
                    <Bot size={19} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white">🔥 FIRE AI Recommendation</h3>
                    <p className="text-xs font-semibold text-emerald-100/60">Based on your recent spending patterns.</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/18 p-4">
                  <p className="text-sm font-bold leading-relaxed text-emerald-50">
                    {aiRecommendation?.message ??
                      "Add budgets or connect spending history to unlock a personalized recommendation. No financial estimate is shown until user data is available."}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function BudgetWorkspacePage() {
  const { user } = useProductAuth();
  const { resolvedTheme } = useFireTheme();
  const [period, setPeriod] = useState<BudgetPeriod>("Monthly");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingBudget, setEditingBudget] = useState<BudgetRecord | null>(null);
  const [detailBudget, setDetailBudget] = useState<BudgetRecord | null>(null);
  const [deletingBudget, setDeletingBudget] = useState<BudgetRecord | null>(null);
  const [chartsReady, setChartsReady] = useState(false);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);
  const [deletingBudgetBusy, setDeletingBudgetBusy] = useState(false);
  const [allocationOpen, setAllocationOpen] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const light = resolvedTheme === "light";

  const openCreateForm = useCallback(() => {
    setFormMode("create");
    setEditingBudget(null);
    setAllocationOpen(false);
    setFormOpen(true);
  }, []);

  const openEditForm = useCallback((budget: BudgetRecord) => {
    setFormMode("edit");
    setEditingBudget(budget);
    setDetailBudget(null);
    setFormOpen(true);
  }, []);

  const openDetailBudget = useCallback((budget: BudgetRecord) => {
    setDetailBudget(budget);
  }, []);

  const reloadBudgets = useCallback(async () => {
    const records = await fetchBudgetRecords();
    setBudgets(sortBudgetRecords(records));
  }, []);

  useEffect(() => {
    if (!user) {
      setBudgets([]);
      setLoadingBudgets(false);
      return;
    }

    let alive = true;
    setLoadingBudgets(true);
    void reloadBudgets()
      .catch((error) => {
        if (!alive) return;
        toast.error(error instanceof Error ? error.message : "Could not load budgets.");
        setBudgets([]);
      })
      .finally(() => {
        if (alive) setLoadingBudgets(false);
      });

    return () => {
      alive = false;
    };
  }, [user, reloadBudgets]);

  const handleSaveBudget = useCallback(
    async (input: CreateBudgetInput) => {
      const optimisticId = `temp-${Date.now()}`;
      const optimisticRecord: BudgetRecord = {
        id: optimisticId,
        name: input.name,
        icon: input.icon,
        category: input.category,
        period: input.period,
        amountNpr: input.amountNpr,
        monthlyBudgetNpr: input.period === "Yearly" ? Math.round(input.amountNpr / 12) : input.amountNpr,
        monthlySpentNpr: 0,
        daysRemaining: input.period === "Yearly" ? 365 : 30,
        gradient: input.gradient,
        notes: sanitizeBudgetNotes(input.notes ?? ""),
        notificationSettings: input.notificationSettings,
        aiRecommendation: input.aiRecommendation,
        sortOrder: budgets.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSavingBudget(true);
      setBudgets((prev) => sortBudgetRecords([...prev, optimisticRecord]));

      try {
        const saved = await createBudgetRecord(input);
        setBudgets((prev) =>
          sortBudgetRecords(prev.map((item) => (item.id === optimisticId ? saved : item))),
        );
        await reloadBudgets();
        toast.success("Budget saved successfully");
      } catch (error) {
        setBudgets((prev) => prev.filter((item) => item.id !== optimisticId));
        toast.error(error instanceof Error ? error.message : "Could not save budget.");
        throw error;
      } finally {
        setSavingBudget(false);
      }
    },
    [budgets.length, reloadBudgets],
  );

  const handleUpdateBudget = useCallback(
    async (input: CreateBudgetInput) => {
      if (!editingBudget) return;

      const monthlyBudgetNpr = input.period === "Yearly" ? Math.round(input.amountNpr / 12) : Math.round(input.amountNpr);
      const optimisticRecord: BudgetRecord = {
        ...editingBudget,
        name: input.name,
        icon: input.icon,
        category: input.category,
        period: input.period,
        amountNpr: input.amountNpr,
        monthlyBudgetNpr,
        daysRemaining: input.period === "Yearly" ? 365 : editingBudget.daysRemaining,
        gradient: input.gradient,
        notes: sanitizeBudgetNotes(input.notes ?? ""),
        notificationSettings: input.notificationSettings,
        aiRecommendation: input.aiRecommendation,
        updatedAt: new Date().toISOString(),
      };

      setSavingBudget(true);
      setBudgets((prev) => sortBudgetRecords(prev.map((item) => (item.id === editingBudget.id ? optimisticRecord : item))));

      try {
        await updateBudgetRecord(editingBudget.id, input);
        await reloadBudgets();
        toast.success("Budget updated successfully");
        setEditingBudget(null);
      } catch (error) {
        await reloadBudgets();
        toast.error(error instanceof Error ? error.message : "Could not update budget.");
        throw error;
      } finally {
        setSavingBudget(false);
      }
    },
    [editingBudget, reloadBudgets],
  );

  const handleDeleteBudget = useCallback(async () => {
    if (!deletingBudget) return;

    const removedId = deletingBudget.id;
    const previousBudgets = budgets;
    setDeletingBudgetBusy(true);
    // Remove immediately so summary, allocation chart, active count, and AI panel update.
    setBudgets((prev) => prev.filter((item) => item.id !== removedId));
    setDetailBudget((prev) => (prev?.id === removedId ? null : prev));

    try {
      const result = await deleteBudgetRecord(removedId);
      setDeletingBudget(null);
      if (result.alreadyDeleted) {
        toast.message("The budget has already been deleted.");
      } else {
        toast.success("Budget deleted");
      }
      // Reconcile with server so soft-deleted rows never linger in local state.
      await reloadBudgets();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not delete budget.";
      if (/already been deleted/i.test(message)) {
        setDeletingBudget(null);
        setDetailBudget((prev) => (prev?.id === removedId ? null : prev));
        toast.message("The budget has already been deleted.");
        try {
          await reloadBudgets();
        } catch {
          setBudgets((prev) => prev.filter((item) => item.id !== removedId));
        }
      } else {
        setBudgets(previousBudgets);
        try {
          await reloadBudgets();
        } catch {
          /* keep optimistic restore */
        }
        toast.error(message);
      }
    } finally {
      setDeletingBudgetBusy(false);
    }
  }, [budgets, deletingBudget, reloadBudgets]);

  const handleDuplicateBudget = useCallback(
    async (budget: BudgetRecord) => {
      setDetailBudget(null);
      const input: CreateBudgetInput = {
        name: `${budget.name} (Copy)`,
        category: budget.category,
        icon: budget.icon,
        gradient: budget.gradient,
        period: budget.period,
        amountNpr: budget.amountNpr,
        notes: budget.notes,
        notificationSettings: budget.notificationSettings,
        aiRecommendation: budget.aiRecommendation,
      };
      try {
        await handleSaveBudget(input);
      } catch {
        /* toast already shown */
      }
    },
    [handleSaveBudget],
  );

  const handleFormSave = useCallback(
    async (input: CreateBudgetInput) => {
      if (formMode === "edit") {
        await handleUpdateBudget(input);
        return;
      }
      await handleSaveBudget(input);
    },
    [formMode, handleSaveBudget, handleUpdateBudget],
  );

  const handleSaveAllocations = useCallback(
    async (updates: BudgetAllocationSaveItem[]) => {
      const byId = new Map(budgets.map((budget) => [budget.id, budget]));
      const changed = updates.filter((update) => {
        const current = byId.get(update.id);
        if (!current) return false;
        return Math.round(current.monthlyBudgetNpr) !== Math.round(update.monthlyAmountNpr);
      });

      if (changed.length === 0) {
        setAllocationOpen(false);
        toast.success("Allocation unchanged");
        return;
      }

      setSavingAllocation(true);
      setBudgets((prev) =>
        sortBudgetRecords(
          prev.map((budget) => {
            const update = changed.find((item) => item.id === budget.id);
            if (!update) return budget;
            const monthlyBudgetNpr = Math.round(update.monthlyAmountNpr);
            const amountNpr = budget.period === "Yearly" ? monthlyBudgetNpr * 12 : monthlyBudgetNpr;
            return {
              ...budget,
              amountNpr,
              monthlyBudgetNpr,
              updatedAt: new Date().toISOString(),
            };
          }),
        ),
      );

      try {
        await Promise.all(
          changed.map((update) => {
            const current = byId.get(update.id);
            if (!current) {
              return Promise.reject(new Error("Budget not found."));
            }
            const monthlyBudgetNpr = Math.round(update.monthlyAmountNpr);
            const amountNpr = current.period === "Yearly" ? monthlyBudgetNpr * 12 : monthlyBudgetNpr;
            return updateBudgetRecord(update.id, {
              name: current.name,
              category: current.category,
              icon: current.icon,
              gradient: current.gradient,
              period: current.period,
              amountNpr,
              notes: current.notes,
              notificationSettings: current.notificationSettings,
              aiRecommendation: current.aiRecommendation,
            });
          }),
        );
        await reloadBudgets();
        toast.success("Budget allocation saved");
        setAllocationOpen(false);
      } catch (error) {
        await reloadBudgets();
        toast.error(error instanceof Error ? error.message : "Could not save allocation.");
        throw error;
      } finally {
        setSavingAllocation(false);
      }
    },
    [budgets, reloadBudgets],
  );

  useEffect(() => {
    const id = window.setTimeout(() => setChartsReady(true), 480);
    return () => window.clearTimeout(id);
  }, []);

  const totals = useMemo(() => {
    const totalBudget = budgets.reduce((sum, item) => sum + periodAmount(item.monthlyBudgetNpr, period), 0);
    const totalSpent = budgets.reduce((sum, item) => sum + periodAmount(item.monthlySpentNpr, period), 0);
    const remaining = Math.max(0, totalBudget - totalSpent);
    return { totalBudget, totalSpent, remaining };
  }, [budgets, period]);

  return (
    <DashboardAccessGuard>
      <main
        className={`min-h-screen w-full max-w-[100vw] overflow-x-hidden pb-[calc(7rem+env(safe-area-inset-bottom,0px))] pt-[calc(0.85rem+env(safe-area-inset-top,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] text-white sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))] lg:pl-[max(2rem,env(safe-area-inset-left,0px))] lg:pr-[max(2rem,env(safe-area-inset-right,0px))] ${
          light ? "bg-[#06291f]" : "bg-[#020806]"
        }`}
      >
        <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-400/18 blur-3xl" />
          <div className="absolute -right-24 top-52 h-80 w-80 rounded-full bg-lime-300/12 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex w-full min-w-0 max-w-lg flex-col gap-3 sm:gap-3.5 lg:max-w-6xl lg:gap-4">
          <header className="flex w-full min-w-0 items-center justify-between gap-2 sm:gap-3">
            <Link
              href="/finance"
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-black backdrop-blur-xl transition active:scale-[0.98] ${
                light
                  ? "border-emerald-200/90 bg-white/95 text-emerald-900"
                  : "border-white/10 bg-white/[0.06] text-emerald-50"
              }`}
            >
              <ArrowLeft size={17} /> Finance
            </Link>
            <div className="min-w-0 flex-1 text-center">
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${light ? "text-emerald-700/80" : "text-emerald-100/45"}`}>
                FIRE Nepal
              </p>
              <h1 className={`truncate text-xl font-black tracking-[-0.04em] ${light ? "text-slate-900" : "text-white"}`}>Budget</h1>
            </div>
            <button
              type="button"
              onClick={openCreateForm}
              aria-label="Add budget"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-300 to-lime-300 text-emerald-950 shadow-lg shadow-emerald-500/25 transition active:scale-95"
            >
              <Plus size={23} strokeWidth={2.6} />
            </button>
          </header>

          <SegmentedControl value={period} onChange={setPeriod} />

          <DashboardSectionHeader
            accent="emerald"
            eyebrow={
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                light ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-800" : "border-lime-300/20 bg-lime-300/10 text-lime-100"
              }`}>
                <Flame size={12} /> Premium planner
              </span>
            }
            title="Budget command center"
            subtitle="NPR-only monthly discipline and yearly goals — designed for FIRE Nepal spending decisions."
          />

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className={`relative overflow-hidden rounded-[2rem] border p-4 shadow-[0_28px_90px_-48px_rgba(16,185,129,0.65)] sm:p-6 lg:p-7 ${
              light
                ? "border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/70 to-white"
                : "border-emerald-200/15 bg-gradient-to-br from-emerald-500/24 via-emerald-950/88 to-[#03110d]"
            }`}
          >
            <div className="pointer-events-none absolute -right-16 -top-12 h-56 w-56 rounded-full bg-lime-300/18 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute bottom-0 left-0 h-44 w-44 rounded-full bg-teal-300/10 blur-3xl" aria-hidden />
            <div className="relative min-w-0">
              <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${light ? "text-emerald-700/80" : "text-emerald-100/55"}`}>Summary</p>
              <h2 className={`mt-2 text-2xl font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>Total Budget</h2>
              <p className={`mt-1 text-3xl font-black tracking-[-0.05em] sm:text-5xl ${light ? "text-emerald-800" : "text-lime-100"}`}>
                {formatNpr(totals.totalBudget)}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:max-w-md">
                <div className={`rounded-2xl border p-3 ${light ? "border-emerald-200/70 bg-white/80" : "border-white/10 bg-white/[0.06]"}`}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${light ? "text-emerald-700/80" : "text-emerald-100/50"}`}>Spent</p>
                  <p className={`mt-1 text-lg font-black tabular-nums ${light ? "text-slate-900" : "text-white"}`}>{formatNpr(totals.totalSpent)}</p>
                </div>
                <div className={`rounded-2xl border p-3 ${light ? "border-emerald-200/70 bg-white/80" : "border-white/10 bg-white/[0.06]"}`}>
                  <p className={`text-[11px] font-black uppercase tracking-[0.14em] ${light ? "text-emerald-700/80" : "text-emerald-100/50"}`}>Remaining</p>
                  <p className={`mt-1 text-lg font-black tabular-nums ${light ? "text-emerald-700" : "text-lime-100"}`}>{formatNpr(totals.remaining)}</p>
                </div>
              </div>
            </div>
          </motion.section>

          <BudgetAllocationDashboard budgets={budgets} period={period} light={light} />

          <button
            type="button"
            onClick={() => setAllocationOpen(true)}
            className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[1.55rem] border px-4 text-left shadow-[0_18px_50px_-36px_rgba(16,185,129,0.65)] transition active:scale-[0.99] ${
              light
                ? "border-emerald-200/80 bg-gradient-to-r from-white via-emerald-50 to-white text-emerald-950"
                : "border-lime-300/25 bg-gradient-to-r from-emerald-500/20 via-white/[0.06] to-lime-300/15 text-white"
            }`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-lime-300 text-emerald-950 shadow-lg shadow-emerald-500/20">
                <PieChart size={20} strokeWidth={2.4} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-black">Manage Budget Allocation</span>
                <span className={`mt-0.5 block truncate text-xs font-semibold ${light ? "text-emerald-800/70" : "text-emerald-100/55"}`}>
                  Redistribute your monthly budget across categories
                </span>
              </span>
            </span>
            <span className={`shrink-0 text-sm font-black ${light ? "text-emerald-700" : "text-lime-200"}`}>Open</span>
          </button>

          <section className={`rounded-[1.65rem] border p-4 backdrop-blur-xl ${light ? "border-emerald-200/70 bg-white/90" : "border-white/10 bg-white/[0.055]"}`}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className={`text-sm font-black uppercase tracking-[0.16em] ${light ? "text-emerald-700/80" : "text-emerald-100/55"}`}>Monthly Trend</h2>
                <p className={`mt-1 text-xs font-semibold ${light ? "text-slate-500" : "text-emerald-100/45"}`}>
                  Lazy-loaded chart for fast mobile rendering.
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${light ? "bg-emerald-100 text-emerald-800" : "bg-lime-300/14 text-lime-100"}`}>
                NPR only
              </span>
            </div>
            <BudgetMonthlyTrendChart ready={chartsReady} />
          </section>

          <section className="grid w-full min-w-0 gap-3 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4">
            <div className="w-full min-w-0">
              <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-sm font-black uppercase tracking-[0.16em] text-emerald-100/55">Budget List</h2>
                <span className="shrink-0 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-lime-100">{budgets.length} active</span>
              </div>
              <div className="w-full min-w-0 space-y-3">
                {loadingBudgets ? (
                  <div className="w-full rounded-[1.55rem] border border-white/10 bg-white/[0.06] p-6 text-center text-sm font-semibold text-emerald-100/55">
                    Loading your budgets...
                  </div>
                ) : budgets.length === 0 ? (
                  <BudgetEmptyState onCreate={openCreateForm} />
                ) : (
                  <AnimatePresence mode="popLayout">
                    {budgets.map((budget, index) => (
                      <BudgetCard
                        key={budget.id}
                        budget={budget}
                        period={period}
                        index={index}
                        totalBudget={totals.totalBudget}
                        onOpen={openDetailBudget}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>

            <aside className="space-y-3 lg:sticky lg:top-5 lg:self-start">
              <section className="relative overflow-hidden rounded-[1.65rem] border border-lime-300/20 bg-gradient-to-br from-lime-300/16 via-white/[0.055] to-emerald-500/10 p-4 backdrop-blur-xl">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-lime-300/18 blur-3xl" aria-hidden />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime-300 text-emerald-950">
                      <Sparkles size={20} />
                    </span>
                    <div>
                      <h2 className="text-base font-black text-white">🔥 FIRE AI Recommendation</h2>
                      <p className="text-xs font-semibold text-emerald-100/55">Friendly placeholder</p>
                    </div>
                  </div>
                  <p className={`mt-4 text-sm font-semibold leading-relaxed ${light ? "text-emerald-900/80" : "text-emerald-50/82"}`}>
                    Add spending history to receive an AI budget recommendation. FIRE Nepal will show recommended monthly budget, potential savings, and confidence only when user data is available.
                  </p>
                  <div className={`mt-4 rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/80" : "border-white/10 bg-black/20"}`}>
                    <p className={`text-xs font-bold uppercase tracking-[0.14em] ${light ? "text-emerald-700/70" : "text-emerald-100/45"}`}>
                      Awaiting spending data
                    </p>
                    <p className={`mt-2 text-sm font-semibold leading-relaxed ${light ? "text-slate-600" : "text-emerald-100/65"}`}>
                      No financial estimate is shown until your expense history is connected.
                    </p>
                  </div>
                </div>
              </section>
            </aside>
          </section>
        </div>

        <BudgetFormModal
          open={formOpen}
          mode={formMode}
          initialBudget={editingBudget}
          onClose={() => {
            setFormOpen(false);
            setEditingBudget(null);
          }}
          onSave={handleFormSave}
          saving={savingBudget}
        />

        <BudgetAllocationManager
          open={allocationOpen}
          budgets={budgets}
          saving={savingAllocation}
          onClose={() => {
            if (!savingAllocation) setAllocationOpen(false);
          }}
          onSave={handleSaveAllocations}
          onCreateBudget={openCreateForm}
        />

        <AnimatePresence>
          {detailBudget ? (
            <BudgetDetailsSheet
              budget={budgets.find((item) => item.id === detailBudget.id) ?? detailBudget}
              period={period}
              allocationPercent={
                totals.totalBudget > 0
                  ? (periodAmount(
                      (budgets.find((item) => item.id === detailBudget.id) ?? detailBudget).monthlyBudgetNpr,
                      period,
                    ) /
                      totals.totalBudget) *
                    100
                  : 0
              }
              onClose={() => setDetailBudget(null)}
              onEdit={() => openEditForm(budgets.find((item) => item.id === detailBudget.id) ?? detailBudget)}
              onDuplicate={() => void handleDuplicateBudget(budgets.find((item) => item.id === detailBudget.id) ?? detailBudget)}
              onDelete={() => {
                const selected = budgets.find((item) => item.id === detailBudget.id) ?? detailBudget;
                setDeletingBudget(selected);
                setDetailBudget(null);
              }}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {deletingBudget ? (
            <DeleteBudgetDialog
              open
              deleting={deletingBudgetBusy}
              onClose={() => {
                if (deletingBudgetBusy) return;
                setDeletingBudget(null);
              }}
              onConfirm={() => void handleDeleteBudget()}
            />
          ) : null}
        </AnimatePresence>
      </main>
    </DashboardAccessGuard>
  );
}
