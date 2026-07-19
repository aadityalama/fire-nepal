"use client";

import dynamic from "next/dynamic";
import { Activity, BarChart3, TrendingUp } from "lucide-react";
import { LendingGlassCard, LendingSkeletonCard } from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";
import { useFireTheme } from "@/contexts/FireThemeContext";

const Charts = dynamic(() => import("@/components/fire-lending/FireLendingChartsInner").then((m) => m.FireLendingChartsInner), {
  ssr: false,
  loading: () => (
    <div className="grid gap-3.5 lg:grid-cols-2">
      <LendingSkeletonCard className="h-64" />
      <LendingSkeletonCard className="h-64" />
      <LendingSkeletonCard className="h-64" />
      <LendingSkeletonCard className="h-64" />
    </div>
  ),
});

export function FireLendingDashboardAnalytics() {
  const { summary } = useFireLending();
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";

  return (
    <div className="space-y-3.5">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${light ? "text-emerald-700" : "text-lime-300"}`}>Analytics</p>
          <h2 className={`text-lg font-black sm:text-xl ${light ? "text-slate-900" : "text-white"}`}>Lending intelligence</h2>
        </div>
        <p className={`text-[11px] font-bold ${light ? "text-slate-500" : "text-emerald-200/55"}`}>
          Health {summary.healthScore} · Collection {summary.collectionRate}%
        </p>
      </div>
      <Charts />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { icon: BarChart3, label: "Cash Flow" },
          { icon: TrendingUp, label: "Portfolio Growth" },
          { icon: Activity, label: "Collection Trend" },
          { icon: BarChart3, label: "Repayment Perf." },
        ].map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
              light ? "border-emerald-200/60 bg-white/80" : "border-emerald-400/10 bg-black/20"
            }`}
          >
            <item.icon size={16} className={light ? "text-emerald-600" : "text-lime-300"} />
            <span className={`text-[11px] font-black ${light ? "text-slate-700" : "text-emerald-100"}`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FireLendingAnalyticsSection() {
  return (
    <LendingGlassCard title="Full Analytics" subtitle="Embedded chart suite" icon={BarChart3}>
      <FireLendingDashboardAnalytics />
    </LendingGlassCard>
  );
}
