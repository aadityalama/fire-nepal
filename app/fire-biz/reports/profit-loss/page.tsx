import type { Metadata } from "next";
import { FireBizProfitLossPage } from "@/components/fire-biz/FireBizProfitLossPage";

export const metadata: Metadata = {
  title: "Profit & Loss | FIRE Biz",
  description: "Revenue, purchases, expenses, and net profit report.",
};

export default function Page() {
  return <FireBizProfitLossPage />;
}
