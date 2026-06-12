"use client";

import { type ChangeEvent, type FocusEvent, useState } from "react";

const premiumInputClass =
  "min-h-[44px] w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 caret-teal-600 outline-none transition-[border-color,box-shadow,background-color] duration-150 selection:bg-teal-500/20 selection:text-slate-900 placeholder:text-slate-400/80 focus:border-teal-400/80 focus:shadow-[0_0_0_3px_rgba(45,212,191,0.18)] focus:ring-0 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:caret-teal-300 dark:selection:bg-teal-400/25 dark:selection:text-white dark:placeholder:text-[rgba(255,255,255,0.72)] dark:focus:border-teal-400/45 dark:focus:shadow-[0_0_0_3px_rgba(45,212,191,0.12)] sm:px-4 sm:text-[15px]";

type Props = {
  value: number;
  onCommit: (next: number) => void;
  integer?: boolean;
  min?: number;
  max?: number;
  className?: string;
  disabled?: boolean;
  /** Mobile keyboard: integers default to `numeric`, decimals to `decimal`. */
  inputMode?: "numeric" | "decimal";
  autoComplete?: string;
};

function clamp(n: number, min?: number, max?: number): number {
  let x = n;
  if (min !== undefined) x = Math.max(min, x);
  if (max !== undefined) x = Math.min(max, x);
  return x;
}

/**
 * Premium numeric field for the Return planner: clears a starting `0` on focus,
 * keeps NPR-friendly integer typing (no comma in the field — summaries use `formatNprInteger`),
 * and uses a local string while focused so React controlled values stay in sync.
 */
export function ReturnPlannerNumericInput({
  value,
  onCommit,
  integer = true,
  min,
  max,
  className = "",
  disabled = false,
  inputMode,
  autoComplete = "off",
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);

  const mergedClass = `${premiumInputClass} ${className}`.trim();
  const resolvedInputMode = inputMode ?? (integer ? "numeric" : "decimal");

  const display = editing !== null ? editing : String(value);

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    if (disabled) return;
    const initial = value === 0 ? "" : String(value);
    setEditing(initial);
    if (e.target.value === "0") e.target.value = "";
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    setEditing(raw);

    if (raw === "" || raw === "-") {
      onCommit(0);
      return;
    }

    if (!integer) {
      if (raw === ".") {
        return;
      }
      if (/^\d+\.$/.test(raw) || raw === "-." || /^-\d+\.$/.test(raw)) {
        return;
      }
    }

    const n = integer ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
    if (!Number.isFinite(n)) {
      return;
    }

    onCommit(clamp(integer ? Math.round(n) : n, min, max));
  };

  const handleBlur = () => {
    if (disabled) return;
    setEditing(null);
    const c = clamp(value, min, max);
    if (c !== value) {
      onCommit(c);
    }
  };

  const disabledClass = disabled ? "cursor-not-allowed opacity-60" : "";

  return (
    <input
      type="text"
      inputMode={resolvedInputMode}
      autoComplete={autoComplete}
      enterKeyHint="done"
      spellCheck={false}
      disabled={disabled}
      aria-disabled={disabled}
      pattern={integer ? "[0-9]*" : "[0-9]*[.]?[0-9]*"}
      value={display}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`${mergedClass} ${disabledClass}`.trim()}
    />
  );
}
