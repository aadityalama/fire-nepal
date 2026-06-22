import type { Metadata } from "next";
import { FireBizPurchaseFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Edit Purchase | FIRE Biz | FIRE Nepal",
  description: "Edit purchase or bill details.",
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <FireBizPurchaseFormPage editId={id} />;
}
