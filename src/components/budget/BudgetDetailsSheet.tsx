"use client";

import { Copy, Pencil, Trash2, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  BUDGET_NOTIFICATION_OPTIONS,
  type BudgetPeriod,
  type BudgetRecord,
} from "@/lib/budget/types";
import { getFinanceCategoryGroup, getFinanceCategoryLabel } from "@/lib/finance/categories";

function formatNpr(amount: number) {
  return `NPR ${Math.round(amount).toLocaleString("en-IN")}`;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function periodAmount(monthlyAmount: number, period: BudgetPeriod) {
  return period === "Yearly" ? monthlyAmount * 12 : monthlyAmount;
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getBudgetStatus(spent: number, budgetAmount: number): {
  label: "On Track" | "Warning" | "Over Budget";
  className: string;
} {
  if (budgetAmount <= 0) {
    return { label: "On Track", className: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100" };
  }
  const pct = (spent / budgetAmount) * 100;
  if (pct > 100) {
    return { label: "Over Budget", className: "border-red-300/40 bg-red-500/15 text-red-100" };
  }
  if (pct >= 75) {
    return { label: "Warning", className: "border-amber-300/40 bg-amber-400/15 text-amber-100" };
  }
  return { label: "On Track", className: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100" };
}

export function BudgetDetailsSheet({
  budget,
  period,
  allocationPercent,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  budget: BudgetRecord;
  period: BudgetPeriod;
  allocationPercent: number;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const amount = periodAmount(budget.monthlyBudgetNpr, period);
  const spent = periodAmount(budget.monthlySpentNpr, period);
  const remaining = Math.max(0, amount - spent);
  const progressPct = amount > 0 ? clampPct((spent / amount) * 100) : 0;
  const status = getBudgetStatus(spent, amount);
  const parentCategory = getFinanceCategoryGroup(budget.category).label;
  const enabledAlerts = BUDGET_NOTIFICATION_OPTIONS.filter((option) => budget.notificationSettings[option]);
  const notificationsEnabled = enabledAlerts.length > 0;
  const daysLabel =
    period === "Yearly" ? `${budget.daysRemaining + 334} days left` : `${budget.daysRemaining} days left`;
  const notesText = typeof budget.notes === "string" ? budget.notes.replace(/\r\n/g, "\n").replace(/\r/g, "\n") : "";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[65] flex items-end justify-center bg-[#020806]/80 backdrop-blur-md sm:items-center sm:p-5"
    >
      <button type="button" aria-label="Close budget details" className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 28 }}
        transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.85rem] border border-emerald-300/15 bg-[#04140f] shadow-2xl sm:max-h-[88vh] sm:rounded-[2rem]"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20 sm:hidden" />
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5 sm:pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Budget Details</p>
            <h2 className="truncate text-lg font-black text-white">{budget.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-full bg-white/[0.06]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-5">
          <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${budget.gradient} text-2xl shadow-lg`}>
                  {budget.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-black text-white">{budget.name}</h3>
                  <p className="mt-0.5 truncate text-sm font-semibold text-emerald-100/55">
                    {getFinanceCategoryLabel(budget.category)}
                  </p>
                </div>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${status.className}`}>
                {status.label}
              </span>
            </div>

            <p className="mt-4 text-3xl font-black tracking-tight text-lime-100">{formatNpr(amount)}</p>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${budget.gradient} transition-[width] duration-500`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-emerald-100/55">
              {progressPct}% used · {daysLabel}
            </p>
          </section>

          <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Overview</p>
            <div className="mt-3 space-y-2">
              {[
                ["Category", getFinanceCategoryLabel(budget.category)],
                ["Parent Category", parentCategory],
                ["Budget Amount", formatNpr(amount)],
                ["Amount Spent", formatNpr(spent)],
                ["Remaining Amount", formatNpr(remaining)],
                ["Allocation %", `${allocationPercent.toFixed(1)}%`],
                ["Budget Period", budget.period],
                ["Created Date", formatDateTime(budget.createdAt)],
                ["Last Updated", formatDateTime(budget.updatedAt)],
                ["Notifications Enabled", notificationsEnabled ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-black/15 px-3 py-2.5">
                  <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-100/45">{label}</span>
                  <span className="text-right text-sm font-bold text-emerald-50">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-[1.5rem] border border-lime-300/20 bg-gradient-to-br from-emerald-400/12 to-lime-300/8 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Notes</p>
            {notesText.trim() ? (
              <p className="mt-3 max-w-full break-words whitespace-pre-wrap text-sm font-semibold leading-relaxed text-emerald-50">
                {notesText}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-emerald-100/50">No notes added.</p>
            )}
          </section>

          <section className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">Alert Levels</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGET_NOTIFICATION_OPTIONS.map((option) => {
                const on = budget.notificationSettings[option];
                return (
                  <span
                    key={option}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-black ${
                      on
                        ? "border-lime-300/40 bg-lime-300/15 text-lime-100"
                        : "border-white/10 bg-white/[0.04] text-emerald-100/40"
                    }`}
                  >
                    {option}
                  </span>
                );
              })}
            </div>
          </section>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-lime-300 text-sm font-black text-emerald-950"
            >
              <Pencil size={16} /> Edit Budget
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-emerald-50"
            >
              <Copy size={16} /> Duplicate Budget
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-red-300/20 bg-red-500/10 text-sm font-black text-red-100"
            >
              <Trash2 size={16} /> Delete Budget
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
