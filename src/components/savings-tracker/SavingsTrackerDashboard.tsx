"use client";

import { ArrowLeft, ArrowUpRight, Flame, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { SavingsChartsBlock } from "@/components/savings-tracker/SavingsChartsBlock";
import { formatKrwInteger, formatNprInteger, formatPct, krwToNpr } from "@/components/savings-tracker/savings-currency";
import { SavingsInsightsPanel } from "@/components/savings-tracker/SavingsInsightsPanel";
import { SavingsProgressPanel } from "@/components/savings-tracker/SavingsProgressPanel";
import { SavingsQuickActionsStrip } from "@/components/savings-tracker/SavingsQuickActionsStrip";
import { SAVINGS_DASH_META } from "@/components/savings-tracker/savings-tracker-data";
import { SavingsStatCounter } from "@/components/savings-tracker/SavingsStatCounter";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { useFireTheme } from "@/contexts/FireThemeContext";

type PrimaryCurrency = "krw" | "npr";

function AnalyticsTile({
  label,
  value,
  hint,
  light,
}: {
  label: string;
  value: string;
  hint: string;
  light: boolean;
}) {
  return (
    <div
      className={`wealth-glass flex h-full min-h-[156px] flex-col justify-between p-4 motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 sm:min-h-[168px] sm:p-5 ${
        light ? "shadow-sm motion-safe:hover:shadow-[0_16px_44px_-20px_rgba(16,185,129,0.14)]" : "motion-safe:hover:shadow-[0_20px_50px_-22px_rgba(0,0,0,0.45)]"
      }`}
    >
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700/90 dark:text-emerald-300/75">{label}</p>
        <p className="mt-2 text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">{value}</p>
      </div>
      <p className="text-xs font-semibold leading-relaxed text-slate-500 dark:text-zinc-400">{hint}</p>
    </div>
  );
}

export function SavingsTrackerDashboard() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [primary, setPrimary] = useState<PrimaryCurrency>("krw");
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setChartsReady(true), 560);
    return () => window.clearTimeout(id);
  }, []);

  const totalNpr = krwToNpr(SAVINGS_DASH_META.totalSavingsKrw);
  const monthlyNpr = krwToNpr(SAVINGS_DASH_META.monthlySavingsKrw);
  const primaryTotal = primary === "krw" ? SAVINGS_DASH_META.totalSavingsKrw : totalNpr;
  const primaryMonthly = primary === "krw" ? SAVINGS_DASH_META.monthlySavingsKrw : monthlyNpr;
  const secondaryLine =
    primary === "krw"
      ? `≈ ${formatNprInteger(totalNpr)} at NPR/KRW reference rate`
      : `≈ ${formatKrwInteger(SAVINGS_DASH_META.totalSavingsKrw)}`;

  const secondaryMonthly =
    primary === "krw" ? formatNprInteger(monthlyNpr) : formatKrwInteger(SAVINGS_DASH_META.monthlySavingsKrw);

  return (
    <WealthDashboardShell
      brand={{ tagline: "Savings OS", iconGradient: "from-emerald-400 to-lime-400" }}
      footerNote="Savings workspace — amounts stay on this device until you connect sync. Toggle theme in the header."
    >
      <div className="mb-6 flex flex-col gap-3 sm:mb-7 sm:flex-row sm:items-center sm:justify-between lg:mb-8">
        <Link
          href="/"
          className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-black shadow-sm backdrop-blur-md transition duration-300 active:scale-[0.98] sm:text-sm ${
            light
              ? "border-emerald-200/90 bg-white/95 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/90"
              : "border-emerald-400/18 bg-white/[0.06] text-emerald-50/95 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)] hover:border-teal-300/35 hover:bg-white/10 hover:shadow-[0_12px_36px_-10px_rgba(45,212,191,0.15)]"
          }`}
        >
          <ArrowLeft size={15} /> Back to FIRE Nepal
        </Link>
        <div
          className={`flex items-center gap-2 text-[11px] font-bold sm:text-xs ${
            light ? "text-emerald-800/80" : "text-emerald-200/70"
          }`}
        >
          <TrendingUp size={14} className={light ? "text-emerald-600" : "text-lime-300"} />
          Savings intelligence
        </div>
      </div>

      <div className="wealth-dash-flow flex flex-col gap-5 scroll-smooth lg:gap-6">
        <DashboardSectionHeader
          accent="emerald"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800 dark:text-emerald-200/90">
              <Flame size={12} className="text-emerald-600 dark:text-emerald-300" />
              Premium tracker
            </span>
          }
          title="Savings command center"
          subtitle="KRW earned abroad, NPR home lens, and FIRE acceleration — composed like a modern fintech OS."
        />

        <section
          className={`wealth-glass relative overflow-hidden p-5 sm:p-6 lg:p-7 ${
            light ? "ring-1 ring-emerald-950/[0.04] shadow-[0_20px_56px_-28px_rgba(15,23,42,0.12)]" : ""
          }`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-400/25 via-lime-300/15 to-transparent blur-3xl dark:from-emerald-500/20 dark:via-lime-400/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 bottom-0 h-52 w-52 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-400/8"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">
                  Overview
                </p>
                <div
                  className={`inline-flex rounded-full border p-0.5 text-[11px] font-black ${
                    light ? "border-slate-200/90 bg-white/80" : "border-white/10 bg-black/30"
                  }`}
                  role="group"
                  aria-label="Primary display currency"
                >
                  <button
                    type="button"
                    onClick={() => setPrimary("krw")}
                    className={`rounded-full px-3 py-1.5 transition ${
                      primary === "krw"
                        ? "bg-gradient-to-r from-emerald-600 to-lime-500 text-white shadow-md"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    KRW
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimary("npr")}
                    className={`rounded-full px-3 py-1.5 transition ${
                      primary === "npr"
                        ? "bg-gradient-to-r from-emerald-600 to-lime-500 text-white shadow-md"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    NPR
                  </button>
                </div>
              </div>

              <h2 className="mt-3 max-w-xl text-2xl font-black tracking-[-0.04em] text-slate-900 dark:text-white sm:text-3xl lg:text-[2rem] lg:leading-[1.12]">
                Total savings
              </h2>
              <p className="mt-2 max-w-lg text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
                {secondaryLine}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-zinc-500">Balance</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-emerald-800 dark:text-emerald-100 sm:text-3xl">
                    {primary === "krw" ? (
                      <SavingsStatCounter value={primaryTotal} format={formatKrwInteger} />
                    ) : (
                      <SavingsStatCounter value={primaryTotal} format={formatNprInteger} />
                    )}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-zinc-500">This month · {secondaryMonthly}</p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-zinc-500">Monthly savings</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                    {primary === "krw" ? (
                      <SavingsStatCounter value={primaryMonthly} format={formatKrwInteger} durationMs={880} />
                    ) : (
                      <SavingsStatCounter value={primaryMonthly} format={formatNprInteger} durationMs={880} />
                    )}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-zinc-500">Recurring + one-offs</p>
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-zinc-500">Growth vs last month</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-lg font-black text-emerald-800 dark:text-emerald-200">
                      <ArrowUpRight size={18} strokeWidth={2.5} />
                      {formatPct(SAVINGS_DASH_META.growthPctVsLastMonth)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-zinc-500">Vs prior month (when you have history)</p>
                </div>
              </div>
            </div>

            <div
              className={`relative w-full shrink-0 rounded-2xl border p-4 sm:max-w-sm lg:w-[min(100%,320px)] ${
                light
                  ? "border-emerald-200/60 bg-white/75 shadow-inner"
                  : "border-emerald-500/15 bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700/90 dark:text-emerald-300/80">FIRE target</p>
              <p className="mt-2 text-sm font-bold text-slate-600 dark:text-zinc-300">Corpus target</p>
              <p className="mt-1 text-xl font-black text-slate-900 dark:text-white">{formatKrwInteger(SAVINGS_DASH_META.fireTargetKrw)}</p>
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-zinc-500">
                ≈ {formatNprInteger(krwToNpr(SAVINGS_DASH_META.fireTargetKrw))} · glide {SAVINGS_DASH_META.fireTargetProgressPct}%
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-lime-400 motion-safe:transition-[width] motion-safe:duration-1000 motion-safe:ease-out"
                  style={{ width: `${SAVINGS_DASH_META.fireTargetProgressPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-stretch gap-4 lg:grid-cols-3 lg:gap-5">
          <div className="min-h-0 lg:col-span-2">
            <SavingsProgressPanel />
          </div>
          <div className="flex min-h-0 lg:min-h-[320px]">
            <SavingsInsightsPanel />
          </div>
        </div>

        <section aria-labelledby="savings-analytics-heading">
          <h2 id="savings-analytics-heading" className="sr-only">
            Savings analytics
          </h2>
          <div className="mb-3 flex items-end justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700/90 dark:text-emerald-300/80">Smart analytics</p>
          </div>
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AnalyticsTile
              light={light}
              label="Best savings month"
              value={formatKrwInteger(SAVINGS_DASH_META.bestMonthKrw)}
              hint={SAVINGS_DASH_META.bestMonthLabel}
            />
            <AnalyticsTile
              light={light}
              label="Average monthly"
              value={formatKrwInteger(SAVINGS_DASH_META.avgMonthlyKrw)}
              hint="Trailing 12 months (when tracked)"
            />
            <AnalyticsTile
              light={light}
              label="Savings streak"
              value={`${SAVINGS_DASH_META.savingsStreakMonths} mo`}
              hint="Above your personal floor"
            />
            <AnalyticsTile
              light={light}
              label="FIRE acceleration"
              value={`≈ ${SAVINGS_DASH_META.fireYearsEarlier} yrs`}
              hint="Earlier vs baseline plan"
            />
          </div>
        </section>

        <section aria-labelledby="savings-charts-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 id="savings-charts-heading" className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
              Market-grade charts
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500">Animated load · responsive canvas</p>
          </div>
          <SavingsChartsBlock chartsReady={chartsReady} />
        </section>

        <SavingsQuickActionsStrip />
      </div>
    </WealthDashboardShell>
  );
}
