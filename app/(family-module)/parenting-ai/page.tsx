import type { Metadata } from "next";
import { ParentingAiDashboard } from "@/components/family-module/ParentingAiDashboard";

export const metadata: Metadata = {
  title: "Parenting AI | FIRE Nepal",
  description: "AI insights, financial alerts, behavior signals, education forecasts, and recommendations.",
};

export default function ParentingAiPage() {
  return <ParentingAiDashboard />;
}
