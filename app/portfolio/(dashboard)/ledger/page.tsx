import type { Metadata } from "next";
import { PortfolioLedgerPage } from "@/components/portfolio/portfolio-route-views";

export const metadata: Metadata = {
  title: "Master Ledger | Portfolio | FIRE Nepal",
  description: "Cross-asset master ledger generated from portfolio activity.",
};

export default function Page() {
  return <PortfolioLedgerPage />;
}
