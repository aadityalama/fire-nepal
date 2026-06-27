import type { Metadata } from "next";
import { NepalCostOfLivingDashboard } from "@/components/nepal-cost-of-living/NepalCostOfLivingDashboard";

export const metadata: Metadata = {
  title: "Nepal Cost of Living Intelligence | FIRE Nepal",
  description:
    "Interactive Nepal lifestyle cost, FIRE corpus, retirement readiness, and diaspora savings simulator for Nepalis worldwide.",
};

export default function CostOfLivingPage() {
  return <NepalCostOfLivingDashboard />;
}
