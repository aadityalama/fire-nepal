import type { Metadata } from "next";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { CashflowDashboard } from "@/components/cashflow/CashflowDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Cashflow | FIRE Nepal",
  description:
    "Income, expenses, emergency fund runway, and savings rate — a premium cashflow view for Nepalis worldwide (local-first, NPR display).",
  alternates: buildCanonicalAlternates("/cashflow-dashboard"),
};

export default function CashflowDashboardPage() {
  return (
    <DashboardAccessGuard>
      <CashflowDashboard />
    </DashboardAccessGuard>
  );
}
