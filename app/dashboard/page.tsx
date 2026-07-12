import type { Metadata } from "next";
import { FirePremiumProfilePage } from "@/components/dashboard/FirePremiumProfilePage";

export const metadata: Metadata = {
  title: "Dashboard | FIRE Nepal",
  description: "Your FIRE Nepal dashboard with workspace overview, profile summary, and live financial widgets.",
};

export default function DashboardIndexPage() {
  return <FirePremiumProfilePage />;
}
