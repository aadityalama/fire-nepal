import type { Metadata } from "next";
import { DashboardAccessGuard } from "@/components/auth/DashboardAccessGuard";
import { EmergencyFundDashboard } from "@/components/emergency-fund/EmergencyFundDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Emergency Fund | FIRE Nepal",
  description:
    "Budget-powered emergency fund planning — lifestyle protection, safety runway, funding plans, and stress simulations for Nepalis abroad.",
  alternates: buildCanonicalAlternates("/emergency-fund"),
};

export default function EmergencyFundPage() {
  return (
    <DashboardAccessGuard>
      <EmergencyFundDashboard />
    </DashboardAccessGuard>
  );
}
