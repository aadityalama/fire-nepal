import type { Metadata } from "next";
import { FireSettingsPage } from "@/components/dashboard/FireSettingsPage";

export const metadata: Metadata = {
  title: "Settings | FIRE Nepal Dashboard",
  description: "Workspace preferences for your FIRE Nepal account.",
};

export default function DashboardSettingsPage() {
  return <FireSettingsPage />;
}
