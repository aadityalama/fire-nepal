"use client";

import { Download, Pencil, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { formatNpr, portfolioRows } from "@/data/fire-premium-dashboard";
import { PremiumGlassCard } from "@/components/portfolio/premium/PremiumGlassCard";

function formatPct(n: number) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function AssetsDataTable() {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return portfolioRows;
    return portfolioRows.filter((r) => r.name.toLowerCase().includes(s) || r.type.toLowerCase().includes(s));
  }, [q]);

  return (
    <PremiumGlassCard className="w-full min-w-0 max-w-none p-3 sm:p-4 xl:p-3">
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 sm:text-[11px]">My portfolio</p>
          <p className="text-[10px] font-medium text-zinc-400/95 sm:text-xs">Live allocation view · demo ledger</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <div className="relative min-w-0 flex-1 sm:max-w-md sm:min-w-[180px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 sm:left-3" strokeWidth={2} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search assets…"
              className="min-h-[44px] w-full rounded-lg border border-white/[0.1] bg-black/45 py-2 pl-9 pr-2.5 text-[11px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none backdrop-blur-md transition-all duration-500 placeholder:text-zinc-600 focus:border-emerald-400/40 focus:shadow-[0_0_32px_-14px_rgba(52,211,153,0.18)] focus:ring-2 focus:ring-emerald-500/25 sm:rounded-xl sm:py-2.5 sm:pl-10 sm:pr-3 sm:text-xs"
            />
          </div>
          <button
            type="button"
            className="inline-flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.05] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition-all duration-500 hover:border-emerald-400/35 hover:bg-emerald-500/[0.08] hover:text-white hover:shadow-[0_0_28px_-12px_rgba(52,211,153,0.2)] sm:rounded-xl"
            aria-label="Export"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Mobile / tablet: stacked cards — no horizontal page break */}
      <ul className="relative z-10 mt-3 list-none space-y-2.5 lg:hidden">
        {rows.map((r) => {
          const pl = r.currentNpr - r.purchaseNpr;
          const plPos = pl >= 0;
          return (
            <li
              key={r.id}
              className="rounded-xl border border-white/[0.08] bg-black/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04] backdrop-blur-sm transition motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:border-emerald-400/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{r.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-zinc-400">
                    {r.type} · {r.category}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-lg border border-white/[0.1] text-zinc-400 transition-all duration-500 hover:border-emerald-400/35 hover:bg-emerald-500/10 hover:text-emerald-200"
                    aria-label={`Edit ${r.name}`}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="grid h-11 w-11 place-items-center rounded-lg border border-white/[0.1] text-zinc-500 transition-all duration-500 hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-200"
                    aria-label={`Delete ${r.name}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] sm:grid-cols-3">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-zinc-500">Purchase</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-zinc-200">{formatNpr(r.purchaseNpr)}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-zinc-500">Current</dt>
                  <dd className="mt-0.5 font-bold tabular-nums text-white">{formatNpr(r.currentNpr)}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-zinc-500">CAGR</dt>
                  <dd className={`mt-0.5 font-bold tabular-nums ${r.cagrPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{formatPct(r.cagrPct)}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-zinc-500">P/L</dt>
                  <dd className={`mt-0.5 font-bold tabular-nums ${plPos ? "text-emerald-400" : "text-rose-400"}`}>{formatNpr(pl)}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="font-semibold uppercase tracking-wide text-zinc-500">Alloc %</dt>
                  <dd className="mt-0.5 font-bold tabular-nums text-zinc-200">{r.allocationPct.toFixed(1)}%</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>

      <div className="relative z-10 mt-3 hidden w-full overflow-x-auto rounded-lg border border-white/[0.08] bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.04] backdrop-blur-sm sm:mt-4 sm:rounded-xl lg:block lg:max-h-[min(36vh,280px)] lg:overflow-y-auto xl:max-h-[min(32vh,260px)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-[11px] sm:min-w-[780px] sm:text-xs">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-white/[0.08] bg-zinc-950/90 text-[9px] font-semibold uppercase tracking-[0.1em] text-zinc-400 backdrop-blur-md sm:text-[10px] lg:bg-zinc-950/95">
              <th className="px-2 py-2 sm:px-2.5">Asset</th>
              <th className="px-2 py-2 sm:px-2.5">Type</th>
              <th className="px-2 py-2 sm:px-2.5">Category</th>
              <th className="px-2 py-2 text-right sm:px-2.5">Purchase</th>
              <th className="px-2 py-2 text-right sm:px-2.5">Current</th>
              <th className="px-2 py-2 text-right sm:px-2.5">CAGR</th>
              <th className="px-2 py-2 text-right sm:px-2.5">P/L</th>
              <th className="px-2 py-2 text-right sm:px-2.5">Alloc %</th>
              <th className="px-2 py-2 text-right sm:px-2.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pl = r.currentNpr - r.purchaseNpr;
              const plPos = pl >= 0;
              return (
                <tr
                  key={r.id}
                  className="border-b border-white/[0.05] text-[10px] font-medium text-zinc-300 transition-colors duration-500 ease-out last:border-0 hover:bg-emerald-500/[0.07] sm:text-[11px]"
                >
                  <td className="px-2 py-2 font-semibold text-white sm:px-2.5">{r.name}</td>
                  <td className="px-2 py-2 sm:px-2.5">{r.type}</td>
                  <td className="px-2 py-2 text-zinc-400 sm:px-2.5">{r.category}</td>
                  <td className="px-2 py-2 text-right tabular-nums sm:px-2.5">{formatNpr(r.purchaseNpr)}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-white sm:px-2.5">{formatNpr(r.currentNpr)}</td>
                  <td className={`px-2 py-2 text-right tabular-nums sm:px-2.5 ${r.cagrPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatPct(r.cagrPct)}
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums font-semibold sm:px-2.5 ${plPos ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatNpr(pl)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-zinc-200 sm:px-2.5">{r.allocationPct.toFixed(1)}%</td>
                  <td className="px-2 py-2 text-right sm:px-2.5">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.1] text-zinc-400 transition-all duration-500 hover:border-emerald-400/35 hover:bg-emerald-500/10 hover:text-emerald-200 sm:h-8 sm:w-8 sm:rounded-lg"
                        aria-label={`Edit ${r.name}`}
                      >
                        <Pencil className="h-3 w-3" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-md border border-white/[0.1] text-zinc-500 transition-all duration-500 hover:border-rose-400/35 hover:bg-rose-500/10 hover:text-rose-200 sm:h-8 sm:w-8 sm:rounded-lg"
                        aria-label={`Delete ${r.name}`}
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PremiumGlassCard>
  );
}
