import type { Metadata } from "next";
import { FireBizSaleFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "New Sale | FIRE Biz | FIRE Nepal",
  description: "Record a new sale or invoice.",
};

export default function Page() {
  return <FireBizSaleFormPage />;
}
