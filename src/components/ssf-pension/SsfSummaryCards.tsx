"use client";

import { CalendarDays, CircleDollarSign, Clock3, PiggyBank, Target } from "lucide-react";
import { formatMoney } from "@/lib/expense-utils";
import { SSF_SUMMARY } from "@/lib/ssf-pension/demo-data";
import { PensionMetricCard } from "@/components/pension/PensionUi";

export function SsfSummaryCards() {
  const cards = [
    {
      label: "Total SSF balance",
      value: formatMoney(SSF_SUMMARY.totalBalanceNpr, "NPR"),
      hint: "From your workspace inputs",
      icon: CircleDollarSign,
      accent: "emerald" as const,
    },
    {
      label: "Est. monthly pension",
      value: formatMoney(SSF_SUMMARY.estimatedMonthlyPensionNpr, "NPR"),
      hint: "Projection desk model",
      icon: PiggyBank,
      accent: "teal" as const,
    },
    {
      label: "Contribution months",
      value: String(SSF_SUMMARY.contributionMonths),
      hint: "Recorded months",
      icon: Clock3,
      accent: "cyan" as const,
    },
    {
      label: "Retirement readiness",
      value: `${SSF_SUMMARY.readinessScore}%`,
      hint: "Heuristic from your data",
      icon: Target,
      accent: "lime" as const,
    },
    {
      label: "Next contribution due",
      value: SSF_SUMMARY.nextContributionDue || "—",
      hint: SSF_SUMMARY.nextContributionLabel || "Set dates in SSF workspace",
      icon: CalendarDays,
      accent: "teal" as const,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((c) => (
        <PensionMetricCard
          key={c.label}
          label={c.label}
          value={c.value}
          hint={c.hint}
          icon={c.icon}
          accent={c.accent}
        />
      ))}
    </div>
  );
}
