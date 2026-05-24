import type { Metadata } from "next";
import { WealthSimulationDashboard } from "@/components/portfolio/simulation/WealthSimulationDashboard";

export const metadata: Metadata = {
  title: "Wealth Simulation | FIRE Nepal",
  description:
    "FIRE age, net worth projections, scenario lab, and stress insights—NPR, KRW, and USD—built on your stored portfolio.",
};

export default function WealthSimulationPage() {
  return <WealthSimulationDashboard />;
}
