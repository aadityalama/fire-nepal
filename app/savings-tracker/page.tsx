import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { SavingsTrackerDashboard } from "@/components/savings-tracker/SavingsTrackerDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Saving Goals | FIRE Nepal",
  description:
    "Premium NPR saving goals dashboard — FIRE glide path, analytics, and AI-style insights for Nepalis abroad (local-first demo).",
  alternates: buildCanonicalAlternates("/savings-tracker"),
};

export default function SavingsTrackerPage() {
  return (
    <DashboardAccessGuard>
      <Suspense fallback={<div className="min-h-[100dvh] bg-[#020806]" />}>
        <SavingsTrackerDashboard />
      </Suspense>
    </DashboardAccessGuard>
  );
}
