import type { Metadata } from "next";
import { FireMembershipPage } from "@/components/dashboard/FireMembershipPage";

export const metadata: Metadata = {
  title: "Membership | FIRE Nepal Dashboard",
  description: "Free, Premium, and Elite tiers — upgrade, compare features, usage limits, and billing-ready roadmap.",
};

export default function DashboardMembershipPage() {
  return <FireMembershipPage />;
}
