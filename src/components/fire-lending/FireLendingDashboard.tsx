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
import { motion } from "framer-motion";
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

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function FireLendingDashboard() {
  const { summary, kpis, loading } = useFireLending();

  return (
    <LendingMobileScreen>
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3.5 sm:gap-4">
        <motion.div variants={item} className="sticky top-[4.25rem] z-20 -mx-1 px-1 lg:static lg:z-auto">
          <FireLendingHeroCard summary={summary} loading={loading} />
        </motion.div>

        <motion.section variants={item} aria-label="Lending KPIs" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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
        </motion.section>

        <motion.div variants={item} className="grid gap-3.5 lg:grid-cols-2">
          <FireLendingAiPanel />
          <FireLendingUpcomingPayments />
        </motion.div>

        <motion.div variants={item}>
          <FireLendingAgreementCenter />
        </motion.div>

        <motion.div variants={item}>
          <FireLendingDashboardAnalytics />
        </motion.div>

        <motion.div variants={item} className="grid gap-3.5 lg:grid-cols-2">
          <FireLendingTopBorrowers />
          <FireLendingRecentActivity />
        </motion.div>
      </motion.div>

      <LendingSpeedDial />
    </LendingMobileScreen>
  );
}
