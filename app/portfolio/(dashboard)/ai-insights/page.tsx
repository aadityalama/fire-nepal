import type { Metadata } from "next";
import { PortfolioAiInsightsPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "AI Wealth Insights | Portfolio | FIRE Nepal",
  description: "AI narrative intelligence, financial coach, and smart intelligence rollups.",
};

export default function Page() {
  return <PortfolioAiInsightsPage />;
}
