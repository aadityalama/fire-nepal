"use client";

import { Activity, Radio, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { netWorthMonthOverMonthPercent } from "@/components/portfolio/calculations";
import type { NetWorthHistoryPoint } from "@/components/portfolio/types";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";
import { formatMoney } from "@/lib/expense-utils";

function momentumLabel(monthDelta: number | null, momPct: number | null): { text: string; tone: "up" | "down" | "flat" | "idle" } {
  if (monthDelta == null) return { text: "Snapshot runway", tone: "idle" };
  if (monthDelta > 0) {
    if (momPct != null && momPct >= 2.5) return { text: "Surging momentum", tone: "up" };
    if (momPct != null && momPct >= 0.5) return { text: "Steady build", tone: "up" };
    return { text: "Positive drift", tone: "up" };
  }
  if (monthDelta < 0) {
    if (momPct != null && momPct <= -2.5) return { text: "Pullback watch", tone: "down" };
    return { text: "Cooling phase", tone: "down" };
  }
  return { text: "Flat month", tone: "flat" };
}

export function WealthMomentumStrip({
  netWorthNpr,
  monthDelta,
  history,
  liveDeltaNetWorthNpr,
  reducedMotion,
}: {
  netWorthNpr: number;
  monthDelta: number | null;
  history: NetWorthHistoryPoint[];
  liveDeltaNetWorthNpr?: number | null;
  reducedMotion: boolean;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const skip = reducedMotion;

  const momPct = useMemo(() => netWorthMonthOverMonthPercent(history), [history]);
  const mom = useMemo(() => momentumLabel(monthDelta, momPct), [monthDelta, momPct]);

  const nwDisplay = useCountUpNumber(netWorthNpr, { durationMs: 1100, skipAnimation: skip });
  const deltaDisplay = useCountUpNumber(monthDelta ?? 0, { durationMs: 880, skipAnimation: skip || monthDelta == null });
  const pctDisplay = useCountUpNumber(momPct ?? 0, { durationMs: 900, skipAnimation: skip || momPct == null });

  const live = liveDeltaNetWorthNpr != null && Number.isFinite(liveDeltaNetWorthNpr);
  const livePositive = live && (liveDeltaNetWorthNpr as number) >= 0;

  const momBadgeClass =
    mom.tone === "up"
      ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-100 shadow-[0_0_28px_-8px_rgba(52,211,153,0.45)]"
      : mom.tone === "down"
        ? "border-rose-400/35 bg-rose-500/10 text-rose-100 shadow-[0_0_28px_-8px_rgba(244,63,94,0.35)]"
        : mom.tone === "flat"
          ? "border-white/15 bg-white/[0.06] text-zinc-200"
          : "border-white/12 bg-white/[0.04] text-zinc-300";

  const momBadgeClassLight =
    mom.tone === "up"
      ? "border-emerald-300/80 bg-emerald-50/95 text-emerald-900 shadow-sm"
      : mom.tone === "down"
        ? "border-rose-300/80 bg-rose-50/95 text-rose-900 shadow-sm"
        : mom.tone === "flat"
          ? "border-slate-200/90 bg-slate-50/95 text-slate-700"
          : "border-slate-200/80 bg-white/95 text-slate-600";

  return (
    <div
      className={`wealth-momentum-strip relative mb-4 overflow-hidden rounded-[1.35rem] border p-4 sm:p-5 ${
        light
          ? "border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50/40 to-slate-50/90 shadow-[0_0_0_1px_rgba(16,185,129,0.06)_inset,0_20px_48px_-28px_rgba(15,23,42,0.12)]"
          : "border-emerald-400/20 bg-gradient-to-br from-black/55 via-emerald-950/25 to-black/50 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_56px_-28px_rgba(0,0,0,0.55)]"
      }`}
    >
      <div
        className={`wealth-momentum-shimmer pointer-events-none absolute inset-0 ${light ? "opacity-40" : "opacity-100"}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full blur-3xl ${
          light ? "bg-emerald-300/25" : "bg-emerald-500/12"
        }`}
      />
      <div
        className={`pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full blur-3xl ${
          light ? "bg-cyan-200/20" : "bg-cyan-500/8"
        }`}
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={`fn-txt-label text-[10px] font-black uppercase tracking-[0.22em] sm:text-[11px]`}>Net worth</p>
            {live ? (
              <span
                className={`wealth-momentum-live inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  light
                    ? livePositive
                      ? "border-emerald-300/90 bg-emerald-100/90 text-emerald-900"
                      : "border-rose-300/90 bg-rose-100/90 text-rose-900"
                    : livePositive
                      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                      : "border-rose-400/35 bg-rose-500/12 text-rose-200"
                }`}
              >
                <Radio className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2.5} />
                Live quotes
              </span>
            ) : null}
          </div>
          <p
            className={`fn-txt-primary mt-1 font-black tabular-nums tracking-tight ${
              light ? "text-2xl sm:text-3xl md:text-[2.15rem]" : "text-2xl sm:text-4xl md:text-[2.35rem]"
            }`}
          >
            {formatMoney(Math.round(nwDisplay), "NPR")}
          </p>
          <p className={`fn-txt-muted mt-1 max-w-md text-[11px] font-semibold leading-snug sm:text-xs`}>
            Animated total · same ledger math as the grid below
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <div
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2.5 sm:min-h-[3.25rem] sm:px-3.5 ${
              light ? "border-slate-200/90 bg-white/90" : "border-white/10 bg-white/[0.05]"
            }`}
          >
            {monthDelta != null && monthDelta >= 0 ? (
              <TrendingUp className={`h-4 w-4 shrink-0 ${light ? "text-emerald-600" : "text-emerald-400"}`} />
            ) : monthDelta != null ? (
              <TrendingDown className={`h-4 w-4 shrink-0 ${light ? "text-rose-600" : "text-rose-400"}`} />
            ) : (
              <Activity className={`h-4 w-4 shrink-0 ${light ? "text-slate-400" : "text-zinc-500"}`} />
            )}
            <div className="min-w-0">
              <p className={`fn-txt-label text-[9px] font-black uppercase tracking-wide`}>This month</p>
              <p
                className={`mt-0.5 text-sm font-black tabular-nums sm:text-base ${
                  monthDelta == null
                    ? "fn-txt-muted"
                    : monthDelta >= 0
                      ? "fn-positive"
                      : "fn-negative"
                }`}
              >
                {monthDelta == null ? (
                  "—"
                ) : (
                  <>
                    {monthDelta >= 0 ? "+" : "−"}
                    {formatMoney(Math.round(Math.abs(deltaDisplay)), "NPR")}
                  </>
                )}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2.5 sm:min-h-[3.25rem] sm:px-3.5 ${
              light ? "border-slate-200/90 bg-white/90" : "border-white/10 bg-white/[0.05]"
            }`}
          >
            <div className="min-w-0">
              <p className={`fn-txt-label text-[9px] font-black uppercase tracking-wide`}>Vs last month</p>
              <p
                className={`mt-0.5 text-sm font-black tabular-nums sm:text-base ${
                  momPct == null ? "fn-txt-muted" : momPct >= 0 ? "fn-positive" : "fn-negative"
                }`}
              >
                {momPct == null ? "—" : `${momPct >= 0 ? "+" : "−"}${Math.abs(pctDisplay).toFixed(1)}%`}
              </p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 sm:px-3.5 ${light ? momBadgeClassLight : momBadgeClass}`}
          >
            <Activity className="h-4 w-4 shrink-0 opacity-90" />
            <span className="text-xs font-black leading-tight sm:text-sm">{mom.text}</span>
          </div>
        </div>
      </div>

      {live ? (
        <div
          className={`relative mt-4 flex flex-wrap items-center gap-2 border-t pt-4 ${
            light ? "border-slate-200/80" : "border-white/[0.08]"
          }`}
        >
          <span className={`fn-txt-label text-[10px] font-black uppercase tracking-wide`}>Session delta</span>
          <span
            className={`text-sm font-black tabular-nums sm:text-base ${
              livePositive ? "fn-positive" : "fn-negative"
            }`}
          >
            {livePositive ? "+" : ""}
            {formatMoney(Math.round(liveDeltaNetWorthNpr as number), "NPR")}
          </span>
          <span className={`fn-txt-muted text-[10px] font-semibold sm:text-xs`}>vs stored baseline while markets refresh</span>
        </div>
      ) : null}
    </div>
  );
}
