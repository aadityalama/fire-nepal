import type { Metadata } from "next";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { SavingsTrackerDashboard } from "@/components/savings-tracker/SavingsTrackerDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Savings Tracker | FIRE Nepal",
  description:
    "Premium NPR savings dashboard — FIRE glide path, analytics, and AI-style insights for Nepalis abroad (local-first demo).",
  alternates: buildCanonicalAlternates("/savings-tracker"),
};

export default function SavingsTrackerPage() {
  return (
    <DashboardAccessGuard>
      <SavingsTrackerDashboard />
    </DashboardAccessGuard>
  );
}
