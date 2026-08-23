import type { Metadata } from "next";
import { InflationCalculatorDashboard } from "@/components/InflationCalculatorDashboard";
import { FinancialFreedomRelatedLink } from "@/components/financial-freedom/FinancialFreedomRelatedLink";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Inflation Calculator Nepal | FIRE Nepal",
  description:
    "Free Nepal inflation calculator for FIRE planning. Estimate future value, purchasing power loss, inflation impact, and year-by-year NPR projections.",
  alternates: buildCanonicalAlternates("/inflation-calculator"),
};

export default function InflationCalculatorPage() {
  return (
    <>
      <InflationCalculatorDashboard />
      <div className="bg-[#f4fbf6] px-4 pb-16">
        <div className="mx-auto max-w-6xl">
          <FinancialFreedomRelatedLink
            anchor="financial freedom planning"
            note="Stress-test independence targets against rising Nepal costs."
          />
        </div>
      </div>
    </>
  );
}
