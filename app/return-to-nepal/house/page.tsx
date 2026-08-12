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
        <Suspense fallback={<div className="min-h-screen bg-[#000805]" />}>
          <ReturnToNepalHouseDecisionPage />
        </Suspense>
      </ReturnToNepalProvider>
    </DashboardAccessGuard>
  );
}
