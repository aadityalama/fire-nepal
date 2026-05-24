"use client";

import {
  Activity,
  Bell,
  Brain,
  ChevronRight,
  Gauge,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { buildFinancialCoachModel } from "@/components/financial-coach/financial-coach-intelligence";
import type { CoachInsight, CoachNotification, CoachRecommendation, FinancialCoachSnapshot } from "@/components/financial-coach/types";

function glassShell(extra: string) {
  return [
    "relative min-w-0 max-w-full overflow-hidden rounded-[1.35rem] border border-violet-400/14",
    "bg-gradient-to-br from-white/[0.06] via-violet-950/12 to-black/38",
    "shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_22px_56px_-28px_rgba(0,0,0,0.52)]",
    "backdrop-blur-xl transition duration-500 hover:border-violet-300/22",
    extra,
  ].join(" ");
}

function severityRing(s: CoachInsight["severity"]): string {
  if (s === "critical") return "ring-rose-400/35";
  if (s === "warning") return "ring-amber-400/30";
  if (s === "success") return "ring-emerald-400/35";
  return "ring-cyan-400/25";
}

function notifTone(t: CoachNotification["tone"]): string {
  if (t === "alert") return "border-rose-400/25 bg-rose-950/25 text-rose-50/95";
  if (t === "positive") return "border-emerald-400/25 bg-emerald-950/25 text-emerald-50/95";
  if (t === "milestone") return "border-cyan-400/25 bg-cyan-950/25 text-cyan-50/95";
  return "border-white/10 bg-black/25 text-zinc-200/95";
}

function impactLabel(i: CoachRecommendation["impact"]): string {
  if (i === "high") return "High leverage";
  if (i === "medium") return "Medium leverage";
  return "Fine tune";
}

type AiFinancialCoachSectionProps = {
  snapshot: FinancialCoachSnapshot;
  /** Tighter layout on cashflow page */
  compact?: boolean;
};

export function AiFinancialCoachSection({ snapshot, compact }: AiFinancialCoachSectionProps) {
  const model = useMemo(() => buildFinancialCoachModel(snapshot), [snapshot]);

  return (
    <section className="min-w-0 max-w-full">
      <DashboardSectionHeader
        accent="cyan"
        eyebrow="STEP 5B · AI Financial Coach"
        title="Desk-grade coaching without the API bill."
        subtitle="Mock intelligence from your cashflow, portfolio momentum, payslip trend, and the same desk FIRE engine as simulation — deterministic rules only."
      />

      <div className={`mt-5 grid gap-4 ${compact ? "" : "lg:grid-cols-12"}`}>
        <div className={`${glassShell(compact ? "" : "lg:col-span-5")} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/70">
            <Bell className="h-4 w-4 text-violet-300" />
            Live alerts
          </div>
          <div className="flex max-h-[min(52vh,420px)] flex-col gap-2 overflow-y-auto pr-0.5 sm:max-h-none">
            {model.notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold leading-snug transition duration-300 ${notifTone(n.tone)}`}
              >
                <p className="font-black uppercase tracking-wide text-[10px] opacity-80">{n.label}</p>
                {n.detail ? <p className="mt-1 text-[11px] font-medium opacity-95">{n.detail}</p> : null}
              </div>
            ))}
          </div>
          <Link
            href="/cashflow-dashboard#payslip-import"
            className="mt-4 inline-flex min-h-[40px] items-center gap-1 text-[11px] font-bold text-violet-200/80 transition hover:text-violet-100"
          >
            Refresh salary intelligence <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className={`${glassShell(compact ? "" : "lg:col-span-7")} p-4 sm:p-5`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/70">
              <Brain className="h-4 w-4 text-violet-300" />
              Coaching cards
            </div>
            <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-zinc-400">
              Mock AI
            </span>
          </div>
          <div className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}>
            {model.insights.map((ins) => (
              <article
                key={ins.id}
                className={`rounded-xl border border-white/[0.08] bg-black/22 p-3.5 ring-1 ring-inset ${severityRing(ins.severity)} transition duration-300 hover:bg-black/30`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-black uppercase tracking-wide text-violet-200/75">{ins.category}</p>
                  {ins.badge ? (
                    <span className="shrink-0 rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-100/90">
                      {ins.badge}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-2 text-sm font-black leading-snug text-white">{ins.title}</h3>
                <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-zinc-300/95">{ins.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className={`${glassShell("lg:col-span-7")} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/70">
            <Target className="h-4 w-4 text-fuchsia-300" />
            FIRE optimization & discipline
          </div>
          <ul className="space-y-2.5">
            {model.recommendations.map((r) => (
              <li
                key={r.id}
                className="flex gap-3 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 transition duration-300 hover:border-fuchsia-400/20"
              >
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300/90" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wide text-fuchsia-200/65">{impactLabel(r.impact)}</p>
                  <p className="text-sm font-black text-white">{r.title}</p>
                  <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-zinc-400">{r.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${glassShell("lg:col-span-5")} p-4 sm:p-5`}>
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200/70">
            <Activity className="h-4 w-4 text-emerald-300" />
            Behavioral analytics
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-950/20 p-3 text-center">
              <Gauge className="mx-auto h-5 w-5 text-emerald-300/90" />
              <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-emerald-200/60">Savings discipline</p>
              <p className="mt-1 text-xl font-black tabular-nums text-emerald-50">{model.behavioral.savingsDisciplineScore}</p>
            </div>
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-950/20 p-3 text-center">
              <TrendingUp className="mx-auto h-5 w-5 text-cyan-300/90" />
              <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-cyan-200/60">Invest discipline</p>
              <p className="mt-1 text-xl font-black tabular-nums text-cyan-50">{model.behavioral.investmentDisciplineScore}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-violet-300/90" />
              <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-zinc-500">NW momentum</p>
              <p className="mt-1 text-xs font-black uppercase text-zinc-100">{model.behavioral.portfolioMomentumVs12m}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
              <Shield className="mx-auto h-5 w-5 text-amber-300/90" />
              <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-zinc-500">Dining pressure</p>
              <p className="mt-1 text-xs font-black uppercase text-zinc-100">{model.behavioral.diningPressure}</p>
            </div>
          </div>
          <p className="mt-3 text-[12px] font-medium leading-relaxed text-zinc-400">{model.behavioral.habitSummary}</p>
        </div>
      </div>
    </section>
  );
}
