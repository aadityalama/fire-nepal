import type { Metadata } from "next";
import { PensionSeveranceDashboard } from "@/components/PensionSeveranceDashboard";

export const metadata: Metadata = {
  title: "Korea Pension + Severance | FIRE Nepal",
  description:
    "OCR salary slips, track 국민연금 and 퇴직금, AI insights, KRW→NPR, charts, and PDF export — for Nepali workers in Korea.",
};

export default function KoreaPensionDashboardPage() {
  return <PensionSeveranceDashboard />;
}
