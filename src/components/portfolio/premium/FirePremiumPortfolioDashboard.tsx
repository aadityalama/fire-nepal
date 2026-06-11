"use client";

import { CalendarClock, Flame, PiggyBank, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { netWorthMonthOverMonthPercent } from "@/components/portfolio/calculations";
import { AssetAllocationChart } from "@/components/portfolio/premium/AssetAllocationChart";
import { AssetsDataTable } from "@/components/portfolio/premium/AssetsDataTable";
import { BottomSummaryStrip } from "@/components/portfolio/premium/BottomSummaryStrip";
import { DashboardHeader } from "@/components/portfolio/premium/DashboardHeader";
import { InsightsSidebar } from "@/components/portfolio/premium/InsightsSidebar";
import { KpiMetricCard } from "@/components/portfolio/premium/KpiMetricCard";
import { NetWorthGrowthChart } from "@/components/portfolio/premium/NetWorthGrowthChart";
import { formatNpr, nprToUsdLabel } from "@/data/fire-premium-dashboard";
import { useProductAuth } from "@/contexts/ProductAuthContext";
import { useWealthPortfolio } from "@/contexts/WealthPortfolioContext";
import { useUnifiedFireSummary } from "@/lib/fire-nepal/use-unified-fire-summary";

function flatSparkline(value: number, len = 8): number[] {
  return Array.from({ length: len }, () => value);
}

function formatEstFiDate(monthsToFi: number | null | undefined): string {
  if (monthsToFi == null || !Number.isFinite(monthsToFi) || monthsToFi < 1 || monthsToFi > 720) return "—";
  const d = new Date();
  d.setMonth(d.getMonth() + Math.round(monthsToFi));
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fiCountdownLabel(monthsToFi: number | null | undefined): string {
  if (monthsToFi == null || !Number.isFinite(monthsToFi) || monthsToFi < 1 || monthsToFi > 720) {
    return "Add assets and cashflow to estimate timing.";
  }
  const m = Math.round(monthsToFi);
  const y = Math.floor(m / 12);
  const mo = m % 12;
  return `${y} years, ${mo} months remaining (desk model)`;
}

export function FirePremiumPortfolioDashboard() {
  const { user } = useProductAuth();
  const { totals, passiveMonthly, state, hydrated, coachSnapshot, usdPerNpr, fireScore } = useWealthPortfolio();
  const { summary } = useUnifiedFireSummary();

  const displayName = user?.name?.trim() || "Member";

  const nwHistory = useMemo(() => state.netWorthHistory ?? [], [state.netWorthHistory]);
  const nwSpark = useMemo(() => {
    const sorted = [...nwHistory].sort((a, b) => a.month.localeCompare(b.month));
    const vals = sorted.map((p) => p.netWorthNpr);
    if (vals.length >= 2) return vals.slice(-8);
    return flatSparkline(totals.netWorthNpr, 8);
  }, [nwHistory, totals.netWorthNpr]);

  const passiveSpark = useMemo(() => flatSparkline(passiveMonthly, 8), [passiveMonthly]);

  const firePct = summary.fireProgressPct ?? 0;
  const fireSpark = useMemo(() => flatSparkline(firePct, 8), [firePct]);

  const fireNumber = summary.fireNumber25xAnnualSpendNpr;
  const fireNumberSpark = useMemo(() => flatSparkline(fireNumber, 8), [fireNumber]);

  const nwMom = useMemo(() => netWorthMonthOverMonthPercent(nwHistory), [nwHistory]);

  const fireProgressDelta = useMemo(() => {
    if (nwHistory.length < 2 || fireNumber < 1) return null;
    const sorted = [...nwHistory].sort((a, b) => a.month.localeCompare(b.month));
    const cur = sorted[sorted.length - 1]?.netWorthNpr ?? 0;
    const prev = sorted[sorted.length - 2]?.netWorthNpr ?? 0;
    const prevPct = Math.min(100, (prev / fireNumber) * 100);
    const curPct = Math.min(100, (cur / fireNumber) * 100);
    return curPct - prevPct;
  }, [nwHistory, fireNumber]);

  const netWorthNpr = hydrated ? totals.netWorthNpr : 0;
  const passiveNpr = hydrated ? passiveMonthly : 0;

  const fiMonths = coachSnapshot.monthsToFi;
  const fiSpark = useMemo(() => flatSparkline(Math.min(fiMonths ?? 0, 360) || 0, 8), [fiMonths]);

  return (
    <div className="fn-premium-portfolio-root w-full min-w-0 max-w-full">
      <div className="fn-premium-portfolio-scale-inner fn-premium-portfolio wealth-dash-flow w-full min-w-0 max-w-full overflow-x-hidden pb-2 sm:pb-2.5 xl:pb-3">
        <DashboardHeader userName={displayName} />

        {/* Mobile: 2×2 core KPIs; tablet: 4-up; desktop: 5 columns with FI date at end */}
        <section className="mt-4 grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          <KpiMetricCard
            label="Total net worth"
            icon={Wallet}
            value={formatNpr(netWorthNpr)}
            usdHint={nprToUsdLabel(netWorthNpr, usdPerNpr)}
            deltaLabel={nwMom != null ? `${nwMom >= 0 ? "↑" : "↓"} ${Math.abs(nwMom).toFixed(1)}% vs last month` : undefined}
            deltaPositive={nwMom == null ? true : nwMom >= 0}
            sparkline={nwSpark}
          />
          <KpiMetricCard
            label="Monthly passive income"
            icon={PiggyBank}
            value={formatNpr(passiveNpr)}
            usdHint={nprToUsdLabel(passiveNpr, usdPerNpr)}
            deltaLabel={undefined}
            deltaPositive
            sparkline={passiveSpark}
            sparkVariant="amber"
          />
          <KpiMetricCard
            label="FIRE progress"
            icon={Flame}
            value={`${firePct.toFixed(1)}%`}
            deltaLabel={
              fireProgressDelta != null
                ? `${fireProgressDelta >= 0 ? "↑" : "↓"} ${Math.abs(fireProgressDelta).toFixed(1)} pts vs last month`
                : undefined
            }
            deltaPositive={fireProgressDelta == null ? true : fireProgressDelta >= 0}
            sparkline={fireSpark}
            progressPct={firePct}
          />
          <KpiMetricCard
            label="FIRE number"
            icon={Target}
            value={fireNumber > 0 ? formatNpr(fireNumber) : "—"}
            usdHint={fireNumber > 0 ? nprToUsdLabel(fireNumber, usdPerNpr) : undefined}
            deltaLabel={fireNumber > 0 ? "25× annual spend (from cashflow)" : undefined}
            sparkline={fireNumberSpark}
            sparkVariant="violet"
            footer={
              fireNumber > 0 ? `${firePct.toFixed(1)}% of your FIRE number` : "Track Your First Expense in cashflow to set a FIRE number."
            }
          />
          <div className="col-span-2 lg:col-span-4 xl:col-span-1">
            <KpiMetricCard
              label="Estimated FIRE date"
              icon={CalendarClock}
              value={formatEstFiDate(fiMonths)}
              deltaLabel="Desk projection from your workspace"
              deltaPositive
              sparkline={fiSpark}
              sparkVariant="violet"
              footer={fiCountdownLabel(fiMonths)}
            />
          </div>
        </section>

        {/* Executive strip: dense secondary context (display-only; totals from context) */}
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-[20px] border border-white/[0.08] bg-[#0B1623]/80 p-4 shadow-[0_16px_36px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.03] backdrop-blur-xl sm:grid-cols-4 sm:gap-4">
          {(
            [
              { name: "Total assets", primary: formatNpr(hydrated ? totals.totalAssetsNpr : 0), sub: "Gross stack" },
              { name: "Liabilities", primary: formatNpr(hydrated ? totals.liabilitiesNpr : 0), sub: "Debt" },
              { name: "Investable", primary: formatNpr(hydrated ? totals.investableNpr : 0), sub: "Liquid + listed" },
              { name: "FIRE readiness score", primary: `${fireScore}`, sub: "/ 100 · composite" },
            ] as const
          ).map((row) => (
            <div key={row.name} className="min-w-0 border-b border-white/[0.04] pb-1.5 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-white/65">{row.name}</p>
              <p className="mt-1 truncate text-sm font-bold tabular-nums tracking-tight text-white">{row.primary}</p>
              <p className="truncate text-[10px] font-semibold text-[#A7B4C4]">{row.sub}</p>
            </div>
          ))}
        </div>

        {totals.totalAssetsNpr <= 0 && totals.liabilitiesNpr <= 0 ? (
          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] px-4 py-5 text-center sm:mt-5 sm:px-5 sm:py-6">
            <p className="text-lg font-black text-white">Start Your FIRE Journey</p>
            <p className="mt-2 text-sm font-medium text-emerald-100/75">
              Your dashboard starts at zero. Add banking, investments, or property from the sidebar — everything updates from your own
              records.
            </p>
            <Link
              href="/portfolio/assets"
              className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-2.5 text-xs font-black text-emerald-950 shadow-lg transition hover:-translate-y-0.5"
            >
              Add Your First Asset
            </Link>
          </div>
        ) : null}

        <div className="mt-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col lg:min-h-0">
            <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.28fr)_minmax(280px,0.72fr)] lg:items-stretch">
              <div className="flex min-h-0 min-w-0">
                <NetWorthGrowthChart />
              </div>
              <div className="flex min-h-0 min-w-0">
                <AssetAllocationChart />
              </div>
            </div>
          </div>

          <div className="min-w-0 w-full shrink-0 lg:flex lg:max-h-[min(78dvh,620px)] lg:w-[320px] lg:min-w-[320px] lg:max-w-[360px] lg:flex-col lg:overflow-hidden xl:max-h-[min(70dvh,520px)] xl:w-[320px] xl:min-w-[320px] xl:max-w-[360px]">
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain lg:max-h-full xl:pr-0.5">
              <InsightsSidebar />
            </div>
          </div>
        </div>

        <div id="premium-portfolio-assets" className="mt-4 min-w-0 scroll-mt-24">
          <AssetsDataTable />
        </div>

        <BottomSummaryStrip />
      </div>
    </div>
  );
}
