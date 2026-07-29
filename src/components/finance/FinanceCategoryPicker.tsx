"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Home, Rocket, Target, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  FINANCE_CATEGORY_GROUPS,
  getFinanceCategoriesForGroup,
  getFinanceCategoryMeta,
  normalizeFinanceCategory,
  type FinanceCategory,
  type FinanceCategoryGroup,
  type FinanceCategoryGroupId,
  type FinanceCategoryId,
} from "@/lib/finance/categories";

type FinanceCategoryPickerProps = {
  value: string;
  onChange: (category: FinanceCategoryId) => void;
  heading?: string;
  className?: string;
  /** @deprecated Kept for call-site compatibility. */
  gridClassName?: string;
};

const GROUP_ICONS = {
  "financial-priorities": Target,
  "essential-living": Home,
  "growth-lifestyle": Rocket,
} as const;

function CategoryGroupSheet({
  open,
  group,
  categories,
  selected,
  onClose,
  onSelect,
}: {
  open: boolean;
  group: FinanceCategoryGroup | null;
  categories: FinanceCategory[];
  selected: FinanceCategoryId;
  onClose: () => void;
  onSelect: (category: FinanceCategoryId) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && group ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-end sm:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close category sheet"
            className="absolute inset-0 bg-[#020806]/70 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            initial={{ y: "100%", opacity: 0.85 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.85 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.85 }}
            className="relative z-[81] flex h-[70vh] max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.75rem] border border-emerald-300/20 bg-[#04140f] shadow-[0_-24px_80px_-20px_rgba(0,0,0,0.75)] sm:max-w-xl"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/20" aria-hidden />
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 pb-4 pt-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300/30 to-lime-300/20 text-xl">
                    {group.emoji}
                  </span>
                  <div className="min-w-0">
                    <h2 id={titleId} className="truncate text-lg font-black tracking-tight text-white">
                      {group.label}
                    </h2>
                    <p id={descriptionId} className="mt-0.5 text-sm font-semibold text-emerald-100/55">
                      {group.sheetSubtitle}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-emerald-100/80 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60"
              >
                <X size={18} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
              <div className="space-y-2">
                {categories.map((item) => {
                  const active = selected === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={`flex min-h-[64px] w-full items-center gap-3 rounded-2xl border px-3.5 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 ${
                        active
                          ? "border-lime-300/60 bg-lime-300/18 text-white shadow-[0_0_28px_rgba(190,242,100,0.16)]"
                          : "border-white/10 bg-white/[0.04] text-emerald-50 hover:border-emerald-300/35 hover:bg-white/[0.07]"
                      }`}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300/20 to-lime-300/10 text-2xl">
                        {item.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-black tracking-tight">{item.label}</span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-emerald-100/55">{item.helper}</span>
                      </span>
                      {active ? <Check size={18} className="shrink-0 text-lime-200" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function FinanceCategoryPicker({
  value,
  onChange,
  heading = "Categories",
  className = "rounded-[1.6rem] border border-white/10 bg-white/[0.055] p-4",
}: FinanceCategoryPickerProps) {
  const selected = normalizeFinanceCategory(value);
  const selectedMeta = getFinanceCategoryMeta(selected);
  const [openGroupId, setOpenGroupId] = useState<FinanceCategoryGroupId | null>(null);

  const openGroup = openGroupId ? FINANCE_CATEGORY_GROUPS.find((group) => group.id === openGroupId) ?? null : null;
  const openCategories = openGroupId ? getFinanceCategoriesForGroup(openGroupId) : [];

  function handleSelect(category: FinanceCategoryId) {
    onChange(category);
    setOpenGroupId(null);
  }

  return (
    <section className={`w-full min-w-0 ${className}`}>
      {heading ? (
        <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-100/50">{heading}</p>
          <span className="max-w-[60%] truncate rounded-full border border-lime-300/25 bg-lime-300/10 px-2.5 py-1 text-[11px] font-black text-lime-100">
            {selectedMeta.emoji} {selectedMeta.label}
          </span>
        </div>
      ) : null}

      <div className="space-y-3">
        {FINANCE_CATEGORY_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.id];
          const children = getFinanceCategoriesForGroup(group.id);
          const selectedInGroup = children.find((item) => item.id === selected) ?? null;
          const active = Boolean(selectedInGroup);

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => setOpenGroupId(group.id)}
              aria-haspopup="dialog"
              aria-expanded={openGroupId === group.id}
              className={`group relative flex w-full min-w-0 items-center gap-3.5 overflow-hidden rounded-[1.45rem] border p-4 text-left shadow-[0_18px_50px_-34px_rgba(16,185,129,0.55)] transition duration-200 hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/60 ${
                active
                  ? "border-lime-300/45 bg-gradient-to-br from-emerald-400/18 via-white/[0.06] to-lime-300/10"
                  : "border-white/12 bg-gradient-to-br from-white/[0.07] via-emerald-950/40 to-white/[0.03]"
              }`}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-lime-300/10 blur-2xl transition group-hover:bg-lime-300/16" aria-hidden />
              <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-300 to-lime-300 text-emerald-950 shadow-lg shadow-emerald-500/20">
                <Icon size={26} strokeWidth={2.25} aria-hidden />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-lg" aria-hidden>
                    {group.emoji}
                  </span>
                  <span className="truncate text-base font-black tracking-tight text-white sm:text-lg">{group.label}</span>
                </span>
                <span className="mt-1 block text-sm font-semibold leading-snug text-emerald-100/55">{group.subtitle}</span>
                {selectedInGroup ? (
                  <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/12 px-2.5 py-1 text-[11px] font-black text-lime-100">
                    <span className="truncate">
                      Selected: {selectedInGroup.emoji} {selectedInGroup.label}
                    </span>
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-bold text-emerald-100/45">
                    Tap to choose
                  </span>
                )}
              </span>
              <span className="relative inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-black text-lime-100 transition group-hover:border-lime-300/35 group-hover:bg-lime-300/10">
                Choose
                <ChevronRight size={14} aria-hidden />
              </span>
            </button>
          );
        })}
      </div>

      <CategoryGroupSheet
        open={Boolean(openGroup)}
        group={openGroup}
        categories={openCategories}
        selected={selected}
        onClose={() => setOpenGroupId(null)}
        onSelect={handleSelect}
      />
    </section>
  );
}
