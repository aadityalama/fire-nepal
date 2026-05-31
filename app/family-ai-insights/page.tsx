import type { Metadata } from "next";
import { FamilyAiInsightsWealthPage } from "@/components/family-module/FamilyAiInsightsWealthPage";

export const metadata: Metadata = {
  title: "Family AI Insights | FIRE Nepal",
  description: "Family-scoped AI signals and insights inside your FIRE Nepal wealth workspace.",
};

export default function FamilyAiInsightsPage() {
  return <FamilyAiInsightsWealthPage />;
}
