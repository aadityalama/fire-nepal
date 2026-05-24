"use client";

import { todayIsoLocal } from "@/components/portfolio/holding-stats";

type Props = {
  label: string;
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  className?: string;
};

export function PortfolioIsoDateField({ label, value, onChange, className }: Props) {
  return (
    <label className={`block w-full min-w-0 sm:min-w-[10.5rem] sm:max-w-[13rem] ${className ?? ""}`}>
      <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-emerald-200/55">{label}</span>
      <input
        type="date"
        max={todayIsoLocal()}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? e.target.value : undefined)}
        className="wealth-input-text w-full rounded-xl px-2.5 py-2 text-xs font-bold text-emerald-50 outline-none [color-scheme:dark] sm:text-sm"
      />
    </label>
  );
}
