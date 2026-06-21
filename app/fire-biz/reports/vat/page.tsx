import type { Metadata } from "next";
import { FireBizVatReportsPage } from "@/components/fire-biz/FireBizVatReportsPage";

export const metadata: Metadata = {
  title: "VAT Report | FIRE Biz",
  description: "Nepali VAT billing and tax invoice reports.",
};

export default function Page() {
  return <FireBizVatReportsPage />;
}
