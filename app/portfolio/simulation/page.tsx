import type { Metadata } from "next";
import { WealthSimulationDashboard } from "@/components/portfolio/simulation/WealthSimulationDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Wealth Simulation | FIRE Nepal",
  description:
    "FIRE age, net worth projections, scenario lab, and stress insights—NPR, KRW, and USD—built on your stored portfolio.",
  alternates: buildCanonicalAlternates("/portfolio/simulation"),
};

export default function WealthSimulationPage() {
  return <WealthSimulationDashboard />;
}
