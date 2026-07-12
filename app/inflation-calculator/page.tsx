import type { Metadata } from "next";
import { InflationCalculatorDashboard } from "@/components/InflationCalculatorDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Inflation Calculator Nepal | FIRE Nepal",
  description:
    "Free Nepal inflation calculator for FIRE planning. Estimate future value, purchasing power loss, inflation impact, and year-by-year NPR projections.",
  alternates: buildCanonicalAlternates("/inflation-calculator"),
};

export default function InflationCalculatorPage() {
  return <InflationCalculatorDashboard />;
}
