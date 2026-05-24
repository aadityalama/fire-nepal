"use client";

import { Activity, Coins, Gem, Globe2, LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/expense-utils";
import { estimateLiveCagrPct } from "@/services/portfolio/cagr-live";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useRealtimeMarket } from "@/providers/realtime-provider";

function GlowDelta({ value }: { value: number }) {
  const pos = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums ${
        pos
          ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-200 shadow-[0_0_18px_-4px_rgba(52,211,153,0.55)]"
          : "border border-rose-400/35 bg-rose-500/10 text-rose-200 shadow-[0_0_18px_-4px_rgba(251,113,133,0.45)]"
      }`}
    >
      {pos ? <TrendingUp size={11} aria-hidden /> : <TrendingDown size={11} aria-hidden />}
      {pos ? "+" : ""}
      {formatMoney(value, "NPR")}
    </span>
  );
}

export function LiveMarketStrip() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(t);
  }, []);

  const { state, totals, krwPerNpr, usdPerNpr } = useWealthPortfolio();
  const { snapshot, status, error, overlay } = useRealtimeMarket();

  const cagrLive = useMemo(() => {
    if (!overlay) return null;
    return estimateLiveCagrPct(state.netWorthHistory, overlay.totalsLive.netWorthNpr);
  }, [overlay, state.netWorthHistory]);

  if (!mounted) {
    return (
      <section
        className="relative mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-inner shadow-black/30"
        aria-busy
      >
        <div className="h-24 animate-pulse rounded-xl bg-white/[0.06]" />
      </section>
    );
  }

  const idx = snapshot?.nepseIndex;
  const breadth = snapshot?.nepseTerminal?.breadth;
  const btc = snapshot?.crypto.bitcoin?.lastUsd;
  const spy = snapshot?.usdEquities.SPY?.lastUsd;
  const nprUsd = snapshot?.forex.nprPerUsd;
  const goldOz = snapshot?.metalsUsdOz.goldUsdPerOz;

  return (
    <section className="relative mb-6 overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/35 via-zinc-950/80 to-zinc-950/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/90">
            <Activity size={12} className="text-emerald-300" aria-hidden />
            Live market
          </span>
          {snapshot?.partial ? (
            <span className="text-[10px] font-bold text-amber-200/80">Partial feed</span>
          ) : null}
          {status === "loading" && !snapshot ? (
            <span className="text-[10px] font-bold text-zinc-500">Warming quotes…</span>
          ) : null}
          {error ? <span className="text-[10px] font-bold text-rose-300/90">{error}</span> : null}
        </div>
        {overlay ? (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-zinc-300">
            <span className="text-zinc-500">Live vs baseline NW</span>
            <GlowDelta value={overlay.deltaNetWorthNpr} />
            {cagrLive != null && Number.isFinite(cagrLive) ? (
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-zinc-200">
                Live CAGR ~{cagrLive.toFixed(1)}% /yr
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="relative mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
            <LineChart size={14} className="text-lime-300" aria-hidden />
            NEPSE
          </div>
          <p className="mt-1.5 text-lg font-black tabular-nums text-white">
            {idx ? formatMoney(idx.value, "NPR") : "—"}
          </p>
          {idx?.changePct != null ? (
            <p className={`text-xs font-bold ${idx.changePct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {idx.changePct >= 0 ? "+" : ""}
              {idx.changePct.toFixed(2)}%
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500">Index mirror</p>
          )}
          {breadth ? (
            <p className="mt-1 text-[10px] font-bold text-zinc-500">
              Breadth ↑{breadth.advancing} ↓{breadth.declining} · A/D {breadth.advanceDeclineRatio.toFixed(2)}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
            <Globe2 size={14} className="text-cyan-300" aria-hidden />
            FX (NPR / USD / KRW)
          </div>
          <p className="mt-1.5 text-sm font-black tabular-nums text-white">
            {nprUsd ? `1 USD ≈ ${formatMoney(nprUsd, "NPR")}` : "—"}
          </p>
          <p className="text-[11px] font-bold text-zinc-400">
            1 NPR ≈{" "}
            {(snapshot?.forex.krwPerNpr ?? krwPerNpr).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            KRW (live) · USD/NPR {(snapshot?.forex.usdPerNpr ?? usdPerNpr).toFixed(5)}
          </p>
          {snapshot?.fetchedAt ? (
            <p className="mt-1 text-[10px] font-bold text-zinc-500">
              Quotes as of {new Date(snapshot.fetchedAt).toLocaleTimeString()}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
            <Coins size={14} className="text-amber-300" aria-hidden />
            Risk assets
          </div>
          <p className="mt-1.5 text-sm font-black text-white">
            BTC {btc != null ? `$${btc.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          </p>
          <p className="text-[11px] font-bold text-zinc-400">SPY {spy != null ? `$${spy.toFixed(2)}` : "—"}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/35 px-3 py-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-500">
            <Gem size={14} className="text-violet-300" aria-hidden />
            Bullion spot (USD/oz)
          </div>
          <p className="mt-1.5 text-sm font-black text-white">
            Au {goldOz != null ? `$${goldOz.toFixed(0)}` : "—"} · Ag{" "}
            {snapshot?.metalsUsdOz.silverUsdPerOz != null ? `$${snapshot.metalsUsdOz.silverUsdPerOz.toFixed(2)}` : "—"}
          </p>
          <p className="text-[11px] text-zinc-500">Marks metals in your vault tab</p>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500">
        <span>Stored NW (ledger) {formatMoney(totals.netWorthNpr, "NPR")}</span>
        {overlay ? (
          <span className="text-emerald-200/80">
            Live NW {formatMoney(overlay.totalsLive.netWorthNpr, "NPR")} · inv. P/L{" "}
            {formatMoney(overlay.totalsLive.investmentsPnlNpr, "NPR")}
          </span>
        ) : null}
      </div>
    </section>
  );
}
