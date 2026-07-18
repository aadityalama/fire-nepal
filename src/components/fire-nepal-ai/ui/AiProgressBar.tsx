"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";

type AiProgressBarProps = {
  value: number | null;
  label?: string;
  className?: string;
  /** Force SWP-style dark-on-light contrast (for white glass cards). */
  tone?: "auto" | "light";
};

export function AiProgressBar({ value, label, className, tone = "auto" }: AiProgressBarProps) {
  const resolved = useFireTheme().resolvedTheme;
  const light = tone === "light" || resolved === "light";
  const pct = value === null ? 0 : Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={className}>
      {label ? (
        <div
          className={`mb-1 flex items-center justify-between text-[11px] font-black sm:text-xs ${
            light ? "text-emerald-900" : "text-emerald-100"
          }`}
        >
          <span>{label}</span>
          <span>{value === null ? "—" : `${pct}%`}</span>
        </div>
      ) : null}
      <div
        className={`h-2.5 w-full overflow-hidden rounded-full ring-1 sm:h-3 ${
          light ? "bg-emerald-100/90 ring-emerald-900/10" : "bg-white/12 ring-white/15"
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-800 via-emerald-600 to-emerald-500 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
