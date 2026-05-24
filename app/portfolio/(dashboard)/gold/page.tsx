import type { Metadata } from "next";
import { PortfolioGoldPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Gold & Silver | Portfolio | FIRE Nepal",
  description: "Gold and silver holdings with NPR marks and ledger sync.",
};

export default function Page() {
  return <PortfolioGoldPage />;
}
