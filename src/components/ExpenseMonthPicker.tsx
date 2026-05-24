"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatMonthLabel, formatMonthShort } from "@/lib/expense-storage";

type ExpenseMonthPickerProps = {
  monthKeys: string[];
  selectedMonthKey: string;
  onChange: (monthKey: string) => void;
};

export function ExpenseMonthPicker({ monthKeys, selectedMonthKey, onChange }: ExpenseMonthPickerProps) {
  const index = monthKeys.indexOf(selectedMonthKey);
  const canGoNewer = index > 0;
  const canGoOlder = index < monthKeys.length - 1;

  function shift(direction: "newer" | "older") {
    if (direction === "newer" && canGoNewer) onChange(monthKeys[index - 1]);
    if (direction === "older" && canGoOlder) onChange(monthKeys[index + 1]);
  }

  return (
    <div className="glass-card animate-fade-in rounded-[1.4rem] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-emerald-700" size={18} />
          <div>
            <p className="font-nepali text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
              महिना छान्नुहोस्
            </p>
            <p className="text-sm font-black text-emerald-950">{formatMonthLabel(selectedMonthKey)}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shift("newer")}
            disabled={!canGoNewer}
            className="rounded-xl border border-emerald-100 bg-white p-2 text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-40"
            aria-label="Newer month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => shift("older")}
            disabled={!canGoOlder}
            className="rounded-xl border border-emerald-100 bg-white p-2 text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-40"
            aria-label="Older month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {monthKeys.map((monthKey) => (
          <button
            key={monthKey}
            type="button"
            onClick={() => onChange(monthKey)}
            className={`shrink-0 rounded-2xl px-4 py-2.5 text-xs font-black transition ${
              monthKey === selectedMonthKey
                ? "bg-emerald-700 text-white shadow-lg shadow-emerald-900/15"
                : "border border-emerald-100 bg-white/80 text-emerald-800 hover:bg-emerald-50"
            }`}
          >
            {formatMonthShort(monthKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
