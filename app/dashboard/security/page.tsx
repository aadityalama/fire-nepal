import type { Metadata } from "next";
import { FireSecurityDashboardPage } from "@/components/dashboard/FireSecurityDashboardPage";

export const metadata: Metadata = {
  title: "Security | FIRE Nepal Dashboard",
  description: "Sessions, verification, passwords, and trust controls for your FIRE Nepal workspace.",
};

export default function DashboardSecurityPage() {
  return <FireSecurityDashboardPage />;
}
