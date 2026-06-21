import type { Metadata } from "next";
import { FireBizInvoicePageClient } from "@/components/fire-biz/FireBizInvoicePageClient";

export const metadata: Metadata = {
  title: "Invoice | FIRE Biz",
  description: "View, print, and download FIRE Biz invoice.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FireBizInvoicePageClient saleId={id} />;
}
