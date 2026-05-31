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
      footerNote="Family AI Insights — demo signals. Connect your data model when backend is ready."
    >
      <div className="wealth-dash-flow flex flex-col gap-5 lg:gap-6">
        <DashboardSectionHeader
          eyebrow="Family intelligence"
          title="Family AI Insights"
          subtitle="Cross-household signals: cash timing, school load, and wellbeing proxies — scoped to family data only (demo)."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Rhythm score",
              body: "Evening wind-down consistency is up — fewer late meals before school nights.",
            },
            { title: "Fee seasonality", body: "Next education invoice clusters with rent week — consider KRW sweep 4 days early." },
            { title: "Household focus", body: "Shared calendar density is moderate; two buffer evenings remain this month." },
            { title: "Risk flags", body: "No medical renewals due in 45 days. Visa window opens in 12 days (demo)." },
          ].map((c) => (
            <div
              key={c.title}
              className={`wealth-glass rounded-2xl border p-5 motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 ${
                light ? "border-emerald-200/70 shadow-sm" : "border-emerald-400/15"
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.14em] text-emerald-700/90 dark:text-emerald-300/75">{c.title}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700 dark:text-zinc-300">{c.body}</p>
            </div>
          ))}
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
