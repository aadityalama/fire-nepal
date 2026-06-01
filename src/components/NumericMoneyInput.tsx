"use client";

import { useEffect, useId, useState, type ChangeEvent, type ReactNode } from "react";

export type NumericMoneyVariant = "amount" | "integer" | "percent";

export function sanitizeDecimalTyping(raw: string): string {
  let s = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot !== -1) {
    s = `${s.slice(0, dot + 1)}${s.slice(dot + 1).replace(/\./g, "")}`;
  }
  return s;
}

export function sanitizeIntegerTyping(raw: string): string {
  return raw.replace(/[^\d]/g, "");
}

function trimNumberForEdit(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

function formatBlurredAmount(n: number, variant: NumericMoneyVariant): string {
  if (variant === "integer") return String(Math.round(n));
  if (variant === "percent") {
    return n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0, useGrouping: false });
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

/** Add thousands separators to a raw digit (± decimal) draft string for display while typing. */
export function formatMoneyDraftWithGrouping(raw: string, variant: NumericMoneyVariant): string {
  const s = raw.replace(/,/g, "");
  if (s === "") return "";
  if (variant === "percent") return s;
  if (variant === "integer") {
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  const dot = s.indexOf(".");
  if (dot === -1) return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const intPart = s.slice(0, dot);
  const decPart = s.slice(dot + 1);
  const intDigits = intPart.replace(/\D/g, "");
  const intFmt = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (decPart.length === 0) return `${intFmt}.`;
  return `${intFmt || "0"}.${decPart}`;
}

function dynamicMoneyInputFontClass(displayStr: string): string {
  const digits = displayStr.replace(/[^\d]/g, "").length;
  if (digits >= 12) return "text-[10px] leading-tight sm:text-[11px]";
  if (digits >= 9) return "text-xs leading-snug sm:text-sm";
  return "";
}

function parseCommitted(raw: string, variant: NumericMoneyVariant): number | undefined {
  const t = raw.trim().replace(/,/g, "");
  if (t === "") return undefined;
  if (variant === "integer") {
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export type NumericMoneyInputProps = {
  label?: string;
  value: number | undefined | null;
  onChange: (next: number | undefined) => void;
  placeholder?: string;
  prefix?: ReactNode;
  suffix?: string;
  variant?: NumericMoneyVariant;
  /** When true (default for amount/percent), blur of "0" commits `undefined` and shows empty. */
  treatZeroAsEmpty?: boolean;
  /** While focused, show grouped thousands (e.g. 1,000,000). Draft stays ungrouped internally. */
  formatThousandsWhileTyping?: boolean;
  /** Shrink font slightly when the displayed value has many digits (helps wide numbers on mobile). */
  autoScaleFont?: boolean;
  className?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  /** Use on dark glass surfaces (e.g. FIRE Nepal wealth dashboards). Keeps labels/affixes light. */
  tone?: "light" | "dark";
  disabled?: boolean;
  "aria-label"?: string;
};

/**
 * Fintech-style numeric field: empty by default, no forced `0`, draft string while focused to limit cursor jumps.
 */
export function NumericMoneyInput({
  label,
  value,
  onChange,
  placeholder = "Enter amount",
  prefix,
  suffix,
  variant = "amount",
  treatZeroAsEmpty = true,
  formatThousandsWhileTyping = false,
  autoScaleFont = false,
  className,
  wrapperClassName = "rounded-2xl border border-white/70 bg-white/75 px-4 py-3 shadow-sm backdrop-blur transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100",
  inputClassName = "min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none",
  tone = "light",
  disabled,
  "aria-label": ariaLabel,
}: NumericMoneyInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!focused) return;
    if (value == null || !Number.isFinite(value)) {
      setDraft("");
      return;
    }
    if (treatZeroAsEmpty && value === 0) {
      setDraft("");
      return;
    }
    setDraft(trimNumberForEdit(value));
  }, [value, focused, treatZeroAsEmpty, variant]);

  const blurDisplay = (() => {
    if (value == null || !Number.isFinite(value)) return "";
    if (treatZeroAsEmpty && value === 0) return "";
    return formatBlurredAmount(value, variant);
  })();

  const groupedDraft =
    focused && formatThousandsWhileTyping && (variant === "amount" || variant === "integer")
      ? formatMoneyDraftWithGrouping(draft, variant)
      : null;
  const show = focused ? (groupedDraft !== null ? groupedDraft : draft) : blurDisplay;
  const inputMode = variant === "integer" ? "numeric" : "decimal";
  const scaled = autoScaleFont ? dynamicMoneyInputFontClass(show) : "";
  const mergedInputClass = [inputClassName, scaled].filter(Boolean).join(" ");

  const affixPrefixClass = tone === "dark" ? "text-gray-100" : "text-black";
  const affixSuffixClass = tone === "dark" ? "text-gray-100" : "text-slate-800";
  const labelToneClass = tone === "dark" ? "text-sm font-semibold text-gray-100" : "text-sm font-semibold text-slate-800";

  function handleFocus() {
    setFocused(true);
    if (value == null || !Number.isFinite(value)) {
      setDraft("");
      return;
    }
    if (treatZeroAsEmpty && value === 0) {
      setDraft("");
      return;
    }
    setDraft(trimNumberForEdit(value));
  }

  function handleBlur() {
    setFocused(false);
    const raw = draft.trim();
    if (raw === "") {
      onChange(undefined);
      setDraft("");
      return;
    }
    const n = parseCommitted(raw, variant);
    if (n === undefined) {
      onChange(undefined);
      setDraft("");
      return;
    }
    if (treatZeroAsEmpty && n === 0) {
      onChange(undefined);
      setDraft("");
      return;
    }
    if (variant === "integer") {
      onChange(Math.round(n));
    } else if (variant === "amount") {
      onChange(Math.round(n * 100) / 100);
    } else {
      onChange(Math.round(n * 1000) / 1000);
    }
    setDraft("");
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next =
      variant === "integer" ? sanitizeIntegerTyping(e.target.value) : sanitizeDecimalTyping(e.target.value);
    setDraft(next);
  }

  const control = (
    <div className={`flex min-w-0 w-full items-center ${wrapperClassName}`}>
      {prefix ? (
        <span className={`mr-2 shrink-0 text-sm font-black ${affixPrefixClass}`}>{prefix}</span>
      ) : null}
      <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
        <input
          id={label ? id : undefined}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          aria-label={ariaLabel ?? label}
          placeholder={placeholder}
          className={`block min-w-full w-max max-w-none bg-transparent text-right font-semibold tabular-nums tracking-tight outline-none placeholder:text-slate-500 ${mergedInputClass}`}
          value={show}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      {suffix ? (
        <span className={`ml-2 shrink-0 text-sm font-black ${affixSuffixClass}`}>{suffix}</span>
      ) : null}
    </div>
  );

  if (!label) {
    return <div className={className ? `min-w-0 ${className}` : "min-w-0"}>{control}</div>;
  }

  return (
    <label className={`flex min-w-0 w-full flex-col gap-0.5 ${labelToneClass} ${className ?? ""}`}>
      <span className="block shrink-0 font-bold">{label}</span>
      {control}
    </label>
  );
}
