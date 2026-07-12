import type { Metadata } from "next";
import { SipCalculatorDashboard } from "@/components/SipCalculatorDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "SIP Calculator | FIRE Nepal",
  description:
    "Premium FIRE Nepal SIP calculator for Nepali workers abroad with KRW, NPR, and USD support, compound growth charts, FIRE analytics, and Korea salary investing simulations.",
  alternates: buildCanonicalAlternates("/sip-calculator"),
};

export default function SipCalculatorPage() {
  return <SipCalculatorDashboard />;
}
