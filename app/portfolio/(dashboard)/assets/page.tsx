import type { Metadata } from "next";
import { PortfolioAssetsHubPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Assets Hub | Portfolio | FIRE Nepal",
  description: "Banking & cash, gold, vehicles, and real estate — unified entry to your asset modules.",
};

export default function Page() {
  return <PortfolioAssetsHubPage />;
}
