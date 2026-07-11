import type { Metadata } from "next";
import { FireBizSupplierFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Add Supplier | FIRE Biz | FIRE Nepal",
  description: "Add a new supplier to your business.",
};

export default function Page() {
  return <FireBizSupplierFormPage />;
}
