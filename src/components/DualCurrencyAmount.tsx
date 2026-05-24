"use client";

import { nprToKrw } from "@/lib/exchange-rate";
import { formatMoney } from "@/lib/expense-utils";
import type { Currency } from "@/lib/expense-utils";

type DualCurrencyAmountProps = {
  amountNpr: number;
  krwPerNpr: number;
  currency?: Currency;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function DualCurrencyAmount({
  amountNpr,
  krwPerNpr,
  currency = "NPR",
  size = "md",
  className = "",
}: DualCurrencyAmountProps) {
  const krw = nprToKrw(amountNpr, krwPerNpr);
  const primary =
    currency === "KRW"
      ? `₩ ${krw.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : formatMoney(amountNpr, currency);

  const sizeClass =
    size === "lg" ? "text-2xl sm:text-3xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className={className}>
      <p className={`font-black text-emerald-800 ${sizeClass}`}>{primary}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-500">
        {currency === "KRW" ? formatMoney(amountNpr, "NPR") : `₩ ${krw.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
        <span className="mx-1 text-emerald-300">·</span>
        <span className="text-emerald-600">KRW ↔ NPR live</span>
      </p>
    </div>
  );
}
