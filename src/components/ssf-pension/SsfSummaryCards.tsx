"use client";

import { useFireTheme } from "@/contexts/FireThemeContext";
import { formatMoney } from "@/lib/expense-utils";
import { SSF_SUMMARY } from "@/lib/ssf-pension/demo-data";

export function SsfSummaryCards() {
  const { resolvedTheme } = useFireTheme();
  const light = resolvedTheme === "light";
  const cards = [
    { label: "Total SSF balance", value: formatMoney(SSF_SUMMARY.totalBalanceNpr, "NPR"), hint: "From your workspace inputs" },
    { label: "Est. monthly pension", value: formatMoney(SSF_SUMMARY.estimatedMonthlyPensionNpr, "NPR"), hint: "Projection desk model" },
    { label: "Contribution months", value: String(SSF_SUMMARY.contributionMonths), hint: "Recorded months" },
    { label: "Retirement readiness", value: `${SSF_SUMMARY.readinessScore}%`, hint: "Heuristic from your data" },
    {
      label: "Next contribution due",
      value: SSF_SUMMARY.nextContributionDue || "—",
      hint: SSF_SUMMARY.nextContributionLabel || "Set dates in SSF workspace",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`wealth-glass flex min-h-[132px] flex-col justify-between p-4 motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 sm:min-h-[140px] sm:p-5 ${
            light ? "shadow-sm motion-safe:hover:shadow-[0_16px_44px_-20px_rgba(20,184,166,0.12)]" : "motion-safe:hover:shadow-[0_18px_48px_-22px_rgba(0,0,0,0.45)]"
          }`}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-teal-700/90 dark:text-teal-300/80">{c.label}</p>
            <p className="mt-2 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">{c.value}</p>
          </div>
          <p className="text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-zinc-400">{c.hint}</p>
        </div>
      ))}
    </div>
  );
}
