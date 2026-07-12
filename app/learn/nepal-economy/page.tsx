import type { Metadata } from "next";
import { NepalEconomyDashboard } from "@/components/learn/NepalEconomyDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Nepal Economy | FIRE Nepal",
  description:
    "Latest insights on Nepal's economy, inflation, interest rates, remittance trends, stock market, real estate, and financial opportunities.",
  alternates: buildCanonicalAlternates("/learn/nepal-economy"),
};

export default function NepalEconomyPage() {
  return <NepalEconomyDashboard />;
}
