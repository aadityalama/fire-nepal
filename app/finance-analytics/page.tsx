import type { Metadata } from "next";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { HistoricalFinanceDashboard } from "@/components/finance-analytics/HistoricalFinanceDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Finance History | FIRE Nepal",
  description:
    "Historical income, expenses, savings rate, and cashflow analytics for your FIRE Nepal finance workspace.",
  alternates: buildCanonicalAlternates("/finance-analytics"),
};

export default function FinanceAnalyticsPage() {
  return (
    <DashboardAccessGuard>
      <HistoricalFinanceDashboard />
    </DashboardAccessGuard>
  );
}
