import type { Metadata } from "next";
import { ChildrenDashboard } from "@/components/family-module/ChildrenDashboard";

export const metadata: Metadata = {
  title: "Children | FIRE Nepal",
  description: "Child profiles, attendance, exams, study streaks, activity, and sleep quality.",
};

export default function ChildrenPage() {
  return <ChildrenDashboard />;
}
