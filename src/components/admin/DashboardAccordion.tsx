"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState, useTransition } from "react";

export function DashboardAccordion({
  title,
  children,
  defaultOpen = false,
  id,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(defaultOpen);
  const [pending, startTransition] = useTransition();
  const reactId = useId();
  const panelId = `panel-${id ?? reactId}`;

  return (
    <div
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-xl border border-white/[0.08] bg-[#04120d]/55 backdrop-blur-xl"
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          startTransition(() => {
            const next = !open;
            setOpen(next);
            if (next) setMounted(true);
          });
        }}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition hover:bg-white/[0.03] sm:px-4"
      >
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/60">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-emerald-300/70 transition-transform duration-200 ${open ? "rotate-180" : ""} ${pending ? "opacity-60" : ""}`}
          aria-hidden
        />
      </button>
      {mounted ? (
        <div
          id={panelId}
          hidden={!open}
          className="border-t border-white/[0.06] px-3.5 py-3 sm:px-4 sm:py-3.5"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
