"use client";

import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { NepseQuoteMiniCard } from "@/components/market/NepseQuoteMiniCard";
import { useNepseWatchlist } from "@/hooks/useNepseWatchlist";
import { formatMoney } from "@/lib/expense-utils";
import { useRealtimeMarket } from "@/providers/realtime-provider";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-50">{value}</p>
    </div>
  );
}

/**
 * Dashboard-embedded NEPSE board: overview, movers, activity, forex — no full-page terminal.
 */
export function NepseDashboardTerminalSection() {
  const { snapshot, status, error } = useRealtimeMarket();
  const { toggle, isWatched } = useNepseWatchlist();

  const term = snapshot?.nepseTerminal;
  const fx = snapshot?.forex;
  const idx = snapshot?.nepseIndex;

  const overview = useMemo(() => {
    if (!term && !idx) return null;
    const parts: { label: string; value: string }[] = [];
    if (idx) {
      const ch =
        idx.changePct != null && Number.isFinite(idx.changePct)
          ? ` (${idx.changePct >= 0 ? "+" : ""}${idx.changePct.toFixed(2)}%)`
          : "";
      parts.push({ label: "NEPSE index", value: `${idx.name} ${idx.value.toFixed(2)}${ch}` });
    }
    if (term) {
      parts.push({ label: "Listings", value: term.totalsListed.toLocaleString() });
      parts.push({ label: "Session turnover", value: formatMoney(term.totalTurnoverNpr, "NPR") });
      parts.push({
        label: "Breadth",
        value: `↑${term.breadth.advancing} · ↓${term.breadth.declining} · flat ${term.breadth.unchanged}`,
      });
      parts.push({ label: "Advance / decline", value: term.breadth.advanceDeclineRatio.toFixed(2) });
    }
    return parts;
  }, [term, idx]);

  if (!snapshot && status === "loading") {
    return (
      <section className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-white/[0.06]" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white/[0.05]" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-white/[0.09] bg-white/[0.025] p-4 backdrop-blur-md sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">NEPSE Terminal</h2>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">Live board snapshot · updates with your portfolio feed</p>
        </div>
        {error ? <p className="text-xs font-semibold text-rose-300/90">{error}</p> : null}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Market overview</p>
        {overview?.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {overview.map((s) => (
              <Stat key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Market overview will appear when the feed returns index or listings.</p>
        )}
      </div>

      {term ? (
        <div className="mb-5 grid gap-3 lg:grid-cols-3">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-lime-200/80">
              <TrendingUp size={12} aria-hidden />
              Top gainers
            </div>
            <div className="grid max-h-[200px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {term.topGainers.map((t) => (
                <NepseQuoteMiniCard key={t.symbol} t={t} watched={isWatched(t.symbol)} onWatch={toggle} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200/80">
              <TrendingDown size={12} aria-hidden />
              Top losers
            </div>
            <div className="grid max-h-[200px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {term.topLosers.map((t) => (
                <NepseQuoteMiniCard key={t.symbol} t={t} watched={isWatched(t.symbol)} onWatch={toggle} />
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">
              <Activity size={12} aria-hidden />
              Most active
            </div>
            <div className="grid max-h-[200px] gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {term.mostActive.map((t) => (
                <NepseQuoteMiniCard key={t.symbol} t={t} watched={isWatched(t.symbol)} onWatch={toggle} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {fx ? (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Forex rates</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label="KRW / NPR" value={fx.krwPerNpr.toFixed(4)} />
            <Stat label="USD / NPR" value={fx.usdPerNpr.toFixed(6)} />
            <Stat label="NPR / USD" value={fx.nprPerUsd.toFixed(4)} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
