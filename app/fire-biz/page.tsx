import type { Metadata } from "next";
import { FireBizDashboard } from "@/components/fire-biz/FireBizDashboard";

export const metadata: Metadata = {
  title: "FIRE Biz Dashboard | FIRE Nepal",
  description: "Business management dashboard for Nepali entrepreneurs — sales, purchases, inventory, and reports.",
};

export default function Page() {
  return <FireBizDashboard />;
}
