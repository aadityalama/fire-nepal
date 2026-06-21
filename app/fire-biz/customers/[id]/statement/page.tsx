import type { Metadata } from "next";
import { FireBizCustomerStatementPage } from "@/components/fire-biz/FireBizCustomerStatementPage";

export const metadata: Metadata = {
  title: "Customer Statement | FIRE Biz",
  description: "Customer ledger and outstanding balance.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FireBizCustomerStatementPage customerId={id} />;
}
