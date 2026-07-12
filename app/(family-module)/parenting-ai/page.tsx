import type { Metadata } from "next";
import { ParentingAiDashboard } from "@/components/family-module/ParentingAiDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Parenting AI | FIRE Nepal",
  description: "AI insights, financial alerts, behavior signals, education forecasts, and recommendations.",
  alternates: buildCanonicalAlternates("/parenting-ai"),
};

export default function ParentingAiPage() {
  return <ParentingAiDashboard />;
}
