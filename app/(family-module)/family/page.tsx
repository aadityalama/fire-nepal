import type { Metadata } from "next";
import { FamilyHubDashboard } from "@/components/family-module/FamilyHubDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Family Hub | FIRE Nepal",
  description: "Family stability, bills, children overview, calendar, AI insights, and goals.",
  alternates: buildCanonicalAlternates("/family"),
};

export default function FamilyHubPage() {
  return <FamilyHubDashboard />;
}
