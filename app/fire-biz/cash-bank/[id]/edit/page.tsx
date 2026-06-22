import type { Metadata } from "next";
import { FireBizTransactionFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Edit Transaction | FIRE Biz | FIRE Nepal",
  description: "Edit cash or bank transaction.",
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <FireBizTransactionFormPage editId={id} />;
}
