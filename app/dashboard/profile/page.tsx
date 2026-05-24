import type { Metadata } from "next";
import { FirePremiumProfilePage } from "@/components/dashboard/FirePremiumProfilePage";

export const metadata: Metadata = {
  title: "Profile | FIRE Nepal Dashboard",
  description: "Edit your FIRE Nepal member profile and view live wealth widgets.",
};

export default function DashboardProfilePage() {
  return <FirePremiumProfilePage />;
}
