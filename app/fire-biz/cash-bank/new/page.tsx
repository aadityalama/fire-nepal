import type { Metadata } from "next";
import { FireBizTransactionFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Add Transaction | FIRE Biz | FIRE Nepal",
  description: "Record a cash or bank transaction.",
};

export default function Page() {
  return <FireBizTransactionFormPage />;
}
