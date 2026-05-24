import type { Metadata } from "next";
import { PortfolioRealEstatePage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Real Estate | Portfolio | FIRE Nepal",
  description: "Homes, rentals, land, and commercial property modeled in NPR.",
};

export default function Page() {
  return <PortfolioRealEstatePage />;
}
