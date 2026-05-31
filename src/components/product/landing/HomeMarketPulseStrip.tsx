"use client";

import { useId } from "react";

const sparkA = "M0,42 L18,38 L36,44 L54,28 L72,34 L90,20 L108,26 L120,18";
const sparkC = "M0,30 L22,34 L44,20 L62,28 L80,12 L98,18 L120,8";

function AnimatedSparkline({
  d,
  delayMs,
  className,
}: Readonly<{ d: string; delayMs: number; className?: string }>) {
  const fillId = `fn-spark-fill-${useId().replace(/:/g, "")}`;
  const topOpacity = d === sparkC ? "0.28" : "0.35";

  return (
    <svg viewBox="0 0 120 56" className={className} fill="none" aria-hidden>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={topOpacity} />
          <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L120,56 L0,56 Z`} fill={`url(#${fillId})`} className="opacity-90 dark:opacity-100" />
      <path
        d={d}
        className="fn-home-sparkline-stroke text-emerald-600 dark:text-emerald-400"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1,
          animation: `fn-spark-draw 2.4s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms forwards infinite`,
        }}
      />
    </svg>
  );
}

function BarPulse({ className }: Readonly<{ className?: string }>) {
  const heights = [38, 62, 48, 78, 52, 88, 44, 70, 56, 92, 48, 66];
  return (
    <div className={`flex h-14 items-end justify-between gap-0.5 ${className ?? ""}`} aria-hidden>
      {heights.map((h, i) => (
        <span
          key={i}
          className="fn-home-bar-pulse w-1.5 max-w-[6px] flex-1 rounded-full bg-gradient-to-t from-emerald-950/10 to-emerald-500 dark:from-emerald-950/30 dark:to-emerald-300"
          style={{
            height: `${h}%`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

export function HomeMarketPulseStrip() {
  return (
    <section
      aria-label="Illustrative market momentum"
      className="relative mx-auto max-w-7xl px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8"
    >
      <div className="glass-card soft-gradient-border relative overflow-hidden rounded-[1.75rem] px-4 py-5 shadow-lg ring-1 ring-emerald-950/[0.06] transition-[box-shadow,transform] duration-500 ease-out hover:shadow-[0_28px_70px_rgba(0,122,61,0.14)] dark:ring-emerald-500/15 dark:hover:shadow-[0_28px_70px_rgba(0,0,0,0.4)] sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-lime-300/10 blur-2xl dark:bg-lime-400/5" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              Live desk · illustrative
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-50 sm:text-2xl">
              Capital momentum across your Korea → Nepal corridor
            </h2>
            <p className="mt-2 max-w-xl text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
              Animated snapshots for savings velocity, NPR corpus build, and runway stress — the same rhythm as a
              modern operating system.
            </p>
          </div>

          <div className="grid w-full min-w-0 auto-rows-fr gap-3 sm:grid-cols-3 sm:items-stretch lg:max-w-[58%] lg:flex-1">
            <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/50 bg-white/55 p-4 shadow-sm backdrop-blur-md transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-emerald-200/80 motion-safe:hover:shadow-md dark:border-emerald-500/15 dark:bg-slate-900/55 dark:hover:border-emerald-400/35 dark:hover:bg-slate-900/75 dark:hover:shadow-[0_22px_50px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Net worth glide
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-emerald-900 dark:text-emerald-100">+18.4%</p>
              <AnimatedSparkline d={sparkA} delayMs={0} className="mt-auto h-14 w-full shrink-0 pt-3" />
            </div>
            <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/50 bg-white/55 p-4 shadow-sm backdrop-blur-md transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-emerald-200/80 motion-safe:hover:shadow-md dark:border-emerald-500/15 dark:bg-slate-900/55 dark:hover:border-emerald-400/35 dark:hover:bg-slate-900/75 dark:hover:shadow-[0_22px_50px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Savings rate
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-emerald-900 dark:text-emerald-100">42%</p>
              <BarPulse className="mt-auto shrink-0 px-0.5 pt-3" />
            </div>
            <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/50 bg-white/55 p-4 shadow-sm backdrop-blur-md transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-emerald-200/80 motion-safe:hover:shadow-md dark:border-emerald-500/15 dark:bg-slate-900/55 dark:hover:border-emerald-400/35 dark:hover:bg-slate-900/75 dark:hover:shadow-[0_22px_50px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                FIRE runway
              </p>
              <p className="mt-1 text-lg font-black tabular-nums text-emerald-900 dark:text-emerald-100">12.4 yrs</p>
              <AnimatedSparkline d={sparkC} delayMs={400} className="mt-auto h-14 w-full shrink-0 pt-3" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
