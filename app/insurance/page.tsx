import type { Metadata } from "next";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { InsuranceWorkspaceDashboard } from "@/components/insurance-workspace/InsuranceWorkspaceDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Insurance Workspace | FIRE Nepal",
  description:
    "Premium FIRE AI insurance workspace — protection score, health & life coverage recommendations, renewals, and Return to Nepal readiness.",
  alternates: buildCanonicalAlternates("/insurance"),
};

export default function InsuranceWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <InsuranceWorkspaceDashboard />
    </DashboardAccessGuard>
  );
}
