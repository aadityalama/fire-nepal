import type { Metadata } from "next";
import { FireBizInventoryHubPage } from "@/components/fire-biz/FireBizMobileHubPages";

export const metadata: Metadata = {
  title: "Inventory | FIRE Biz | FIRE Nepal",
  description: "Track stock levels, cost, and selling prices.",
};

export default function Page() {
  return <FireBizInventoryHubPage />;
}
