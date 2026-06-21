import type { Metadata } from "next";
import { FireBizSalesPage } from "@/components/fire-biz/FireBizListPages";

export const metadata: Metadata = {
  title: "Sales | FIRE Biz | FIRE Nepal",
  description: "Record sales invoices and track receivables.",
};

export default function Page() {
  return <FireBizSalesPage />;
}
