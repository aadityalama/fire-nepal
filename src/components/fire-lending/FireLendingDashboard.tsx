"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BadgeCheck,
  HandCoins,
  Wallet,
} from "lucide-react";
import { LendingSpeedDial } from "@/components/fire-lending/FireLendingFloatingActionButton";
import { FireLendingHeroCard } from "@/components/fire-lending/FireLendingHeroCard";
import { FireLendingDashboardAnalytics } from "@/components/fire-lending/FireLendingDashboardAnalytics";
import {
  FireLendingAgreementCenter,
  FireLendingAiPanel,
  FireLendingRecentActivity,
  FireLendingTopBorrowers,
  FireLendingUpcomingPayments,
} from "@/components/fire-lending/FireLendingDashboardWidgets";
import { LendingMobileScreen } from "@/components/fire-lending/FireLendingMobileScreens";
import { LendingKpiCard, LendingSkeletonCard } from "@/components/fire-lending/FireLendingUiPrimitives";
import { useFireLending } from "@/contexts/FireLendingContext";

const KPI_ICONS = {
  lent: ArrowUpRight,
  borrowed: ArrowDownLeft,
  outstanding: Wallet,
  interest: HandCoins,
  collection: Activity,
  due: AlertTriangle,
  overdue: AlertTriangle,
  trust: BadgeCheck,
} as const;

/**
 * All dashboard sections share one document-flow column.
 * Do not wrap Hero in sticky/fixed or place any overflow-y scroller around a subset of sections.
 * (Previous bug: sticky top-[4.25rem] on the Hero wrapper made it leave the scrolling column on mobile.)
 */
export function FireLendingDashboard() {
  const { summary, kpis, loading } = useFireLending();

  return (
    <LendingMobileScreen>
      <div className="flex flex-col gap-3.5 sm:gap-4">
        <div className="-mx-1 px-1">
          <FireLendingHeroCard summary={summary} loading={loading} />
        </div>

        <section aria-label="Lending KPIs" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <LendingSkeletonCard key={i} className="h-[126px]" />)
            : kpis.map((kpi) => (
                <LendingKpiCard
                  key={kpi.key}
                  label={kpi.label}
                  value={kpi.value}
                  icon={KPI_ICONS[kpi.key as keyof typeof KPI_ICONS] ?? Wallet}
                  changePct={kpi.changePct}
                  sparkline={kpi.sparkline}
                  accent={kpi.accent}
                  loading={loading}
                  href={
                    kpi.key === "trust"
                      ? "/fire-lending/trust-score"
                      : kpi.key === "overdue" || kpi.key === "due"
                        ? "/fire-lending/installments"
                        : "/fire-lending/analytics"
                  }
                />
              ))}
        </section>

        <div className="grid gap-3.5 lg:grid-cols-2">
          <FireLendingAiPanel />
          <FireLendingUpcomingPayments />
        </div>

        <FireLendingAgreementCenter />

        <FireLendingDashboardAnalytics />

        <div className="grid gap-3.5 lg:grid-cols-2">
          <FireLendingTopBorrowers />
          <FireLendingRecentActivity />
        </div>
      </div>

      <LendingSpeedDial />
    </LendingMobileScreen>
  );
}
