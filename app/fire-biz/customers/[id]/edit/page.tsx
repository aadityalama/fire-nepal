import type { Metadata } from "next";
import { FireBizCustomerFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Edit Customer | FIRE Biz | FIRE Nepal",
  description: "Edit customer details.",
};

type Props = { params: Promise<{ id: string }> };

export default async function Page({ params }: Props) {
  const { id } = await params;
  return <FireBizCustomerFormPage editId={id} />;
}
