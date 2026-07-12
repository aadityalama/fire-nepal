import type { Metadata } from "next";
import { GlobalFinancialIntelligenceDashboard } from "@/components/global-financial-intelligence/GlobalFinancialIntelligenceDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Global Financial Intelligence | FIRE Nepal",
  description:
    "Live forex, NEPSE, Korea stocks, metals, crypto, macro, and FIRE impact analytics for Nepalis abroad.",
  alternates: buildCanonicalAlternates("/global-financial-intelligence"),
};

export default function GlobalFinancialIntelligencePage() {
  return <GlobalFinancialIntelligenceDashboard />;
}
