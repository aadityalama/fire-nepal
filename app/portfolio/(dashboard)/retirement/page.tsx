import type { Metadata } from "next";
import { PortfolioRetirementPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Retirement Assets | Portfolio | FIRE Nepal",
  description: "401k, NPS, pension pots, and other global retirement balances.",
};

export default function Page() {
  return <PortfolioRetirementPage />;
}
