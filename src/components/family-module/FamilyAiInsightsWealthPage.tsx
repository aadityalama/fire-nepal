"use client";

import Link from "next/link";
import { DashboardSectionHeader } from "@/components/DashboardSectionHeader";
import { WealthDashboardShell } from "@/components/portfolio/WealthDashboardShell";
import { useFireTheme } from "@/contexts/FireThemeContext";

export function FamilyAiInsightsWealthPage() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <WealthDashboardShell
      brand={{ tagline: "Family AI", iconGradient: "from-emerald-400 to-teal-400" }}
      footerNote="Family AI Insights — signals appear when your family workspace has enough connected data."
    >
      <div className="wealth-dash-flow flex flex-col gap-5 lg:gap-6">
        <DashboardSectionHeader
          eyebrow="Family intelligence"
          title="Family AI Insights"
          subtitle="Cross-household signals for cash timing, education load, and wellbeing — scoped to your family data only."
        />
        <div
          className={`wealth-glass rounded-2xl border p-8 text-center sm:p-10 ${
            light ? "border-emerald-200/70 shadow-sm" : "border-emerald-400/15"
          }`}
        >
          <p className="text-lg font-black tracking-tight text-slate-900 dark:text-white">No insights yet</p>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-600 dark:text-zinc-400">
            Add family schedules, shared reminders, and records in the hub. When there is enough signal, personalized
            summaries will show here instead of placeholder cards.
          </p>
        </div>
        <div
          className={`wealth-glass rounded-2xl border p-5 sm:p-6 ${light ? "border-emerald-200/70" : "border-emerald-400/15"}`}
        >
          <p className="text-sm font-bold text-slate-900 dark:text-white">Coming next</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
            Wire this view to the same engine as portfolio AI insights, with family-only feature flags and audit logs.
          </p>
          <Link
            href="/portfolio/ai-insights"
            className="mt-4 inline-flex items-center gap-2 text-sm font-black text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-300"
          >
            Open portfolio AI Insights →
          </Link>
        </div>
      </div>
    </WealthDashboardShell>
  );
}
