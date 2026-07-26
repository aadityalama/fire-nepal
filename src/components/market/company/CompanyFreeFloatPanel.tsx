"use client";

import { CompanyMetricGrid, type CompanyMetricItem } from "@/components/market/company/CompanyMetricGrid";
import { formatFundamentalValue } from "@/lib/market/nepse-fundamentals-format";
import { buildFreeFloatAnalytics, type FreeFloatInputs } from "@/lib/market/nepse-free-float";
import { DATA_UNAVAILABLE } from "@/types/market/nepse-company-fundamentals";

const eyebrow = "text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500";

function ProgressCard({
  label,
  pct,
  barClass,
  hint,
}: {
  label: string;
  pct: number | null;
  barClass: string;
  hint?: string;
}) {
  const width = pct != null && pct > 0 ? Math.min(pct, 100) : 0;
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 dark:border-white/[0.06] dark:bg-white/[0.025]">
      <div className="flex items-baseline justify-between gap-2">
        <p className={eyebrow}>{label}</p>
        <p className="text-sm font-black tabular-nums text-slate-950 dark:text-white">
          {formatFundamentalValue(pct, { style: "pct" })}
        </p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/[0.06]" aria-hidden>
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barClass} ${pct == null ? "opacity-30" : ""}`}
          style={{ width: pct == null ? "18%" : `${width}%` }}
        />
      </div>
      {hint ? <p className="mt-2 text-[10px] font-semibold leading-relaxed text-slate-400 dark:text-zinc-600">{hint}</p> : null}
    </div>
  );
}

export function CompanyFreeFloatPanel({ input }: { input: FreeFloatInputs }) {
  const analytics = buildFreeFloatAnalytics(input);
  const hasCore = analytics.freeFloatShares != null || analytics.listedShares != null;

  const metricItems: CompanyMetricItem[] = [
    { label: "Total Listed Shares", value: analytics.listedShares, style: "shares" },
    { label: "Promoter Shares", value: analytics.promoterShares, style: "shares" },
    { label: "Public Shares", value: analytics.publicShares, style: "shares" },
    { label: "Free Float Shares", value: analytics.freeFloatShares, style: "shares" },
    { label: "Free Float %", value: analytics.freeFloatPct, style: "pct" },
    { label: "Locked Shares", value: analytics.lockedShares, style: "shares" },
    { label: "Tradable Shares", value: analytics.tradableShares, style: "shares" },
    { label: "Today's Traded Shares", value: analytics.todayTradedShares, style: "shares" },
    { label: "Today's Traded % of Free Float", value: analytics.todayTradedPctOfFreeFloat, style: "pct", digits: 4 },
    { label: "Today's Traded % of Listed", value: analytics.todayTradedPctOfListed, style: "pct", digits: 4 },
  ];

  return (
    <div className="space-y-3" data-testid="company-free-float">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className={eyebrow}>Free float</p>
          <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">How many shares can actually trade</p>
        </div>
        {!hasCore ? (
          <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-500">{DATA_UNAVAILABLE}</p>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <ProgressCard
          label="Free Float Progress"
          pct={analytics.freeFloatPct}
          barClass="bg-gradient-to-r from-emerald-500 to-teal-400"
          hint="Public / free-float shares as % of listed"
        />
        <ProgressCard
          label="Promoter Ownership %"
          pct={analytics.promoterOwnershipPct}
          barClass="bg-emerald-600"
          hint="Locked promoter holding"
        />
        <ProgressCard
          label="Public Ownership %"
          pct={analytics.publicOwnershipPct}
          barClass="bg-teal-400"
          hint="Published public shareholding"
        />
        <ProgressCard
          label="Today's Market Participation %"
          pct={analytics.marketParticipationPct}
          barClass="bg-gradient-to-r from-amber-400 to-orange-500"
          hint="Today's volume ÷ free float"
        />
      </div>

      <CompanyMetricGrid
        items={metricItems}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        testId="company-free-float-metrics"
      />

      <p className="text-[10px] font-medium leading-relaxed text-slate-500 dark:text-zinc-500">
        Free float uses published public shares when available; otherwise listed − promoter. Locked shares follow
        promoter holding. Volume ratios use today&apos;s session volume only — never estimated.
      </p>
    </div>
  );
}
