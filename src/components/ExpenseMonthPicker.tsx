"use client";

import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { formatMonthLabel, formatMonthShort } from "@/lib/expense-storage";

type ExpenseMonthPickerProps = {
  monthKeys: string[];
  selectedMonthKey: string;
  onChange: (monthKey: string) => void;
  compact?: boolean;
  /** Ultra-compact single row for settlement and tight layouts */
  dense?: boolean;
};

export function ExpenseMonthPicker({
  monthKeys,
  selectedMonthKey,
  onChange,
  compact = false,
  dense = false,
}: ExpenseMonthPickerProps) {
  const index = monthKeys.indexOf(selectedMonthKey);
  const canGoNewer = index > 0;
  const canGoOlder = index < monthKeys.length - 1;

  function shift(direction: "newer" | "older") {
    if (direction === "newer" && canGoNewer) onChange(monthKeys[index - 1]);
    if (direction === "older" && canGoOlder) onChange(monthKeys[index + 1]);
  }

  if (dense) {
    return (
      <div className="flex items-center justify-between gap-1 rounded-lg border border-slate-200/80 bg-white px-1.5 py-1">
        <button
          type="button"
          onClick={() => shift("newer")}
          disabled={!canGoNewer}
          className="grid h-7 w-7 place-items-center rounded-md text-emerald-800 transition active:bg-emerald-50 disabled:opacity-30"
          aria-label="Newer month"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-xs font-black text-emerald-950">
          {formatMonthLabel(selectedMonthKey)}
        </p>
        <button
          type="button"
          onClick={() => shift("older")}
          disabled={!canGoOlder}
          className="grid h-7 w-7 place-items-center rounded-md text-emerald-800 transition active:bg-emerald-50 disabled:opacity-30"
          aria-label="Older month"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-2.5 py-2">
        <button
          type="button"
          onClick={() => shift("newer")}
          disabled={!canGoNewer}
          className="grid h-8 w-8 place-items-center rounded-lg text-emerald-800 transition active:bg-emerald-50 disabled:opacity-30"
          aria-label="Newer month"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-black text-emerald-950">{formatMonthLabel(selectedMonthKey)}</p>
        </div>
        <button
          type="button"
          onClick={() => shift("older")}
          disabled={!canGoOlder}
          className="grid h-8 w-8 place-items-center rounded-lg text-emerald-800 transition active:bg-emerald-50 disabled:opacity-30"
          aria-label="Older month"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
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
