import type { Metadata } from "next";
import { FireAiCoachDashboardPage } from "@/components/dashboard/FireAiCoachDashboardPage";

export const metadata: Metadata = {
  title: "AI Coach | FIRE Nepal Dashboard",
  description:
    "AI wealth intelligence — FIRE probability, portfolio diagnostics, Korea worker desk, alerts, and simulation scenarios (deterministic desk engine).",
};

export default function DashboardAiCoachPage() {
  return <FireAiCoachDashboardPage />;
}
