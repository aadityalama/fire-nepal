import type { Metadata } from "next";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { ReturnToNepalPlannerDashboard } from "@/components/return-to-nepal/ReturnToNepalPlannerDashboard";
import { ReturnToNepalProvider } from "@/contexts/ReturnToNepalContext";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

/** App route: `/return-to-nepal` — production Return OS fed by live FIRE Nepal financial data. */
export const metadata: Metadata = {
  title: "Return to Nepal Planner | FIRE Nepal",
  description:
    "Premium life-transition OS for Nepalis abroad — auto-calculated return readiness from income, portfolio, Nepal cost of living, savings, SSF, and insurance.",
  alternates: buildCanonicalAlternates("/return-to-nepal"),
};

export default function ReturnToNepalPage() {
  return (
    <DashboardAccessGuard>
      <ReturnToNepalProvider>
        <ReturnToNepalPlannerDashboard />
      </ReturnToNepalProvider>
    </DashboardAccessGuard>
  );
}
