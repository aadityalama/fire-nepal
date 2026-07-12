import type { Metadata } from "next";
import { SipCalculatorDashboard } from "@/components/SipCalculatorDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Investment Planner | FIRE Nepal",
  description:
    "Compare mutual funds, stocks, real estate, and fixed deposits with SIP growth projections for Nepalis abroad.",
  alternates: buildCanonicalAlternates("/investment-planner"),
};

export default function InvestmentPlannerPage() {
  return <SipCalculatorDashboard />;
}
