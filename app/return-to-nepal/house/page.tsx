import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { ReturnToNepalHouseDecisionPage } from "@/components/return-to-nepal/ReturnToNepalHouseDecisionPage";
import { ReturnToNepalProvider } from "@/contexts/ReturnToNepalContext";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "House in Nepal | Return Planner | FIRE Nepal",
  description: "Choose your Nepal housing plan for Return Readiness — buy/build, already own, or not needed.",
  alternates: buildCanonicalAlternates("/return-to-nepal/house"),
};

export default function ReturnToNepalHousePage() {
  return (
    <DashboardAccessGuard>
      <ReturnToNepalProvider>
        <Suspense
          fallback={
            <div className="min-h-screen bg-[#000805] px-4 pt-6 text-white" data-testid="house-plan-shell">
              <h1 className="text-xl font-black tracking-tight">House in Nepal</h1>
              <p className="mt-1 text-sm font-semibold text-emerald-100/50">Loading housing plan…</p>
            </div>
          }
        >
          <ReturnToNepalHouseDecisionPage />
        </Suspense>
      </ReturnToNepalProvider>
    </DashboardAccessGuard>
  );
}
