import type { Metadata } from "next";
import { FireBizInventoryPage } from "@/components/fire-biz/FireBizListPages";

export const metadata: Metadata = {
  title: "Inventory | FIRE Biz | FIRE Nepal",
  description: "Track stock levels, cost, and selling prices.",
};

export default function Page() {
  return <FireBizInventoryPage />;
}
