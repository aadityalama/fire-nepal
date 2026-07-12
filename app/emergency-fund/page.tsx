import type { Metadata } from "next";
import { EmergencyFundDashboard } from "@/components/emergency-fund/EmergencyFundDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Emergency Fund | FIRE Nepal",
  description:
    "Emergency fund readiness, runway analytics, stress tests, and KRW/NPR safety planning for Nepalis abroad.",
  alternates: buildCanonicalAlternates("/emergency-fund"),
};

export default function EmergencyFundPage() {
  return <EmergencyFundDashboard />;
}
