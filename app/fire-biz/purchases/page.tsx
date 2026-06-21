import type { Metadata } from "next";
import { FireBizPurchasesPage } from "@/components/fire-biz/FireBizListPages";

export const metadata: Metadata = {
  title: "Purchases | FIRE Biz | FIRE Nepal",
  description: "Track purchase bills and supplier payables.",
};

export default function Page() {
  return <FireBizPurchasesPage />;
}
