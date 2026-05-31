import type { Metadata } from "next";
import { FamilySettingsWealthPage } from "@/components/family-module/FamilySettingsWealthPage";

export const metadata: Metadata = {
  title: "Family Settings | FIRE Nepal",
  description: "Household preferences and family module controls for FIRE Nepal.",
};

export default function FamilySettingsPage() {
  return <FamilySettingsWealthPage />;
}
