"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight, Flame, Home, PiggyBank, Plane, RefreshCw, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatNprInteger } from "@/components/savings-tracker/savings-currency";
import type { PlannerSnapshot } from "@/lib/return-to-nepal/planner-engine";

const WEALTH_STRIP = [
  { href: "/portfolio", label: "Net worth", icon: Home },
  { href: "/savings-tracker", label: "Savings", icon: PiggyBank },
  { href: "/portfolio/investments", label: "Investments", icon: TrendingUp },
  { href: "/portfolio/pension", label: "Pension", icon: Flame },
  { href: "/family", label: "Family Hub", icon: Users },
] as const;

const ANCHOR_NAV = [
  { href: "#rtn-readiness", label: "Readiness" },
  { href: "#rtn-compare", label: "Korea vs Nepal" },
  { href: "#rtn-col", label: "Nepal COL" },
  { href: "#rtn-passive", label: "Passive" },
  { href: "#rtn-runway", label: "Runway" },
  { href: "#rtn-timeline", label: "Timeline" },
  { href: "#rtn-family", label: "Family" },
  { href: "#rtn-house", label: "House" },
  { href: "#rtn-business", label: "Business" },
  { href: "#rtn-gap", label: "Gap" },
  { href: "#rtn-coach", label: "Coach" },
] as const;

export function ReturnToNepalChrome({
  title,
  subtitle,
  snapshot,
  onReset,
  children,
}: {
  title: string;
  subtitle?: string;
  snapshot: PlannerSnapshot;
  onReset: () => void;
  children: ReactNode;
}) {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/portfolio"
          className={`inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-black shadow-sm backdrop-blur-md transition duration-300 active:scale-[0.98] sm:text-sm ${
            light
              ? "border-emerald-200/90 bg-white/95 text-emerald-900 hover:border-emerald-300 hover:bg-emerald-50/90"
              : "border-white/[0.14] bg-white/[0.06] text-white hover:border-teal-300/40 hover:bg-white/[0.1]"
          }`}
        >
          <ArrowLeft size={15} /> Wealth dashboard
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] sm:text-[11px] ${
              light ? "text-emerald-800/75" : "fn-txt-muted"
            }`}
          >
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                light
                  ? "border-teal-500/30 bg-teal-500/12 text-teal-800"
                  : "border-white/[0.14] bg-white/[0.08] fn-txt-secondary"
              }`}
            >
              <Plane size={12} className="opacity-80" />
              Return OS
            </span>
            <span className="hidden sm:inline">Nepal transition desk · glass workspace</span>
          </div>
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-black transition active:scale-[0.98] sm:text-sm ${
              light
                ? "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                : "border-white/[0.14] bg-white/[0.06] text-white hover:bg-white/[0.1]"
            }`}
          >
            <RefreshCw size={14} /> Reset workspace
          </button>
        </div>
      </div>

      <section
        className={`wealth-glass relative overflow-hidden p-4 sm:p-5 ${
          light ? "ring-1 ring-emerald-950/[0.04] shadow-[0_16px_48px_-24px_rgba(15,23,42,0.1)]" : "ring-1 ring-white/[0.06]"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-gradient-to-br from-teal-400/20 via-emerald-400/12 to-transparent blur-3xl"
        />
        <div className="relative flex flex-col gap-4">
          <div>
            <h1 className={`text-[clamp(1.375rem,4.5vw+0.35rem,1.875rem)] font-black tracking-[-0.03em] sm:text-3xl ${light ? "text-slate-900" : "fn-txt-primary"}`}>
              {title}
            </h1>
            {subtitle ? (
              <p className={`mt-1.5 max-w-3xl text-[15px] font-semibold leading-relaxed sm:text-sm ${light ? "text-slate-600" : "fn-txt-secondary"}`}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {WEALTH_STRIP.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 sm:text-xs ${
                    light
                      ? "border-slate-200/90 bg-white/90 text-slate-800 hover:border-teal-300/80 hover:bg-teal-50/80"
                      : "border-white/[0.14] bg-white/[0.06] fn-txt-secondary hover:border-[rgba(79,255,209,0.35)] hover:bg-white/[0.1] hover:text-white"
                  }`}
                >
                  <Icon size={14} className="opacity-80" />
                  {item.label}
                  <ChevronRight size={12} className="opacity-60" />
                </Link>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                light ? "border-teal-200/80 bg-teal-50/70 text-teal-950" : "border-[rgba(79,255,209,0.22)] bg-gradient-to-br from-white/[0.08] to-white/[0.03] fn-txt-secondary"
              }`}
            >
              <span className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${light ? "text-teal-800/80" : "fn-txt-muted"}`}>
                Retirement readiness
              </span>
              <span className={`text-[clamp(1.05rem,3.8vw+0.2rem,1.125rem)] font-black tabular-nums ${light ? "text-teal-950" : "fn-txt-kpi"}`}>
                {snapshot.retirementReadinessPct.toFixed(0)}%
              </span>
            </div>
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                light ? "border-emerald-200/80 bg-emerald-50/60 text-emerald-950" : "border-emerald-400/22 bg-gradient-to-br from-white/[0.08] to-white/[0.03] fn-txt-secondary"
              }`}
            >
              <span className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${light ? "text-emerald-900/80" : "fn-txt-muted"}`}>Nepal COL (model)</span>
              <span className={`text-[clamp(1.05rem,3.8vw+0.2rem,1.125rem)] font-black tabular-nums ${light ? "text-emerald-950" : "fn-txt-kpi"}`}>
                {formatNprInteger(snapshot.monthlyNepalLivingNpr)} / mo
              </span>
            </div>
            <div
              className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                light ? "border-slate-200/80 bg-white/80 text-slate-900" : "border-white/[0.14] bg-gradient-to-br from-white/[0.08] to-white/[0.03] fn-txt-secondary"
              }`}
            >
              <span className={`block text-[10px] font-bold uppercase tracking-[0.14em] ${light ? "text-slate-600" : "fn-txt-muted"}`}>Emergency runway</span>
              <span className={`text-[clamp(1.05rem,3.8vw+0.2rem,1.125rem)] font-black tabular-nums ${light ? "text-slate-900" : "fn-txt-kpi"}`}>
                {snapshot.emergencyReserveMonths.toFixed(1)} mo
              </span>
            </div>
          </div>
        </div>
      </section>

      <nav
        aria-label="Return planner sections"
        className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 pt-0.5 sm:gap-2.5 sm:pb-2"
      >
        {ANCHOR_NAV.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full border px-3 py-2 text-[11px] font-bold transition motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 sm:px-3.5 sm:text-xs ${
              light
                ? "border-slate-200/80 bg-white/80 text-slate-700 hover:border-teal-200"
                : "border-white/[0.14] bg-white/[0.08] fn-txt-secondary hover:border-[rgba(79,255,209,0.28)] hover:text-white"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {children}
    </div>
  );
}
