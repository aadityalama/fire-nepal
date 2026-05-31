import type { Metadata } from "next";
import { FamilyHubDashboard } from "@/components/family-module/FamilyHubDashboard";

export const metadata: Metadata = {
  title: "Family Hub | FIRE Nepal",
  description: "Family stability, bills, children overview, calendar, AI insights, and goals.",
};

export default function FamilyHubPage() {
  return <FamilyHubDashboard />;
}
