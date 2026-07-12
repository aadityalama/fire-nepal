import type { Metadata } from "next";
import { EducationDashboard } from "@/components/family-module/EducationDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Education | FIRE Nepal",
  description:
    "School schedule, homework, exam calendar, fee history, teacher notes, GPA analytics, and education fund planning.",
  alternates: buildCanonicalAlternates("/education"),
};

export default function EducationPage() {
  return <EducationDashboard />;
}
