import type { Metadata } from "next";
import { PortfolioDashboard } from "@/components/PortfolioDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Portfolio | FIRE Nepal",
  description:
    "Track life wealth across assets abroad, Nepal assets, liquid cash, investments, and liabilities — NPR, KRW, and USD in one modular dashboard.",
  alternates: buildCanonicalAlternates("/portfolio"),
};

export default function PortfolioOverviewRoute() {
  return <PortfolioDashboard />;
}
