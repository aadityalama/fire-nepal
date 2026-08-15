"use client";

import { buildProviderDesks } from "@/lib/pension/provider-desk";
import { ProviderAccountCard, SummaryStat } from "@/components/pension/PensionUi";

/** Provider ledger strip — never invents NPR balances. */
export function SsfSummaryCards() {
  const desks = buildProviderDesks();
  const ssf = desks.find((d) => d.id === "ssf");
  if (!ssf) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryStat label="SSF balance" field={ssf.balance} hint="Official sync required" />
        <SummaryStat label="Monthly contribution" field={ssf.monthlyContribution} />
        <SummaryStat label="Contribution months" field={ssf.contributionMonths} />
        <SummaryStat label="Last contribution" field={ssf.lastContribution} />
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[18.5rem]">
          <ProviderAccountCard desk={ssf} />
        </div>
      </div>
    </div>
  );
}
