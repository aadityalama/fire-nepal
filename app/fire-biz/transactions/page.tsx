import type { Metadata } from "next";
import { FireBizTransactionsHubPage } from "@/components/fire-biz/FireBizMobileHubPages";

export const metadata: Metadata = {
  title: "Transactions | FIRE Biz",
  description: "Sales, purchases, cash flow, and expenses.",
};

export default function Page() {
  return <FireBizTransactionsHubPage />;
}
