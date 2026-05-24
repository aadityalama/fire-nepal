"use client";

import type { PortfolioDisplayCurrency } from "@/lib/portfolio-convert";

export function CurrencySelect({
  value,
  onChange,
  className = "",
}: {
  value: PortfolioDisplayCurrency;
  onChange: (c: PortfolioDisplayCurrency) => void;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PortfolioDisplayCurrency)}
      className={`wealth-input w-full px-2 py-2 text-xs font-black sm:text-sm ${className}`}
    >
      <option value="NPR">NPR</option>
      <option value="KRW">KRW</option>
      <option value="USD">USD</option>
    </select>
  );
}
