"use client";

import { AlertTriangle, Brain, Lightbulb, PartyPopper, Sparkles, Target } from "lucide-react";
import { useMemo } from "react";
import { CashflowGlassCard } from "@/components/cashflow/CashflowGlassCard";
import {
  computeFinancialGuidancePack,
  type FinancialHealthPillars,
  type GuidanceCard,
  type GuidanceTone,
} from "@/lib/fire-nepal/guidance-engine";
import type { UnifiedFireSummary } from "@/lib/fire-nepal/unified-fire-summary";

const PILLAR_LABELS: Record<keyof FinancialHealthPillars, string> = {
  savingsRate: "Savings rate",
  debtRatio: "Debt safety",
  emergencyFund: "Emergency fund",
  investmentStrength: "Investments",
  retirementReadiness: "Retirement",
};

function toneStyles(tone: GuidanceTone): string {
  switch (tone) {
    case "warn":
      return "border-rose-400/35 bg-gradient-to-br from-rose-950/35 to-black/40 shadow-[0_0_40px_-12px_rgba(251,113,133,0.25)]";
    case "praise":
      return "border-lime-400/30 bg-gradient-to-br from-lime-950/25 to-black/40 shadow-[0_0_40px_-12px_rgba(163,230,53,0.2)]";
    case "tip":
      return "border-cyan-400/30 bg-gradient-to-br from-cyan-950/25 to-black/40 shadow-[0_0_40px_-12px_rgba(34,211,238,0.18)]";
    case "celebrate":
      return "border-amber-400/35 bg-gradient-to-br from-amber-950/30 to-black/40 shadow-[0_0_44px_-10px_rgba(251,191,36,0.22)]";
    default:
      return "border-emerald-400/20 bg-black/30";
  }
}

function GuidanceCardIcon({ tone }: { tone: GuidanceTone }) {
  const cls = "shrink-0 text-emerald-100/90";
  switch (tone) {
    case "warn":
      return <AlertTriangle size={18} className={`${cls} text-rose-200`} />;
    case "praise":
      return <Sparkles size={18} className={`${cls} text-lime-200`} />;
    case "tip":
      return <Lightbulb size={18} className={`${cls} text-cyan-200`} />;
    case "celebrate":
      return <PartyPopper size={18} className={`${cls} text-amber-200`} />;
    default:
      return <Brain size={18} className={cls} />;
  }
}

function CardBlock({ c }: { c: GuidanceCard }) {
  return (
    <div
      className={`wealth-row-card flex gap-3 rounded-2xl border p-3.5 backdrop-blur-md sm:p-4 ${toneStyles(c.tone)}`}
    >
      <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/35 ring-1 ring-white/10">
        <GuidanceCardIcon tone={c.tone} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/55">{c.tone}</p>
        <p className="mt-1 text-sm font-black leading-snug text-emerald-50 sm:text-base">{c.title}</p>
        <p className="mt-1.5 text-[12px] font-semibold leading-relaxed text-emerald-100/85 sm:text-sm">{c.body}</p>
      </div>
    </div>
  );
}

export function FinancialGuidancePanel({ summary }: { summary: UnifiedFireSummary }) {
  const pack = useMemo(() => computeFinancialGuidancePack(summary), [summary]);

  return (
    <div className="space-y-4">
      <CashflowGlassCard
        title="Financial guidance engine"
        subtitle="Advisor-style read on your live Portfolio + Cashflow data — motivational, not tax or legal advice."
        icon={Brain}
        className="border border-white/[0.06] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)]"
      >
        <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col items-center justify-center gap-3 lg:col-span-4">
            <div
              className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full sm:h-32 sm:w-32"
              style={{
                background: `conic-gradient(#34d399 ${pack.financialHealthScore * 3.6}deg, rgba(255,255,255,0.07) 0deg)`,
              }}
            >
              <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-[#041f18] text-center ring-1 ring-emerald-400/20">
                <span className="text-3xl font-black tabular-nums text-emerald-50">{pack.financialHealthScore}</span>
              </div>
            </div>
            <div className="text-center lg:max-w-[14rem]">
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-200/60">Financial health</p>
              <p className="mt-1 text-xs font-bold text-emerald-200/55">
                Weighted blend of savings, debt, runway, markets & retirement pillars.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div
              className={`rounded-2xl border border-white/10 bg-gradient-to-br p-4 ring-1 ring-white/[0.06] ${pack.stage.gradient}`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <Target size={18} className="mt-0.5 shrink-0 text-amber-200" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/55">FIRE journey</p>
                  <p className="mt-1 text-lg font-black text-emerald-50 sm:text-xl">{pack.stage.title}</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-100/88">{pack.stage.tagline}</p>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(Object.keys(pack.pillars) as (keyof FinancialHealthPillars)[]).map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-emerald-400/12 bg-black/30 px-2.5 py-2 text-center backdrop-blur-sm"
                >
                  <p className="text-[9px] font-black uppercase leading-tight text-emerald-200/50">{PILLAR_LABELS[key]}</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-teal-200">{Math.round(pack.pillars[key])}</p>
                  <div className="mx-auto mt-1.5 h-1.5 w-full max-w-[4.5rem] overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                      style={{ width: `${pack.pillars[key]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-emerald-200/40">
              Weights: savings {Math.round(pack.pillarWeights.savingsRate * 100)}% · debt{" "}
              {Math.round(pack.pillarWeights.debtRatio * 100)}% · emergency{" "}
              {Math.round(pack.pillarWeights.emergencyFund * 100)}% · investments{" "}
              {Math.round(pack.pillarWeights.investmentStrength * 100)}% · retirement{" "}
              {Math.round(pack.pillarWeights.retirementReadiness * 100)}%
            </p>
          </div>
        </div>
      </CashflowGlassCard>

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/45">Smart guidance</p>
          <div className="space-y-2.5">
            {pack.cards.length === 0 ? (
              <p className="rounded-xl border border-emerald-400/15 bg-black/25 px-3 py-4 text-sm font-semibold text-emerald-200/65">
                Add income and expenses in Cashflow plus a few portfolio lines — we will surface tailored nudges here.
              </p>
            ) : (
              pack.cards.map((c) => <CardBlock key={c.id} c={c} />)
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/45">Personalized moves</p>
          <div className="wealth-glass rounded-2xl border border-emerald-400/12 p-4">
            <ul className="space-y-3">
              {pack.suggestions.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm font-semibold leading-relaxed text-emerald-100/90">
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-[11px] font-black text-emerald-200">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
