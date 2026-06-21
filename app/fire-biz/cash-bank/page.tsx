import type { Metadata } from "next";
import { FireBizCashBankPage } from "@/components/fire-biz/FireBizListPages";

export const metadata: Metadata = {
  title: "Cash & Bank | FIRE Biz | FIRE Nepal",
  description: "Monitor cash flow across cash and bank accounts.",
};

export default function Page() {
  return <FireBizCashBankPage />;
}
