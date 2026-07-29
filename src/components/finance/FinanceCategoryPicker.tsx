"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import {
  FINANCE_CATEGORY_GROUPS,
  getFinanceCategoriesForGroup,
  getFinanceCategoryGroup,
  getFinanceCategoryMeta,
  normalizeFinanceCategory,
  type FinanceCategoryGroupId,
  type FinanceCategoryId,
} from "@/lib/finance/categories";

type FinanceCategoryPickerProps = {
  value: string;
  onChange: (category: FinanceCategoryId) => void;
  heading?: string;
  className?: string;
  /** @deprecated Flat grid layout is replaced by hierarchical accordion. Kept for call-site compatibility. */
  gridClassName?: string;
};

export function FinanceCategoryPicker({
  value,
  onChange,
  heading = "Categories",
  className = "rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4",
}: FinanceCategoryPickerProps) {
  const selected = normalizeFinanceCategory(value);
  const selectedMeta = getFinanceCategoryMeta(selected);
  const selectedGroup = getFinanceCategoryGroup(selected);
  const [expandedGroupId, setExpandedGroupId] = useState<FinanceCategoryGroupId>(selectedGroup.id);

  useEffect(() => {
    setExpandedGroupId(getFinanceCategoryGroup(value).id);
  }, [value]);

  return (
    <section className={className}>
      {heading ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">{heading}</p>
          <span className="truncate rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-1 text-[11px] font-black text-lime-100">
            {selectedMeta.emoji} {selectedMeta.label}
          </span>
        </div>
      ) : null}

      <div className="space-y-2">
        {FINANCE_CATEGORY_GROUPS.map((group) => {
          const expanded = expandedGroupId === group.id;
          const children = getFinanceCategoriesForGroup(group.id);
          const groupHasSelection = children.some((item) => item.id === selected);

          return (
            <div
              key={group.id}
              className={`overflow-hidden rounded-2xl border transition ${
                expanded || groupHasSelection
                  ? "border-emerald-300/35 bg-emerald-400/10"
                  : "border-white/10 bg-white/[0.035]"
              }`}
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedGroupId((current) => (current === group.id ? current : group.id))}
                className="flex min-h-[52px] w-full items-center gap-3 px-3.5 text-left transition active:scale-[0.995]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300/25 to-lime-300/15 text-xl">
                  {group.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">{group.label}</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-emerald-100/50">
                    {children.length} categories
                    {groupHasSelection ? ` · ${selectedMeta.label}` : ""}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-lime-200 transition-transform duration-200 ${expanded ? "rotate-180" : "rotate-0"}`}
                  aria-hidden
                />
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                  expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-1.5 border-t border-white/8 px-2.5 py-2.5">
                    {children.map((item) => {
                      const active = selected === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onChange(item.id)}
                          className={`flex min-h-[48px] w-full items-center gap-2.5 rounded-xl border px-3 text-left transition active:scale-[0.99] ${
                            active
                              ? "border-lime-300/60 bg-lime-300/18 text-white shadow-[0_0_24px_rgba(190,242,100,0.12)]"
                              : "border-white/8 bg-black/15 text-emerald-100/80 hover:border-emerald-300/30 hover:bg-white/[0.05]"
                          }`}
                        >
                          <span className="text-lg">{item.emoji}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-black">{item.label}</span>
                          {active ? <Check size={15} className="shrink-0 text-lime-200" /> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
