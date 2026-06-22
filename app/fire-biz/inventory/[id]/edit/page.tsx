import type { Metadata } from "next";
import { FireBizInventoryFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Edit Item | FIRE Biz | FIRE Nepal",
  description: "Edit inventory item details.",
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <FireBizInventoryFormPage editId={id} />;
}
