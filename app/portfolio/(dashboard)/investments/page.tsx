import type { Metadata } from "next";
import { PortfolioInvestmentsPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "NEPSE Portfolio | FIRE Nepal",
  description: "Mobile-first NEPSE portfolio dashboard — holdings, transactions, corporate actions, and analytics.",
};

export default function Page() {
  return <PortfolioInvestmentsPage />;
}
