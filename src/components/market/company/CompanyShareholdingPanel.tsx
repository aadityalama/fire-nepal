"use client";

import { formatFundamentalValue } from "@/lib/market/nepse-fundamentals-format";
import { DATA_UNAVAILABLE, type NepseCompanyShareholding } from "@/types/market/nepse-company-fundamentals";

const SLICES = [
  { key: "promoterPct" as const, label: "Promoter", color: "bg-emerald-500" },
  { key: "publicPct" as const, label: "Public", color: "bg-teal-400" },
  { key: "otherPct" as const, label: "Others", color: "bg-slate-400" },
];

export function CompanyShareholdingPanel({ shareholding }: { shareholding: NepseCompanyShareholding }) {
  const hasPct = SLICES.some((slice) => shareholding[slice.key] != null);
  const widths = SLICES.map((slice) => {
    const pct = shareholding[slice.key];
    return pct != null && pct > 0 ? pct : hasPct ? 0 : 33.33;
  });

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_0.9fr]" data-testid="company-shareholding">
      <div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.05]" aria-hidden>
          {SLICES.map((slice, index) => (
            <div
              key={slice.label}
              className={`${slice.color} h-full ${hasPct ? "" : "opacity-35"}`}
              style={{ width: `${Math.max(widths[index], 0)}%` }}
            />
          ))}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {SLICES.map((slice) => (
            <li
              key={slice.label}
              className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.025]"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${slice.color}`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">{slice.label}</span>
              </div>
              <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
                {formatFundamentalValue(shareholding[slice.key], { style: "pct" })}
              </p>
            </li>
          ))}
          <li className="rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500">Listed shares</span>
            <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
              {formatFundamentalValue(shareholding.listedShares, { style: "shares" })}
            </p>
          </li>
        </ul>
      </div>
      <div className="grid min-h-36 place-items-center rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/60 p-6 text-center dark:border-white/10 dark:bg-white/[0.02]">
        <div className="max-w-md">
          <p className="text-sm font-black text-slate-800 dark:text-zinc-200">
            {hasPct ? "Ownership from fundamentals registry" : DATA_UNAVAILABLE}
          </p>
          <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
            Promoter and public share counts populate from the company profile feed — never estimated from price action.
          </p>
        </div>
      </div>
    </div>
  );
}
