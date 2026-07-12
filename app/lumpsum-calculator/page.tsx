import type { Metadata } from "next";
import { LumpsumCalculatorDashboard } from "@/components/LumpsumCalculatorDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Lumpsum Calculator | FIRE Nepal",
  description:
    "Premium FIRE Nepal lumpsum investment calculator with KRW/NPR support, compound growth charts, inflation-adjusted projections, and Nepal retirement planning.",
  alternates: buildCanonicalAlternates("/lumpsum-calculator"),
};

export default function LumpsumCalculatorPage() {
  return <LumpsumCalculatorDashboard />;
}
