"use client";

import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizGlassCard, FireBizInput } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { computeProfitLoss, defaultProfitLossRange } from "@/lib/fire-biz/profit-loss";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizProfitLossPage() {
  const copy = useFireBizCopy();
  const pl = copy.profitLoss;
  const { sales, purchases, transactions } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const defaults = defaultProfitLossRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const report = useMemo(
    () => computeProfitLoss(sales, purchases, transactions, from, to),
    [sales, purchases, transactions, from, to],
  );

  const rows = [
    { label: pl.revenue, value: report.revenue, accent: "text-lime-400" },
    { label: pl.purchases, value: report.purchases, accent: "text-amber-300" },
    { label: pl.expenses, value: report.expenses, accent: "text-rose-300" },
    { label: pl.grossProfit, value: report.grossProfit, accent: report.grossProfit >= 0 ? "text-lime-400" : "text-rose-400" },
    { label: pl.netProfit, value: report.netProfit, accent: report.netProfit >= 0 ? "text-emerald-400" : "text-rose-400", bold: true },
  ];

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={pl.title} subtitle={pl.subtitle} />
      <Link href="/fire-biz/reports" className="text-sm font-bold text-emerald-400 hover:underline">← {pl.backToReports}</Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <FireBizInput label={pl.from} value={from} onChange={setFrom} type="date" />
        <FireBizInput label={pl.to} value={to} onChange={setTo} type="date" />
      </div>

      <FireBizGlassCard title={pl.statement} icon={TrendingUp}>
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
              } ${row.bold ? "ring-1 ring-emerald-400/20" : ""}`}
            >
              <span className={`text-sm ${row.bold ? "font-black" : "font-semibold"}`}>{row.label}</span>
              <span className={`tabular-nums ${row.bold ? "text-lg font-black" : "text-sm font-bold"} ${row.accent}`}>
                {formatBizNpr(row.value)}
              </span>
            </div>
          ))}
        </div>
      </FireBizGlassCard>
    </div>
  );
}
