"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Gauge,
  Radar,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import type { FinancialIntelligenceModel, SmartIntelNotificationCard } from "@/components/financial-intelligence/types";
import { formatMoney } from "@/lib/expense-utils";

function shell(extra: string) {
  return [
    "relative min-w-0 overflow-hidden rounded-[1.25rem] border border-emerald-400/16",
    "bg-gradient-to-br from-emerald-950/35 via-black/45 to-black/55",
    "shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_22px_60px_-28px_rgba(0,0,0,0.55)]",
    "backdrop-blur-xl transition duration-500 hover:border-emerald-300/25",
    extra,
  ].join(" ");
}

function cardTone(t: SmartIntelNotificationCard["tone"]): string {
  if (t === "positive")
    return "border-emerald-400/25 bg-emerald-500/[0.07] text-emerald-50/95 shadow-[0_0_24px_-12px_rgba(52,211,153,0.35)]";
  if (t === "caution")
    return "border-amber-400/22 bg-amber-950/25 text-amber-50/95 shadow-[0_0_24px_-12px_rgba(251,191,36,0.18)]";
  return "border-white/10 bg-black/30 text-zinc-100/95";
}

function trendWord(t: FinancialIntelligenceModel["monthlyReport"]["savingsRateTrend"]): string {
  if (t === "up") return "Strengthening";
  if (t === "down") return "Softening";
  if (t === "flat") return "Stable";
  return "Insufficient history";
}

type SmartFinancialIntelligenceSectionProps = {
  model: FinancialIntelligenceModel;
  compact?: boolean;
};

