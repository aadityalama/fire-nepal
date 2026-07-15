import type { Metadata } from "next";
import { SwpCalculator } from "@/components/SwpCalculator";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "SWP Calculator | FIRE Nepal",
  description:
    "Premium systematic withdrawal planner in Nepalese Rupees (NPR) with inflation modeling, sustainability score, and FIRE-safe withdrawal insights.",
  alternates: buildCanonicalAlternates("/swp-calculator"),
};

export default function SwpCalculatorPage() {
  return <SwpCalculator />;
}
