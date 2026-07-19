import type { Metadata } from "next";
import { SipCalculatorDashboard } from "@/components/SipCalculatorDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "SIP Calculator | FIRE Nepal",
  description:
    "Premium FIRE Nepal SIP calculator in NPR with compound growth charts, FIRE analytics, and long-term wealth projections.",
  alternates: buildCanonicalAlternates("/sip-calculator"),
};

export default function SipCalculatorPage() {
  return <SipCalculatorDashboard />;
}
