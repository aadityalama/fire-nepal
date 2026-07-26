"use client";

import { formatFundamentalValue } from "@/lib/market/nepse-fundamentals-format";

const eyebrow = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500";

export type CompanyMetricItem = {
  label: string;
  value: number | string | null | undefined;
  style?: "number" | "npr" | "compactNpr" | "pct" | "shares" | "text";
  digits?: number;
  hint?: string;
};

export function CompanyMetricTile({ label, value, style = "number", digits, hint }: CompanyMetricItem) {
  const display =
    style === "text" || typeof value === "string"
      ? typeof value === "string" && value.trim()
        ? value
        : formatFundamentalValue(null)
      : formatFundamentalValue(typeof value === "number" ? value : null, { style, digits });

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
      <p className={eyebrow}>{label}</p>
      <p className="mt-2 truncate text-sm font-black tabular-nums text-slate-950 dark:text-white sm:text-base">{display}</p>
      {hint ? <p className="mt-1 text-[10px] font-semibold text-slate-400 dark:text-zinc-600">{hint}</p> : null}
    </div>
  );
}

export function CompanyMetricGrid({
  items,
  testId,
  className = "grid grid-cols-2 gap-2 sm:grid-cols-3",
}: {
  items: CompanyMetricItem[];
  testId?: string;
  className?: string;
}) {
  return (
    <div className={className} data-testid={testId}>
      {items.map((item) => (
        <CompanyMetricTile key={item.label} {...item} />
      ))}
    </div>
  );
}
