"use client";

import { Check } from "lucide-react";
import {
  FINANCE_CATEGORIES,
  normalizeFinanceCategory,
  type FinanceCategoryId,
} from "@/lib/finance/categories";

type FinanceCategoryPickerProps = {
  value: string;
  onChange: (category: FinanceCategoryId) => void;
  heading?: string;
  className?: string;
  gridClassName?: string;
};

export function FinanceCategoryPicker({
  value,
  onChange,
  heading = "Categories",
  className = "rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4",
  gridClassName = "mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3",
}: FinanceCategoryPickerProps) {
  const selected = normalizeFinanceCategory(value);

  return (
    <section className={className}>
      {heading ? (
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">{heading}</p>
      ) : null}
      <div className={gridClassName}>
        {FINANCE_CATEGORIES.map((item) => {
          const active = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              className={`flex min-h-[54px] items-center gap-2 rounded-2xl border px-3 text-left transition active:scale-[0.98] ${
                active ? "border-lime-300/60 bg-lime-300/18 text-white" : "border-white/10 bg-white/[0.04] text-emerald-100/75"
              }`}
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="min-w-0 truncate text-sm font-black">{item.label}</span>
              {active ? <Check size={15} className="ml-auto shrink-0 text-lime-200" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
