"use client";

import {
  formatFundamentalDate,
  formatFundamentalValue,
} from "@/lib/market/nepse-fundamentals-format";
import { DATA_UNAVAILABLE, type NepseCompanyDividendRow } from "@/types/market/nepse-company-fundamentals";

export function CompanyDividendTable({ rows }: { rows: NepseCompanyDividendRow[] }) {
  if (!rows.length) {
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/[0.06]" data-testid="company-dividends">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-slate-50/90 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-white/[0.03] dark:text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">Fiscal Year</th>
              <th className="px-3 py-2.5">Bonus %</th>
              <th className="px-3 py-2.5">Cash %</th>
              <th className="px-3 py-2.5">Book Close</th>
              <th className="px-3 py-2.5">AGM Date</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-200/70 dark:border-white/[0.06]">
              <td className="px-3 py-3 text-slate-500 dark:text-zinc-500" colSpan={5}>
                {DATA_UNAVAILABLE}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 dark:border-white/[0.06]" data-testid="company-dividends">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50/90 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-white/[0.03] dark:text-zinc-500">
          <tr>
            <th className="px-3 py-2.5">Fiscal Year</th>
            <th className="px-3 py-2.5">Bonus %</th>
            <th className="px-3 py-2.5">Cash %</th>
            <th className="px-3 py-2.5">Book Close</th>
            <th className="px-3 py-2.5">AGM Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-200/70 dark:border-white/[0.06]">
              <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-zinc-200">{row.fiscalYear}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatFundamentalValue(row.bonusPct, { style: "pct" })}</td>
              <td className="px-3 py-2.5 tabular-nums">{formatFundamentalValue(row.cashPct, { style: "pct" })}</td>
              <td className="px-3 py-2.5">{formatFundamentalDate(row.bookCloseDate)}</td>
              <td className="px-3 py-2.5">{formatFundamentalDate(row.agmDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
