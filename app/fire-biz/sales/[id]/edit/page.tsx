import type { Metadata } from "next";
import { FireBizSaleFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Edit Sale | FIRE Biz | FIRE Nepal",
  description: "Edit sale or invoice details.",
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <FireBizSaleFormPage editId={id} />;
}
