import type { Metadata } from "next";
import { FireBizPurchaseFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "New Purchase | FIRE Biz | FIRE Nepal",
  description: "Record a new purchase or bill.",
};

export default function Page() {
  return <FireBizPurchaseFormPage />;
}
