"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type CashflowGlassCardProps = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
};

export function CashflowGlassCard({ title, subtitle, icon: Icon, children, className, headerRight }: CashflowGlassCardProps) {
  return (
    <section
      className={`wealth-glass rounded-[1.35rem] p-3.5 sm:rounded-[1.5rem] sm:p-4 ${className ?? ""}`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-400/15 text-teal-200 ring-1 ring-white/10">
            <Icon size={18} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black text-emerald-50 sm:text-base">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] font-bold leading-relaxed text-emerald-200/65 sm:text-xs">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {headerRight}
      </div>
      {children}
    </section>
  );
}

/** Inner elevated surface for grouped fields (reusable). */
export function CashflowInsetCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-emerald-400/10 bg-black/25 px-2.5 py-2.5 backdrop-blur-[2px] sm:px-3 sm:py-3 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
