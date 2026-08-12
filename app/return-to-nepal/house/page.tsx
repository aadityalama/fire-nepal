import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { HouseInNepalDecisionPage } from "@/components/return-to-nepal/HouseInNepalDecisionPage";
import { ReturnToNepalProvider } from "@/contexts/ReturnToNepalContext";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "House in Nepal | Return Checklist | FIRE Nepal",
  description: "Choose whether you already own a house in Nepal, plan to buy/build, or do not need one.",
  alternates: buildCanonicalAlternates("/return-to-nepal/house"),
};

export default function ReturnToNepalHousePage() {
  return (
    <DashboardAccessGuard>
      <ReturnToNepalProvider>
        <Suspense fallback={<div className="min-h-screen bg-[#000805]" />}>
          <HouseInNepalDecisionPage />
        </Suspense>
      </ReturnToNepalProvider>
    </DashboardAccessGuard>
  );
}
