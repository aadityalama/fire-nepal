import type { Metadata } from "next";
import { FireMyProfilePage } from "@/components/dashboard/FireMyProfilePage";

export const metadata: Metadata = {
  title: "My Profile | FIRE Nepal Dashboard",
  description: "Manage your FIRE Nepal personal account information, profile details, membership, and settings.",
};

export default function DashboardProfilePage() {
  return <FireMyProfilePage />;
}
