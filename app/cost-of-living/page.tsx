import type { Metadata } from "next";
import { NepalCostOfLivingDashboard } from "@/components/nepal-cost-of-living/NepalCostOfLivingDashboard";

export const metadata: Metadata = {
  title: "Nepal Cost of Living | FIRE Nepal",
  description:
    "Premium mobile cost-of-living dashboard for Nepalis abroad — city lifestyle costs, savings model, and retirement readiness.",
};

export default function CostOfLivingPage() {
  return <NepalCostOfLivingDashboard />;
}
