"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { buildContributionSeries } from "@/lib/ssf-pension/demo-data";
import type { ContributionStatus } from "@/lib/ssf-pension/types";
import { PensionChrome } from "@/components/pension/PensionChrome";

function statusChip(status: ContributionStatus, light: boolean) {
  if (status === "paid")
    return light
      ? "bg-emerald-100 text-emerald-900 border-emerald-200/80"
      : "bg-emerald-500/15 text-emerald-100 border-emerald-400/25";
  if (status === "pending")
    return light ? "bg-amber-100 text-amber-950 border-amber-200/80" : "bg-amber-500/12 text-amber-100 border-amber-400/25";
  return light ? "bg-rose-100 text-rose-950 border-rose-200/80" : "bg-rose-500/12 text-rose-100 border-rose-400/25";
}

export function SsfContributionHistoryPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const rows = useMemo(() => buildContributionSeries(), []);
  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => b - a), [rows]);
  const [year, setYear] = useState<number | "all">("all");
  const [month, setMonth] = useState<number | "all">("all");

  const filtered = useMemo(() => {
    return rows.filter((r) => (year === "all" || r.year === year) && (month === "all" || r.month === month));
  }, [rows, year, month]);

  const chartData = useMemo(
    () =>
      [...filtered].reverse().map((r) => ({
        label: r.label,
        total: r.employeeNpr + r.employerNpr + r.interestNpr,
      })),
    [filtered],
  );

  const tickColor = light ? "#64748b" : "#a1a1aa";
  const gridColor = light ? "rgba(15, 23, 42, 0.08)" : "rgba(255,255,255, 0.06)";

  return (
    <PensionChrome
      title="Contribution History"
      subtitle="Employee, employer, interest, and payment status — filter by period and reconcile with HR remittance advice."
    >
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Year
          <select
            className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            value={year === "all" ? "all" : String(year)}
            onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
          Month
          <select
            className="rounded-xl border border-slate-200/90 bg-white/90 px-3 py-2 text-sm font-bold text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
            value={month === "all" ? "all" : String(month)}
            onChange={(e) => setMonth(e.target.value === "all" ? "all" : Number(e.target.value))}
          >
            <option value="all">All</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("en", { month: "short" })}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={`wealth-glass p-4 sm:p-5 ${light ? "ring-1 ring-slate-900/[0.04]" : ""}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300/85">Contribution growth</p>
        <div className="mt-3 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" stroke={tickColor} tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} tickLine={false} />
              <YAxis stroke={tickColor} tick={{ fill: tickColor, fontSize: 10, fontWeight: 700 }} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 12,
                  border: light ? "1px solid rgba(13,148,136,0.25)" : "1px solid rgba(45,212,191,0.2)",
                }}
              />
              <Area type="monotone" dataKey="total" stroke="#0d9488" fill="#14b8a633" strokeWidth={2} name="Month total" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-white/10">
        <table className="min-w-[720px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className={`text-[11px] font-black uppercase tracking-[0.12em] ${light ? "bg-slate-50 text-slate-600" : "bg-white/[0.04] text-zinc-400"}`}>
              <th className="px-3 py-3">Period</th>
              <th className="px-3 py-3">Employee</th>
              <th className="px-3 py-3">Employer</th>
              <th className="px-3 py-3">Interest</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-200/60 dark:border-white/[0.06]">
                <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">{r.label}</td>
                <td className="px-3 py-3 font-semibold text-slate-700 dark:text-zinc-300">NPR {r.employeeNpr.toLocaleString("en-IN")}</td>
                <td className="px-3 py-3 font-semibold text-slate-700 dark:text-zinc-300">NPR {r.employerNpr.toLocaleString("en-IN")}</td>
                <td className="px-3 py-3 font-semibold text-slate-700 dark:text-zinc-300">NPR {r.interestNpr.toLocaleString("en-IN")}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black capitalize ${statusChip(r.status, light)}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PensionChrome>
  );
}
