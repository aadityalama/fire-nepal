"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";

type AiProgressBarProps = {
  value: number | null;
  label?: string;
  className?: string;
};

export function AiProgressBar({ value, label, className }: AiProgressBarProps) {
  const light = useFireTheme().resolvedTheme === \"light\";
  const pct = value === null ? 0 : Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[11px] font-black text-emerald-900 sm:text-xs">
          <span>{label}</span>
          <span>{value === null ? \"—\" : `${pct}%`}</span>
        </div>
      ) : null}
      <div
        className={`h-2.5 w-full overflow-hidden rounded-full ring-1 sm:h-3 ${
          light ? "bg-emerald-50 ring-emerald-900/5" : "bg-white/10 ring-white/10"
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-lime-300 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

