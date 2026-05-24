"use client";

import {
  Activity,
  Gauge,
  Radar,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import type { WealthTotals } from "@/components/portfolio/calculations";
import {
  computeAiWealthIntelligence,
  type AllocationSlice,
  type AiRecommendation,
  type AiRiskLevel,
} from "@/components/portfolio/ai-wealth-intelligence-engine";
import { formatMoney } from "@/lib/expense-utils";
import { useFireTheme } from "@/contexts/FireThemeContext";

type ConfidenceBand = {
  label: string;
  descriptor: string;
  chipClass: string;
};

type AiWealthIntelligenceSectionProps = {
  hydrated: boolean;
  totals: WealthTotals;
  allocation: AllocationSlice[];
  fireScore: number;
  passiveMonthlyNpr: number;
  monthDelta: number | null;
  historyLength: number;
};

function glassCard(extra: string, light: boolean) {
  if (light) {
    return [
      "relative min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-cyan-200/55",
      "bg-gradient-to-br from-white/98 via-slate-50/95 to-cyan-50/35",
      "shadow-[0_0_0_1px_rgba(15,23,42,0.04)_inset,0_16px_44px_-22px_rgba(15,23,42,0.08)]",
      "backdrop-blur-md transition duration-500 hover:border-cyan-400/40 hover:shadow-[0_12px_36px_-18px_rgba(6,182,212,0.12)]",
      extra,
    ].join(" ");
  }
  return [
    "relative min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-cyan-400/12",
    "bg-gradient-to-br from-white/[0.07] via-cyan-950/10 to-black/35",
    "shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_20px_56px_-28px_rgba(0,0,0,0.55)]",
    "backdrop-blur-xl transition duration-500 hover:border-cyan-300/22",
    extra,
  ].join(" ");
}

function riskStyles(level: AiRiskLevel): { chip: string; bar: string; label: string } {
  if (level === "low") {
    return {
      label: "Contained",
      chip: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
      bar: "from-emerald-400 via-lime-300 to-teal-300",
    };
  }
  if (level === "medium") {
    return {
      label: "Balanced",
      chip: "border-amber-400/35 bg-amber-500/12 text-amber-50",
      bar: "from-amber-400 via-orange-300 to-rose-400/90",
    };
  }
  return {
    label: "Elevated",
    chip: "border-rose-400/40 bg-rose-500/14 text-rose-50",
    bar: "from-rose-500 via-orange-500 to-amber-500",
  };
}

function confidenceBand(pct: number, hydrated: boolean): ConfidenceBand {
  if (!hydrated) {
    return {
      label: "Calibrating",
      descriptor: "Signal depth is still forming.",
      chipClass: "border-white/15 bg-white/[0.06] text-zinc-300",
    };
  }
  if (pct >= 84) {
    return {
      label: "Institutional depth",
      descriptor: "High signal integrity—reads carry elevated trust.",
      chipClass: "border-emerald-400/35 bg-emerald-500/12 text-emerald-50",
    };
  }
  if (pct >= 68) {
    return {
      label: "Strong read",
      descriptor: "Sufficient history and scale for confident guidance.",
      chipClass: "border-cyan-400/35 bg-cyan-500/12 text-cyan-50",
    };
  }
  if (pct >= 52) {
    return {
      label: "Developing",
      descriptor: "Directional—add history and scale to tighten precision.",
      chipClass: "border-amber-400/30 bg-amber-500/10 text-amber-50",
    };
  }
  return {
    label: "Early signal",
    descriptor: "Illustrative until the balance sheet fills in.",
    chipClass: "border-zinc-500/30 bg-zinc-500/10 text-zinc-200",
  };
}

function recSignalLabel(tone: AiRecommendation["tone"]): string {
  if (tone === "critical") return "Priority";
  if (tone === "positive") return "Momentum";
  return "Guidance";
}

function recCardShell(tone: AiRecommendation["tone"], isFirstPriority: boolean): string {
  const base =
    "relative flex flex-col gap-1.5 rounded-xl border px-3.5 py-3 text-[13px] font-medium leading-snug text-zinc-100/95 shadow-inner";
  if (tone === "critical") {
    return [
      base,
      isFirstPriority
        ? "border-rose-400/45 bg-gradient-to-br from-rose-950/35 via-black/35 to-black/25 ring-1 ring-rose-500/20"
        : "border-rose-400/35 bg-rose-950/20 ring-1 ring-rose-500/10",
    ].join(" ");
  }
  if (tone === "positive") {
    return `${base} border-emerald-400/22 bg-emerald-950/15 ring-1 ring-emerald-500/10`;
  }
  return `${base} border-white/10 bg-black/25 ring-1 ring-white/[0.04]`;
}

export function AiWealthIntelligenceSection({
  hydrated,
  totals,
  allocation,
  fireScore,
  passiveMonthlyNpr,
  monthDelta,
  historyLength,
}: AiWealthIntelligenceSectionProps) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const model = useMemo(
    () =>
      computeAiWealthIntelligence(
        totals,
        allocation,
        fireScore,
        passiveMonthlyNpr,
        monthDelta,
        historyLength,
        hydrated,
      ),
    [totals, allocation, fireScore, passiveMonthlyNpr, monthDelta, historyLength, hydrated],
  );

  const rs = riskStyles(model.riskLevel);
  const conf = useMemo(() => confidenceBand(model.fireConfidencePct, hydrated), [model.fireConfidencePct, hydrated]);

  const portfolioEmpty = totals.totalAssetsNpr <= 0;
  const portfolioNascent = hydrated && totals.totalAssetsNpr > 0 && totals.totalAssetsNpr < 25_000;

  const insightBadges = useMemo(() => {
    const badges: { key: string; text: string; className: string }[] = [];
    if (model.concentrationLabel === "elevated") {
      badges.push({
        key: "conc",
        text: "Concentration watch",
        className: "border-amber-400/35 bg-amber-500/12 text-amber-50",
      });
    }
    if (model.riskLevel === "high") {
      badges.push({
        key: "risk",
        text: "Risk: priority review",
        className: "border-rose-400/40 bg-rose-500/12 text-rose-50",
      });
    }
    if (model.fireSuccessPct >= 72) {
      badges.push({
        key: "fire",
        text: "FIRE outlook strong",
        className: "border-emerald-400/35 bg-emerald-500/12 text-emerald-50",
      });
    } else if (model.fireSuccessPct < 38) {
      badges.push({
        key: "fire-soft",
        text: "Optimize runway",
        className: "border-zinc-500/35 bg-zinc-500/10 text-zinc-200",
      });
    }
    if (monthDelta != null && monthDelta < 0) {
      badges.push({
        key: "mom",
        text: "Momentum: verify",
        className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-50",
      });
    }
    if (model.safetyScore >= 78) {
      badges.push({
        key: "safe",
        text: "Resilience elevated",
        className: "border-teal-400/30 bg-teal-500/10 text-teal-50",
      });
    }
    return badges.slice(0, 4);
  }, [model, monthDelta]);

  const firstPriorityIdx = model.recommendations.findIndex((r) => r.tone === "critical");

  return (
    <section className="flex flex-col gap-6 lg:gap-8" aria-labelledby="ai-wealth-intel-heading">
      <DashboardSectionHeader
        accent="cyan"
        eyebrow={
          <span className="inline-flex items-center gap-2 text-cyan-200/80">
            <Sparkles className="inline h-3.5 w-3.5 text-cyan-300" aria-hidden />
            AI Wealth Intelligence
          </span>
        }
        title="Clarity you can act on. Tone you can trust."
        subtitle="Signals distilled from your live snapshot—prioritized, discreet, and written like a private desk—not a chatbot."
      />

      <div
        className={`grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-12 ${!hydrated ? "opacity-75" : ""}`}
      >
        {/* Primary insight */}
        <article
          className={`${glassCard("xl:col-span-7", light)} p-5 sm:p-6`}
          aria-live="polite"
        >
          {!reduceMotion ? (
            <div className="ai-wi-shimmer pointer-events-none absolute inset-0 opacity-40" aria-hidden />
          ) : null}
          <div className="pointer-events-none absolute -right-16 -top-24 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-100 shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]">
                  <Radar className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/65 sm:text-[11px]">
                    Private wealth brief
                  </p>
                  <h2 id="ai-wealth-intel-heading" className="text-lg font-black tracking-tight text-zinc-50 sm:text-xl">
                    {model.insightHeadline}
                  </h2>
                </div>
              </div>
              {!hydrated ? (
                <span className="rounded-full border border-cyan-400/25 bg-black/30 px-3 py-1 text-[10px] font-bold text-cyan-100/80">
                  Syncing…
                </span>
              ) : null}
            </div>
            {!portfolioEmpty && insightBadges.length ? (
              <div className="flex flex-wrap gap-2" role="list" aria-label="Insight highlights">
                {insightBadges.map((b) => (
                  <span
                    key={b.key}
                    role="listitem"
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${b.className}`}
                  >
                    {b.text}
                  </span>
                ))}
              </div>
            ) : null}
            {portfolioEmpty ? (
              <div className="rounded-xl border border-dashed border-white/12 bg-black/20 px-4 py-6 text-center">
                <p className="text-sm font-semibold text-zinc-200">Your canvas is ready.</p>
                <p className="mt-2 text-xs font-medium leading-relaxed text-zinc-400">
                  Add assets and liabilities to unlock the full intelligence layer—this desk works best with real numbers.
                </p>
              </div>
            ) : (
              <p className="text-sm font-medium leading-relaxed text-zinc-200/90 sm:text-[15px] sm:leading-relaxed">
                {model.insightBody}
              </p>
            )}
            {portfolioNascent && !portfolioEmpty ? (
              <p className="rounded-lg border border-cyan-400/15 bg-cyan-950/20 px-3 py-2 text-[11px] font-medium leading-snug text-cyan-100/85 sm:text-xs">
                Early-stage balance sheet—signals are directional. Depth improves automatically as you fund the picture.
              </p>
            ) : null}
            <p className="text-[11px] font-medium leading-snug text-zinc-500 sm:text-xs">
              Educational synthesis—not personal advice. Outcomes depend on income, spend, tax, and goals not modeled here.
            </p>
          </div>
        </article>

        {/* FIRE meter */}
        <article className={`${glassCard("xl:col-span-5", light)} flex flex-col justify-between p-5 sm:p-6`}>
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-[11px]">
                <Gauge className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                FIRE probability
              </p>
              <p className="mt-2 text-3xl font-black tabular-nums tracking-tight text-white sm:text-4xl">
                {model.fireSuccessPct}
                <span className="ml-1 text-lg font-black text-cyan-200/80 sm:text-xl">%</span>
              </p>
              <p className="mt-1 text-xs font-semibold leading-snug text-zinc-400">
                Glide-path alignment—probability surface from your current snapshot, not a forecast guarantee.
              </p>
            </div>
            <div className="flex max-w-[11rem] flex-col items-end gap-1.5 text-right">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide ${conf.chipClass}`}
              >
                {conf.label}
              </span>
              <div className="w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2 shadow-inner">
                <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">Signal confidence</p>
                <p className="text-lg font-black tabular-nums text-cyan-100">{model.fireConfidencePct}%</p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-medium leading-snug text-zinc-500">{conf.descriptor}</p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/[0.06]">
            <div
              className={`h-full rounded-full bg-gradient-to-r from-zinc-500 via-cyan-400 to-emerald-400 ${reduceMotion ? "" : "motion-safe:transition-[width] motion-safe:duration-[900ms] motion-safe:ease-out"}`}
              style={{ width: `${Math.min(100, model.fireConfidencePct)}%` }}
            />
          </div>
          <div className="relative mt-5">
            <div className="h-2.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 ${reduceMotion ? "" : "motion-safe:transition-[width] motion-safe:duration-[1100ms] motion-safe:ease-out"}`}
                style={{ width: `${Math.min(100, model.fireSuccessPct)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              <span>Build</span>
              <span>Compound</span>
              <span>Freedom-weighted</span>
            </div>
          </div>
          {portfolioEmpty ? (
            <p className="mt-3 text-[11px] font-medium leading-snug text-zinc-500">
              Anchor this meter with funded assets—probability reads best against a real balance sheet.
            </p>
          ) : null}
        </article>

        {/* Diversification */}
        <article className={`${glassCard("xl:col-span-4", light)} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-[11px]">
            <Target className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            Diversification
          </div>
          <p className="mt-3 text-2xl font-black text-white">
            {model.diversificationScore}
            <span className="ml-1 text-sm font-bold text-zinc-400">/ 100</span>
          </p>
          <p className="mt-2 text-sm font-medium leading-snug text-zinc-300/95">{model.diversificationSummary}</p>
          <dl className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between gap-3 border-t border-white/5 pt-3 font-semibold text-zinc-400">
              <dt>Concentration tier</dt>
              <dd className="text-right capitalize text-zinc-100">{model.concentrationLabel}</dd>
            </div>
            <div className="flex justify-between gap-3 font-semibold text-zinc-400">
              <dt>Lead sleeve</dt>
              <dd className="text-right text-zinc-100">
                {model.concentrationTopLabel}{" "}
                <span className="tabular-nums text-cyan-200/90">({model.concentrationTopPct.toFixed(1)}%)</span>
              </dd>
            </div>
            <div className="flex justify-between gap-3 font-semibold text-zinc-400">
              <dt>HHI · asset book</dt>
              <dd className="tabular-nums text-zinc-200">{model.hhiIndex.toFixed(3)}</dd>
            </div>
          </dl>
          <ul className="mt-4 space-y-2 border-t border-white/5 pt-4 text-[13px] font-medium leading-snug text-amber-100/90">
            {model.balanceSuggestions.map((s) => (
              <li key={s} className="flex gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </article>

        {/* Inflation */}
        <article className={`${glassCard("xl:col-span-4", light)} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-[11px]">
            <TrendingDown className="h-3.5 w-3.5 text-amber-300/90" aria-hidden />
            Inflation intelligence
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-zinc-200/95">
            Long-run CPI proxy at{" "}
            <span className="font-black text-amber-100/95">{(model.inflationAssumptionAnnual * 100).toFixed(1)}%</span>{" "}
            annually—quiet erosion of purchasing power while nominal balances look flat. The antidote is real, risk-aware growth above
            inflation, not optimism.
          </p>
          <dl className="mt-4 space-y-2.5 text-xs font-semibold">
            <div className="flex justify-between gap-3 border-t border-white/5 pt-3 text-zinc-400">
              <dt>10y purchasing power (today&apos;s NPR)</dt>
              <dd className="text-right tabular-nums text-zinc-50">{formatMoney(Math.round(model.purchasingPowerNpr10y), "NPR")}</dd>
            </div>
            <div className="flex justify-between gap-3 text-zinc-400">
              <dt>Implied drag (10y, model)</dt>
              <dd className="text-right tabular-nums text-amber-200/90">−{model.cumulativeInflationDragPct10y.toFixed(1)}%</dd>
            </div>
            <div className="flex justify-between gap-3 text-zinc-400">
              <dt>Nominal track (7% / yr, illustrative)</dt>
              <dd className="text-right tabular-nums text-emerald-200/90">
                {formatMoney(Math.round(model.nominalWealthIfCompounds7Pct10y), "NPR")}
              </dd>
            </div>
          </dl>
        </article>

        {/* Risk engine */}
        <article className={`${glassCard("xl:col-span-4", light)} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-[11px]">
            <Shield className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
            Risk engine
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${rs.chip}`}>
              {rs.label} exposure
            </span>
            <span className="text-xs font-semibold text-zinc-500">Volatility proxy · Safety composite</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Volatility</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-white">{model.volatilityIndex}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${rs.bar} ${reduceMotion ? "" : "motion-safe:transition-all motion-safe:duration-700"}`}
                  style={{ width: `${model.volatilityIndex}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-zinc-500">Safety score</p>
              <p className="mt-1 text-2xl font-black tabular-nums text-emerald-100">{model.safetyScore}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 ${reduceMotion ? "" : "motion-safe:transition-all motion-safe:duration-700"}`}
                  style={{ width: `${model.safetyScore}%` }}
                />
              </div>
            </div>
          </div>
          <p className="mt-4 text-[12px] font-medium leading-relaxed text-zinc-400">
            Volatility rises when market sleeves expand; safety rewards liquidity, retirement structures, and a liability stack you could
            explain in one sentence.
          </p>
        </article>

        {/* Feed */}
        <article className={`${glassCard("md:col-span-2 xl:col-span-12", light)} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-[11px]">
                <Activity className="h-3.5 w-3.5 text-cyan-300" aria-hidden />
                Prioritized signals
              </div>
              <span className="hidden text-[10px] font-bold uppercase tracking-wide text-zinc-500 sm:inline sm:border-l sm:border-white/10 sm:pl-3">
                Alerts first · Then guidance · Wins last
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Live-weighted</span>
          </div>
          {portfolioEmpty ? (
            <div className="mt-6 rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-10 text-center">
              <p className="text-sm font-semibold text-zinc-200">No signals yet—by design.</p>
              <p className="mx-auto mt-2 max-w-md text-xs font-medium leading-relaxed text-zinc-500">
                Fund your balance sheet. The feed activates when there is weight to interpret—calm, elite, and never noisy for its own
                sake.
              </p>
            </div>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {model.recommendations.map((r, i) => (
                <li
                  key={`${r.tone}-${i}-${r.text.slice(0, 48)}`}
                  className={recCardShell(r.tone, i === firstPriorityIdx)}
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
                    {recSignalLabel(r.tone)}
                  </span>
                  <span className={r.tone === "critical" ? "font-semibold text-zinc-50" : ""}>{r.text}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
