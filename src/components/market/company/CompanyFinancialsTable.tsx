"use client";

import { formatFundamentalValue } from "@/lib/market/nepse-fundamentals-format";
import { DATA_UNAVAILABLE, type NepseCompanyFinancialRow } from "@/types/market/nepse-company-fundamentals";

const LINE_ITEMS: { key: keyof NepseCompanyFinancialRow; label: string }[] = [
  { key: "revenueNpr", label: "Revenue" },
  { key: "operatingProfitNpr", label: "Operating Profit" },
  { key: "netProfitNpr", label: "Net Profit" },
  { key: "reservesNpr", label: "Reserves" },
  { key: "cashNpr", label: "Cash" },
  { key: "borrowingsNpr", label: "Borrowings" },
  { key: "assetsNpr", label: "Assets" },
  { key: "liabilitiesNpr", label: "Liabilities" },
];

export function CompanyFinancialsTable({ rows }: { rows: NepseCompanyFinancialRow[] }) {
  const columns = rows.slice(0, 3);
  while (columns.length < 3) {
    columns.push({
      symbol: "",
      fiscalYear: DATA_UNAVAILABLE,
      periodLabel: null,
      revenueNpr: null,
      operatingProfitNpr: null,
      netProfitNpr: null,
      reservesNpr: null,
      cashNpr: null,
      borrowingsNpr: null,
      assetsNpr: null,
      liabilitiesNpr: null,
      source: null,
    });
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/70 [-webkit-overflow-scrolling:touch] dark:border-white/[0.06]" data-testid="company-financials">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-slate-50/90 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-white/[0.03] dark:text-zinc-500">
          <tr>
            <th className="sticky left-0 z-[2] bg-slate-50/95 px-3 py-2.5 shadow-[1px_0_0_rgba(148,163,184,0.25)] dark:bg-[#0a1713] dark:shadow-[1px_0_0_rgba(255,255,255,0.06)]">
              Line item
            </th>
            {columns.map((col, index) => (
              <th key={`${col.fiscalYear}-${index}`} className="px-3 py-2.5">
                {col.periodLabel ?? col.fiscalYear}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LINE_ITEMS.map((item) => (
            <tr key={item.key} className="border-t border-slate-200/70 dark:border-white/[0.06]">
              <td className="sticky left-0 z-[1] bg-white px-3 py-2.5 font-bold text-slate-800 shadow-[1px_0_0_rgba(148,163,184,0.25)] dark:bg-[#071512] dark:text-zinc-200 dark:shadow-[1px_0_0_rgba(255,255,255,0.06)]">
                {item.label}
              </td>
              {columns.map((col, index) => (
                <td key={`${item.key}-${index}`} className="px-3 py-2.5 tabular-nums whitespace-nowrap text-slate-700 dark:text-zinc-300">
                  {formatFundamentalValue(col[item.key] as number | null, { style: "compactNpr" })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
