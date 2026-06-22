import type { Metadata } from "next";
import { FireBizInventoryFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Add Item | FIRE Biz | FIRE Nepal",
  description: "Add a new inventory item.",
};

export default function Page() {
  return <FireBizInventoryFormPage />;
}
