"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { formatShortDate } from "@/components/cashflow-workspace/cashflow-workspace-utils";
import {
  categoryIcon,
  formatNpr,
  getDueDate,
  getExpenseStatus,
} from "@/components/expense-workspace/expense-workspace-utils";
import type { ExpenseWorkspaceMeta } from "@/lib/expense-workspace-ui";
import type { Expense } from "@/lib/expense-utils";

type CashflowWorkspaceCalendarProps = {
  expenses: Expense[];
  metaMap: Record<number, ExpenseWorkspaceMeta>;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  month: Date;
  onMonthChange: (next: Date) => void;
};

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function CashflowWorkspaceCalendar({
  expenses,
  metaMap,
  selectedDate,
  onSelectDate,
  month,
  onMonthChange,
}: CashflowWorkspaceCalendarProps) {
  const expenseDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of expenses) {
      map.set(expense.date, (map.get(expense.date) ?? 0) + 1);
    }
    return map;
  }, [expenses]);

  const dueDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of expenses) {
      const due = getDueDate(expense, metaMap[expense.id]);
      map.set(due, (map.get(due) ?? 0) + 1);
    }
    return map;
  }, [expenses, metaMap]);

  const cells = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const items: Array<{ iso: string; day: number; inMonth: boolean }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      const date = new Date(year, monthIndex, -startOffset + i + 1);
      items.push({ iso: isoDate(date), day: date.getDate(), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, monthIndex, day);
      items.push({ iso: isoDate(date), day, inMonth: true });
    }
    while (items.length % 7 !== 0) {
      const last = items[items.length - 1];
      const date = new Date(last.iso);
      date.setDate(date.getDate() + 1);
      items.push({ iso: isoDate(date), day: date.getDate(), inMonth: false });
    }
    return items;
  }, [month]);

  const selectedDayExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const due = getDueDate(expense, metaMap[expense.id]);
        return expense.date === selectedDate || due === selectedDate;
      }),
    [expenses, metaMap, selectedDate],
  );

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl sm:rounded-[1.65rem] sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="grid min-h-[44px] min-w-[44px] touch-manipulation place-items-center rounded-full bg-white/[0.06] text-emerald-100 transition active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Calendar</p>
          <p className="text-base font-black text-white sm:text-lg">
            {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="grid min-h-[44px] min-w-[44px] touch-manipulation place-items-center rounded-full bg-white/[0.06] text-emerald-100 transition active:scale-95"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] font-bold text-emerald-100/50">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-lime-300" /> Expense date
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-300" /> Due date
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/45">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const expenseCount = expenseDates.get(cell.iso) ?? 0;
          const dueCount = dueDates.get(cell.iso) ?? 0;
          const active = selectedDate === cell.iso;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              className={`relative min-h-[44px] touch-manipulation rounded-2xl px-1 py-2 text-sm font-black transition active:scale-[0.98] ${
                active
                  ? "bg-gradient-to-br from-emerald-300 to-lime-300 text-emerald-950 shadow-lg"
                  : cell.inMonth
                    ? "bg-white/[0.04] text-emerald-50"
                    : "bg-transparent text-emerald-100/25"
              }`}
            >
              {cell.day}
              {(expenseCount > 0 || dueCount > 0) && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {expenseCount > 0 ? (
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-900/70" : "bg-lime-300"}`} />
                  ) : null}
                  {dueCount > 0 ? (
                    <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-900/50" : "bg-orange-300"}`} />
                  ) : null}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3 sm:p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">
          {formatShortDate(selectedDate)}
        </p>
        {selectedDayExpenses.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-emerald-100/55">No expenses on this date.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {selectedDayExpenses.map((expense) => {
              const meta = metaMap[expense.id];
              const status = getExpenseStatus(expense, meta);
              const dueDate = getDueDate(expense, meta);
              return (
                <Link
                  key={expense.id}
                  href="/expense-dashboard?finance=personal&view=expenses"
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 transition active:scale-[0.99] hover:bg-white/[0.07]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">
                      {categoryIcon(expense.category)} {expense.title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-emerald-100/50">
                      Expense {formatShortDate(expense.date)} · Due {formatShortDate(dueDate)} · {status.remainingLabel}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-black text-lime-100">{formatNpr(expense.amount)}</p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
