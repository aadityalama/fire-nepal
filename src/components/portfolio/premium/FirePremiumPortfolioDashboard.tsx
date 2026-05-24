"use client";

import { CalendarClock, Flame, PiggyBank, Target, Wallet } from "lucide-react";
import { AssetAllocationChart } from "@/components/portfolio/premium/AssetAllocationChart";
import { AssetsDataTable } from "@/components/portfolio/premium/AssetsDataTable";
import { BottomSummaryStrip } from "@/components/portfolio/premium/BottomSummaryStrip";
import { DashboardHeader } from "@/components/portfolio/premium/DashboardHeader";
import { InsightsSidebar } from "@/components/portfolio/premium/InsightsSidebar";
import { KpiMetricCard } from "@/components/portfolio/premium/KpiMetricCard";
import { NetWorthGrowthChart } from "@/components/portfolio/premium/NetWorthGrowthChart";
import {
  formatNpr,
  nprToUsdLabel,
  premiumSummary,
  sparklineFire,
  sparklineFireNumber,
  sparklineNetWorth,
  sparklinePassive,
} from "@/data/fire-premium-dashboard";

export function FirePremiumPortfolioDashboard() {
  return (
    <div className="fn-premium-portfolio-root w-full min-w-0 max-w-full">
      <div className="fn-premium-portfolio-scale-inner fn-premium-portfolio wealth-dash-flow w-full min-w-0 max-w-full overflow-x-hidden pb-2 sm:pb-3 xl:pb-4">
        <DashboardHeader userName="Raj Kumar" />

        <section className="mt-5 grid grid-cols-1 items-stretch gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-3 lg:mt-5 lg:gap-3.5 xl:grid-cols-5 xl:gap-3.5 2xl:gap-4">
          <KpiMetricCard
            label="Total net worth"
            icon={Wallet}
            value={formatNpr(premiumSummary.totalNetWorthNpr)}
            usdHint={nprToUsdLabel(premiumSummary.totalNetWorthNpr)}
            deltaLabel={`↑ ${premiumSummary.netWorthGrowthPct.toFixed(1)}% vs last month`}
            sparkline={sparklineNetWorth}
          />
          <KpiMetricCard
            label="Monthly passive income"
            icon={PiggyBank}
            value={formatNpr(premiumSummary.monthlyPassiveIncomeNpr)}
            usdHint={nprToUsdLabel(premiumSummary.monthlyPassiveIncomeNpr)}
            deltaLabel={`↑ ${premiumSummary.passiveGrowthPct.toFixed(1)}% vs last month`}
            sparkline={sparklinePassive}
            sparkVariant="amber"
          />
          <KpiMetricCard
            label="FIRE progress"
            icon={Flame}
            value={`${premiumSummary.fireProgressPct.toFixed(1)}%`}
            deltaLabel={`↑ ${premiumSummary.fireProgressDeltaPct.toFixed(1)}% vs last month`}
            sparkline={sparklineFire}
            progressPct={premiumSummary.fireProgressPct}
          />
          <KpiMetricCard
            label="FIRE number"
            icon={Target}
            value={formatNpr(premiumSummary.fireNumberNpr)}
            usdHint={nprToUsdLabel(premiumSummary.fireNumberNpr)}
            deltaLabel="On glidepath"
            sparkline={sparklineFireNumber}
            sparkVariant="violet"
            footer={premiumSummary.fireNumberProgressNote}
          />
          <KpiMetricCard
            label="Estimated FIRE date"
            icon={CalendarClock}
            value={premiumSummary.estimatedFiDate}
            deltaLabel="Monte Carlo confidence: high"
            deltaPositive
            sparkline={[12, 14, 16, 18, 20, 22, 24, 26]}
            sparkVariant="violet"
            footer={premiumSummary.estimatedFiCountdown}
          />
        </section>

        <div className="mt-4 flex min-w-0 flex-col gap-4 sm:mt-5 lg:mt-4 lg:flex-row lg:items-start lg:gap-5 xl:gap-6">
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col lg:min-h-0">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-stretch lg:gap-3 xl:gap-3.5">
              <div className="flex min-h-0 min-w-0">
                <NetWorthGrowthChart />
              </div>
              <div className="flex min-h-0 min-w-0">
                <AssetAllocationChart />
              </div>
            </div>
          </div>

          <div className="min-w-0 w-full shrink-0 lg:flex lg:max-h-[min(72dvh,520px)] lg:w-[min(100%,292px)] lg:min-w-[260px] lg:max-w-[320px] lg:flex-col lg:overflow-hidden xl:max-h-[min(64dvh,480px)] xl:w-[280px] xl:min-w-[272px] xl:max-w-[300px]">
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain lg:max-h-full xl:pr-0.5">
              <InsightsSidebar />
            </div>
          </div>
        </div>

        <div id="premium-portfolio-assets" className="mt-4 min-w-0 scroll-mt-28 sm:mt-5 xl:mt-4">
          <AssetsDataTable />
        </div>

        <BottomSummaryStrip />
      </div>
    </div>
  );
}
