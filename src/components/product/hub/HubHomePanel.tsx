"use client";

import { ArrowRight, Banknote, LineChart, Receipt, Sparkles, Target } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { loadProductOnboarding } from "@/lib/product-onboarding-storage";

export function HubHomePanel() {
  const onboarding = useMemo(() => loadProductOnboarding(), []);

  const cards = [
    {
      href: "/portfolio",
      title: "Wealth dashboard",
      body: "Net worth, allocations, AI coach, and automation intelligence.",
      icon: Target,
      accent: "from-emerald-500/25 to-lime-400/10",
    },
    {
      href: "/portfolio/simulation",
      title: "FIRE simulation lab",
      body: "Deterministic desk engine — scenarios, stress tests, contribution deltas.",
      icon: LineChart,
      accent: "from-teal-500/25 to-cyan-400/10",
    },
    {
      href: "/cashflow-dashboard#payslip-import",
      title: "Korean payslip OCR",
      body: "Local-first OCR import into cashflow — no cloud AI required.",
      icon: Receipt,
      accent: "from-lime-400/20 to-emerald-600/15",
    },
    {
      href: "/cashflow-dashboard",
      title: "Cashflow OS",
      body: "Income, burn, savings rate, and premium intelligence widgets.",
      icon: Banknote,
      accent: "from-emerald-600/25 to-black/20",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-up">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-200/55">Command center</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Welcome to your hub</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-emerald-100/65">
          Everything here stays local-first. Portfolio v2, cashflow, OCR, simulation, coach, and STEP 5C intelligence remain
          exactly as you left them — this shell only unifies navigation.
        </p>
      </div>

      {!onboarding.completed ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 shrink-0 text-amber-200" size={20} />
            <div>
              <p className="text-sm font-black text-amber-50">Finish onboarding</p>
              <p className="mt-1 text-xs font-medium text-amber-100/75">
                We will seed optional cashflow defaults and generate an illustrative FIRE profile.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 px-4 py-2.5 text-xs font-black text-emerald-950 shadow-lg transition hover:-translate-y-0.5"
          >
            Continue setup
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : onboarding.generated ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-5">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/55">Generated profile</p>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-emerald-50/90">{onboarding.generated.headline}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase text-zinc-500">Savings rate</p>
              <p className="mt-1 text-lg font-black text-white">{onboarding.generated.savingsRatePct}%</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase text-zinc-500">FI band (illustrative)</p>
              <p className="mt-1 text-sm font-black leading-snug text-white">{onboarding.generated.estYearsToFiBand}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5">
              <p className="text-[10px] font-black uppercase text-zinc-500">Runway target</p>
              <p className="mt-1 text-lg font-black text-white">{onboarding.generated.runwayMonthsSuggested} mo</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative overflow-hidden rounded-2xl border border-emerald-400/15 bg-gradient-to-br p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition duration-500 hover:border-emerald-300/35 hover:shadow-[0_24px_70px_rgba(16,185,129,0.12)]"
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-90`} />
            <div className="relative">
              <div className="mb-4 inline-flex rounded-xl border border-white/10 bg-black/30 p-2.5 text-lime-200">
                <c.icon size={22} />
              </div>
              <h2 className="text-lg font-black text-white">{c.title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-emerald-100/70">{c.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-lime-300 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100">
                Open <ArrowRight size={14} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
