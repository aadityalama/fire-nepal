import type { Metadata } from "next";
import { ChildrenDashboard } from "@/components/family-module/ChildrenDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "Children | FIRE Nepal",
  description: "Child profiles, attendance, exams, study streaks, activity, and sleep quality.",
  alternates: buildCanonicalAlternates("/children"),
};

export default function ChildrenPage() {
  return <ChildrenDashboard />;
}
