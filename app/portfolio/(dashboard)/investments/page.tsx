import type { Metadata } from "next";
import { PortfolioInvestmentsPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Investments | Portfolio | FIRE Nepal",
  description: "Nepse, global equities, funds, and crypto with live FX where applicable.",
};

export default function Page() {
  return <PortfolioInvestmentsPage />;
}
