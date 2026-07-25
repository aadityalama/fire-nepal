import type { Metadata } from "next";
import { PortfolioInvestmentsPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "NEPSE Portfolio | FIRE Nepal",
  description: "NEPSE portfolio overview with holdings, transactions, corporate actions, and analytics.",
};

export default function Page() {
  return <PortfolioInvestmentsPage />;
}
