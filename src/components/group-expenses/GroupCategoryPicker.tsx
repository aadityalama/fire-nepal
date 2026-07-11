"use client";

import { Check } from "lucide-react";
import {
  GROUP_EXPENSE_CATEGORIES,
  normalizeGroupCategory,
  type GroupExpenseCategoryId,
} from "@/lib/group-expenses/categories";

type GroupCategoryPickerProps = {
  value: string;
  onChange: (category: GroupExpenseCategoryId) => void;
  heading?: string;
  className?: string;
  gridClassName?: string;
};

export function GroupCategoryPicker({
  value,
  onChange,
  heading = "Categories",
  className = "rounded-xl border border-emerald-100 bg-emerald-50/40 p-3",
  gridClassName = "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3",
}: GroupCategoryPickerProps) {
  const selected = normalizeGroupCategory(value);

  return (
    <section className={className}>
      {heading ? (
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">{heading}</p>
      ) : null}
      <div className={gridClassName}>
        {GROUP_EXPENSE_CATEGORIES.map((item) => {
          const active = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-2.5 text-left transition active:scale-[0.98] ${
                active
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-emerald-100 bg-white text-emerald-950"
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="min-w-0 truncate text-xs font-black sm:text-sm">{item.label}</span>
              {active ? <Check size={14} className="ml-auto shrink-0 text-emerald-100" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