export function SmartFinancialIntelligenceSection({ model, compact }: SmartFinancialIntelligenceSectionProps) {
  const maxBar = useMemo(() => {
    const m = Math.max(...model.recurringChart.map((r) => r.amountNpr), 1);
    return m;
  }, [model.recurringChart]);

  if (compact) {
    return (
      <section className="min-w-0 space-y-4 animate-fade-up">
        <DashboardSectionHeader
          accent="emerald"
          eyebrow={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/90">
              <Sparkles size={11} className="text-lime-300" />
              Step 5C · Intelligence
            </span>
          }
          title="Automation & signals"
          subtitle="Local rollups power month-over-month behavior detection — no cloud AI."
        />
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {model.smartCards.map((c, i) => (
            <div
              key={c.id}
              style={{ animationDelay: `${i * 55}ms` }}
              className={`min-w-[240px] max-w-[min(92vw,320px)] shrink-0 rounded-2xl border px-3.5 py-3 animate-fade-up ${cardTone(c.tone)}`}
            >
              <p className="text-[11px] font-black uppercase tracking-wide text-white/55">Signal</p>
              <p className="mt-1 text-sm font-bold leading-snug">{c.title}</p>
              <p className="mt-1 text-[11px] font-medium leading-relaxed text-white/70">{c.subtitle}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className={shell("p-3 sm:p-4")}>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200/50">Health</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-100">{model.financialHealthScore}</p>
          </div>
          <div className={shell("p-3 sm:p-4")}>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200/50">Savings eff.</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-lime-200">{model.savingsEfficiencyScore}</p>
          </div>
          <div className={shell("p-3 sm:p-4")}>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200/50">MoM data</p>
            <p className="mt-1 text-xs font-bold leading-snug text-emerald-50/90">
              {model.hasMonthOverMonth ? "Series live" : "Collecting"}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-6 lg:space-y-7">
      <DashboardSectionHeader
        accent="emerald"
        eyebrow={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/90">
            <Radar size={11} className="text-lime-300" />
            Step 5C · Smart automation
          </span>
        }
        title="Financial intelligence desk"
        subtitle="Recurring detection, anomaly radar, wealth leak estimates, and monthly institutional summaries — deterministic rules on your device."
      />

      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {model.smartCards.map((c, i) => (
          <div
            key={c.id}
            style={{ animationDelay: `${i * 55}ms` }}
            className={`min-w-[260px] max-w-[min(92vw,340px)] shrink-0 rounded-2xl border px-4 py-3.5 animate-fade-up ${cardTone(c.tone)}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/45">Live signal</p>
              <ArrowUpRight size={16} className="shrink-0 opacity-40" />
            </div>
            <p className="mt-1.5 text-sm font-bold leading-snug">{c.title}</p>
            <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-white/72">{c.subtitle}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        <div className={`${shell("p-4 sm:p-5 lg:col-span-7")}`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">
            <BarChart3 size={14} className="text-lime-300" />
            Monthly AI wealth report · {model.monthlyReport.month}
          </div>
          <p className="mt-3 text-base font-bold leading-snug text-white/95 sm:text-lg">{model.monthlyReport.headline}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Savings trend</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-100">
                {model.monthlyReport.savingsRateTrend === "up" ? (
                  <TrendingUp size={16} className="text-lime-300" />
                ) : model.monthlyReport.savingsRateTrend === "down" ? (
                  <TrendingDown size={16} className="text-amber-300" />
                ) : (
                  <Activity size={16} className="text-cyan-300" />
                )}
                {trendWord(model.monthlyReport.savingsRateTrend)}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Investment growth</p>
              <p className="mt-1 text-sm font-bold text-emerald-100">{trendWord(model.monthlyReport.investmentGrowthTrend)}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">FIRE trajectory</p>
              <p className="mt-1 text-sm font-bold capitalize text-emerald-100">{model.monthlyReport.fireTrajectory}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Cashflow quality</p>
              <p className="mt-1 text-sm font-black tabular-nums text-lime-200">{model.monthlyReport.cashflowQualityScore}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 border-t border-white/8 pt-4 text-[11px] font-medium leading-relaxed text-zinc-300/95">
            {model.monthlyReport.bullets.map((b, i) => (
              <li key={`${i}-${b.slice(0, 24)}`} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400/80" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <div className={shell("p-4 sm:p-5")}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Financial health</p>
              <Gauge size={16} className="text-lime-300/90" />
            </div>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-4xl font-black tabular-nums leading-none text-emerald-100 sm:text-5xl">
                {model.financialHealthScore}
              </span>
              <span className="pb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">/ 100 composite</span>
            </div>
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-zinc-400">
              Blends desk FIRE readiness, savings efficiency, and modeled cashflow quality — tuned for institutional dashboards, not hype.
            </p>
          </div>

          <div className={shell("p-4 sm:p-5")}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Savings efficiency meter</p>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-lime-400 to-teal-300 transition-[width] duration-1000 ease-out"
                style={{ width: `${clampPct(model.savingsEfficiencyScore)}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-emerald-100/90">{model.savingsEfficiencyScore} · runway-weighted savings velocity</p>
          </div>

          <div className={shell("p-4 sm:p-5")}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Wealth momentum</p>
            <p className="mt-2 text-sm font-bold text-white/95">{model.wealthMomentum.label}</p>
            <p className="mt-1 text-[11px] font-medium capitalize text-zinc-400">
              Vs trailing avg:{" "}
              {model.wealthMomentum.vsTrailingAvg === "in_line"
                ? "in line"
                : model.wealthMomentum.vsTrailingAvg === "unknown"
                  ? "unknown"
                  : model.wealthMomentum.vsTrailingAvg}
            </p>
            <span
              className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                model.wealthMomentum.tone === "strong"
                  ? "bg-emerald-500/15 text-emerald-200"
                  : model.wealthMomentum.tone === "weak"
                    ? "bg-rose-500/12 text-rose-200"
                    : "bg-white/5 text-zinc-300"
              }`}
            >
              <Zap size={12} />
              {model.wealthMomentum.tone}
            </span>
          </div>

          <div className={shell("p-4 sm:p-5")}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Cash burn analysis</p>
            <p className="mt-2 text-[11px] font-medium leading-relaxed text-zinc-300">{model.cashBurn.narrative}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
              <div className="rounded-lg border border-white/8 bg-black/30 px-2.5 py-2 font-bold text-zinc-200">
                Burn / income
                <p className="mt-1 text-sm font-black text-white">
                  {model.cashBurn.burnToIncomePct === null ? "—" : `${model.cashBurn.burnToIncomePct}%`}
                </p>
              </div>
              <div className="rounded-lg border border-white/8 bg-black/30 px-2.5 py-2 font-bold text-zinc-200">
                Runway
                <p className="mt-1 text-sm font-black text-white">
                  {model.cashBurn.runwayMonths === null ? "—" : `${model.cashBurn.runwayMonths} mo`}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Stress index</p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-[width] duration-1000"
                  style={{ width: `${clampPct(model.cashBurn.burnStressScore)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className={shell("p-4 sm:p-5")}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Recurring expense stack</p>
            {!model.hasMonthOverMonth ? (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold text-zinc-400">MoM unlocking</span>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] font-medium text-zinc-400">
            Categories are treated as monthly recurring obligations — entertainment maps to subscription-style leisure.
          </p>
          <div className="mt-4 space-y-3">
            {model.recurringChart.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500">Enter expense lines to populate the institutional stack chart.</p>
            ) : (
              model.recurringChart.map((row) => (
                <div key={row.bucket} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-zinc-200">
                    <span>{row.label}</span>
                    <span className="tabular-nums text-emerald-100/95">{formatMoney(row.amountNpr, "NPR")}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-black/45 ring-1 ring-white/6">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-600/90 via-lime-400/85 to-teal-400/80 transition-[width] duration-[900ms] ease-out"
                      style={{ width: `${Math.min(100, (row.amountNpr / maxBar) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-medium text-zinc-500">{row.sharePct}% of recurring outflows</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={shell("p-4 sm:p-5")}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Anomaly desk</p>
          <div className="mt-3 space-y-2.5">
            {model.anomalies.length === 0 ? (
              <p className="text-sm font-medium text-zinc-500">No active anomaly flags — keep logging data for sharper radar.</p>
            ) : (
              model.anomalies.map((a) => (
                <div
                  key={a.id}
                  className={`flex gap-3 rounded-xl border px-3 py-2.5 ${
                    a.severity === "alert" ? "border-rose-400/25 bg-rose-950/20" : "border-amber-400/20 bg-amber-950/15"
                  }`}
                >
                  <AlertTriangle className={`mt-0.5 shrink-0 ${a.severity === "alert" ? "text-rose-300" : "text-amber-300"}`} size={18} />
                  <div>
                    <p className="text-xs font-bold text-white">{a.title}</p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-zinc-300">{a.detail}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className={shell("p-4 sm:p-5")}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Wealth leak & savings opportunities</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {model.wealthLeaks.length === 0 ? (
            <p className="text-sm font-medium text-zinc-500 md:col-span-2 lg:col-span-3">
              No major modeled leaks — discretionary loads look contained versus income.
            </p>
          ) : (
            model.wealthLeaks.map((w) => (
              <div key={w.id} className="rounded-xl border border-white/10 bg-black/30 px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white">{w.title}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      w.severity === "high"
                        ? "bg-rose-500/15 text-rose-200"
                        : w.severity === "medium"
                          ? "bg-amber-500/12 text-amber-200"
                          : "bg-white/5 text-zinc-400"
                    }`}
                  >
                    {w.severity}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-zinc-400">{w.detail}</p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-emerald-200/60">
                  Modeled recoverable · {formatMoney(w.estimatedMonthlyLeakNpr, "NPR")} / mo
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={shell("p-4 sm:p-5")}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Recurring line radar</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {model.recurring.length === 0 ? (
            <p className="text-sm text-zinc-500 sm:col-span-2 lg:col-span-3">No positive expense categories yet.</p>
          ) : (
            model.recurring.map((r) => (
              <div key={r.id} className="rounded-xl border border-white/8 bg-black/25 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-white">{r.displayLabel}</p>
                  {r.rising ? (
                    <span className="text-[9px] font-black uppercase text-amber-300">Rising</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase text-zinc-500">Stable</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-emerald-100/90">{formatMoney(r.monthlyAmountNpr, "NPR")}</p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  Confidence {Math.round(r.recurrenceConfidence * 100)}%
                  {r.momChangePct !== null ? ` · MoM ${r.momChangePct > 0 ? "+" : ""}${r.momChangePct}%` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function clampPct(n: number): number {
  return Math.max(4, Math.min(100, n));
}
