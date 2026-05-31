import type { Metadata } from "next";
import { FireMembershipPage } from "@/components/dashboard/FireMembershipPage";

export const metadata: Metadata = {
  title: "Membership | FIRE Nepal Dashboard",
  description:
    "Founder annual pricing for Free, Premium, and Elite — compare features, usage limits, and upgrade path for FIRE Nepal.",
};

export default function DashboardMembershipPage() {
  return <FireMembershipPage />;
}
