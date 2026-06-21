"use client";

import { Percent } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { FireBizEmptyState, FireBizGlassCard, FireBizInput } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBiz, useFireBizCopy } from "@/contexts/FireBizContext";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { computeVatReport, vatReportTotals } from "@/lib/fire-biz/vat";
import { defaultProfitLossRange } from "@/lib/fire-biz/profit-loss";
import { formatBizNpr } from "@/lib/fire-biz/i18n";

export function FireBizVatReportsPage() {
  const copy = useFireBizCopy();
  const vr = copy.vatReport;
  const { sales } = useFireBiz();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const defaults = defaultProfitLossRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const rows = useMemo(() => computeVatReport(sales, from, to), [sales, from, to]);
  const totals = useMemo(() => vatReportTotals(rows), [rows]);

  return (
    <div className="space-y-6">
      <DashboardSectionHeader eyebrow={copy.moduleName} title={vr.title} subtitle={vr.subtitle} />
      <Link href="/fire-biz/reports" className="text-sm font-bold text-emerald-400 hover:underline">← {vr.backToReports}</Link>

      <div className="grid gap-4 sm:grid-cols-2">
        <FireBizInput label={vr.from} value={from} onChange={setFrom} type="date" />
        <FireBizInput label={vr.to} value={to} onChange={setTo} type="date" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{vr.invoices}</p>
          <p className="mt-1 text-xl font-black tabular-nums">{totals.invoiceCount}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{vr.taxableSales}</p>
          <p className="mt-1 text-xl font-black tabular-nums">{formatBizNpr(totals.taxableSales)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${light ? "border-emerald-200/70 bg-white/90" : "border-emerald-400/15 bg-emerald-950/35"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{vr.vatCollected}</p>
          <p className="mt-1 text-xl font-black tabular-nums text-lime-400">{formatBizNpr(totals.vatCollected)}</p>
        </div>
      </div>

      <FireBizGlassCard title={vr.monthlyBreakdown} icon={Percent}>
        {rows.length === 0 ? (
          <FireBizEmptyState message={vr.empty} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className={`border-b text-[10px] font-black uppercase tracking-wider ${light ? "border-emerald-100 text-slate-500" : "border-emerald-400/20 text-emerald-200/60"}`}>
                  <th className="py-2 pr-3">{vr.month}</th>
                  <th className="py-2 pr-3 text-right">{vr.invoices}</th>
                  <th className="py-2 pr-3 text-right">{vr.taxableSales}</th>
                  <th className="py-2 text-right">{vr.vatCollected}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.month} className={`border-b ${light ? "border-emerald-50" : "border-emerald-400/10"}`}>
                    <td className="py-2.5 pr-3 font-semibold">{row.month}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{row.invoiceCount}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{formatBizNpr(row.taxableSales)}</td>
                    <td className="py-2.5 text-right tabular-nums font-bold text-lime-400">{formatBizNpr(row.vatCollected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FireBizGlassCard>
    </div>
  );
}
