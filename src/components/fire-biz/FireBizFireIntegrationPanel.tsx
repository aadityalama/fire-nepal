"use client";

import { Flame, Percent, TrendingUp, Wallet } from "lucide-react";
import { FireBizGlassCard, FireBizSummaryCard } from "@/components/fire-biz/FireBizUiPrimitives";
import { useFireBizCopy } from "@/contexts/FireBizContext";
import { formatBizNpr } from "@/lib/fire-biz/i18n";
import type { FireBizFireIntegration } from "@/lib/fire-biz/types";

type Props = {
  data: FireBizFireIntegration;
  loading: boolean;
};

export function FireBizFireIntegrationPanel({ data, loading }: Props) {
  const copy = useFireBizCopy();
  const f = copy.fireIntegration;
  const dash = copy.dashboard;
  const loadingVal = "…";

  return (
    <FireBizGlassCard title={dash.fireIntegration} subtitle={f.corpusNote} icon={Flame}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FireBizSummaryCard
          label={f.businessNetWorth}
          value={loading ? loadingVal : formatBizNpr(data.businessNetWorth)}
          icon={Wallet}
          accent="emerald"
          size="compact"
        />
        <FireBizSummaryCard
          label={f.monthlyProfit}
          value={loading ? loadingVal : formatBizNpr(data.monthlyBusinessProfit)}
          icon={TrendingUp}
          accent={data.monthlyBusinessProfit >= 0 ? "teal" : "rose"}
          size="compact"
        />
        <FireBizSummaryCard
          label={f.fireContribution}
          value={loading ? loadingVal : `${data.businessContributionPct.toFixed(1)}%`}
          icon={Percent}
          accent="amber"
          size="compact"
        />
        <FireBizSummaryCard
          label={f.wealthGrowth}
          value={loading ? loadingVal : `${data.businessWealthGrowthPct >= 0 ? "+" : ""}${data.businessWealthGrowthPct}%`}
          icon={Flame}
          accent="emerald"
          size="compact"
        />
      </div>
    </FireBizGlassCard>
  );
}
