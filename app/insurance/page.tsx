import type { Metadata } from "next";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { InsuranceWorkspaceDashboard } from "@/components/insurance-workspace/InsuranceWorkspaceDashboard";

export const metadata: Metadata = {
  title: "Insurance Workspace | FIRE Nepal",
  description:
    "Premium FIRE AI insurance workspace — protection score, health & life coverage recommendations, renewals, and Return to Nepal readiness.",
};

export default function InsuranceWorkspacePage() {
  return (
    <DashboardAccessGuard>
      <InsuranceWorkspaceDashboard />
    </DashboardAccessGuard>
  );
}
