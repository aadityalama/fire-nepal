import type { Metadata } from "next";
import { FireBizPurchaseOrdersPage } from "@/components/fire-biz/FireBizPurchaseOrdersPage";

export const metadata: Metadata = {
  title: "Purchase Orders | FIRE Biz",
  description: "Create and track purchase orders.",
};

export default function Page() {
  return <FireBizPurchaseOrdersPage />;
}
