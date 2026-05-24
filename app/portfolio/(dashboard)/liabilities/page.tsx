import type { Metadata } from "next";
import { PortfolioLiabilitiesPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Liabilities | Portfolio | FIRE Nepal",
  description: "Loans, cards, and obligations synced with net worth.",
};

export default function Page() {
  return <PortfolioLiabilitiesPage />;
}
