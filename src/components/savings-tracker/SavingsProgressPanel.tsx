"use client";

import { useMemo } from "react";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { MONTHLY_SAVINGS_SERIES, SAVINGS_DASH_META } from "@/components/savings-tracker/savings-tracker-data";
import { formatKrwInteger } from "@/components/savings-tracker/savings-currency";
import { SavingsRingProgress } from "@/components/savings-tracker/SavingsRingProgress";

function Meter({
  label,
  pct,
  light,
}: {
  label: string;
  pct: number;
  light: boolean;
}) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">{label}</p>
        <p className="text-sm font-black text-emerald-800 dark:text-emerald-200">{w.toFixed(1)}%</p>
      </div>
      <div
        className={`wealth-health-bar-track h-2.5 overflow-hidden rounded-full ${
          light ? "ring-1 ring-slate-200/80" : ""
        }`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-400 motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out"
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

export function SavingsProgressPanel() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const max = useMemo(() => Math.max(...MONTHLY_SAVINGS_SERIES.map((m) => m.savingsKrw)), []);

  return (
    <section className={`wealth-glass relative overflow-hidden p-4 sm:p-5 ${light ? "shadow-[0_12px_40px_-24px_rgba(15,23,42,0.08)]" : ""}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-emerald-400/12 blur-3xl dark:bg-emerald-400/10"
      />
      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">
            Progress
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">Rhythm & targets</h2>
        </div>
        <p className="max-w-[14rem] text-right text-xs font-semibold leading-relaxed text-slate-500 dark:text-zinc-400">
          FIRE glide · monthly bars · goal & rhythm
        </p>
      </div>

      <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center xl:grid-cols-[auto_1.15fr_0.85fr]">
        <div className="flex justify-center lg:justify-start">
          <SavingsRingProgress
            pct={SAVINGS_DASH_META.fireTargetProgressPct}
            label="FIRE trajectory"
            sublabel="Target glide"
            size={128}
            stroke={8}
          />
        </div>

        <div className="min-w-0">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-400">Last 12 months</p>
          <div className="flex h-36 items-end gap-1.5 sm:gap-2">
            {MONTHLY_SAVINGS_SERIES.map((m) => {
              const h = (m.savingsKrw / max) * 100;
              return (
                <div key={m.key} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
                  <div
                    className="relative w-full max-w-[2.25rem] rounded-t-lg bg-gradient-to-t from-emerald-800/25 via-emerald-500/80 to-lime-400 shadow-[0_0_24px_-8px_rgba(16,185,129,0.35)] motion-safe:transition-all motion-safe:duration-300 motion-safe:ease-out sm:max-w-[2.75rem] dark:from-emerald-950/40 dark:via-emerald-500/70 dark:to-lime-300/90 dark:shadow-[0_0_28px_-6px_rgba(52,211,153,0.25)] motion-safe:group-hover:brightness-110 motion-safe:group-hover:translate-y-[-2px]"
                    style={{ height: `${Math.max(12, h)}%` }}
                    title={formatKrwInteger(m.savingsKrw)}
                  />
                  <span className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-400 dark:text-zinc-500 sm:text-[10px]">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-[140px] flex-col justify-center gap-6 border-t border-emerald-500/10 pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 xl:min-h-[168px]">
          <Meter label="Goal completion" pct={SAVINGS_DASH_META.goalCompletionPct} light={light} />
          <Meter label="Monthly rhythm" pct={SAVINGS_DASH_META.monthlyRhythmPct} light={light} />
        </div>
      </div>
    </section>
  );
}
