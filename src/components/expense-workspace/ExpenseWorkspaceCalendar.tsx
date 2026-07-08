"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { categoryIcon } from "@/components/expense-workspace/expense-workspace-utils";
import type { ExpenseWorkspaceMeta } from "@/lib/expense-workspace-ui";
import type { Expense } from "@/lib/expense-utils";

type ExpenseWorkspaceCalendarProps = {
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

export function ExpenseWorkspaceCalendar({
  expenses,
  metaMap,
  selectedDate,
  onSelectDate,
  month,
  onMonthChange,
}: ExpenseWorkspaceCalendarProps) {
  const dueDates = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of expenses) {
      const due = metaMap[expense.id]?.dueDate ?? expense.date;
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
        const due = metaMap[expense.id]?.dueDate ?? expense.date;
        return due === selectedDate;
      }),
    [expenses, metaMap, selectedDate],
  );

  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="grid min-h-[40px] min-w-[40px] place-items-center rounded-full bg-white/[0.06] text-emerald-100"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">Calendar</p>
          <p className="text-base font-black text-white">
            {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="grid min-h-[40px] min-w-[40px] place-items-center rounded-full bg-white/[0.06] text-emerald-100"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/45">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const count = dueDates.get(cell.iso) ?? 0;
          const active = selectedDate === cell.iso;
          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelectDate(cell.iso)}
              className={`relative min-h-[44px] rounded-2xl px-1 py-2 text-sm font-black transition active:scale-[0.98] ${
                active
                  ? "bg-gradient-to-br from-emerald-300 to-lime-300 text-emerald-950 shadow-lg"
                  : cell.inMonth
                    ? "bg-white/[0.04] text-emerald-50"
                    : "bg-transparent text-emerald-100/25"
              }`}
            >
              {cell.day}
              {count > 0 ? (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
                    <span key={index} className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-900/70" : "bg-lime-300"}`} />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-100/50">
          Due on {new Date(selectedDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        {selectedDayExpenses.length === 0 ? (
          <p className="mt-2 text-sm font-semibold text-emerald-100/55">No expenses due on this date.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {selectedDayExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {categoryIcon(expense.category)} {expense.title}
                  </p>
                  <p className="text-xs font-semibold text-emerald-100/50">{expense.category}</p>
                </div>
                <p className="shrink-0 text-sm font-black text-lime-100">NPR {Math.round(expense.amount).toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
