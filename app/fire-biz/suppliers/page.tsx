import type { Metadata } from "next";
import { FireBizSuppliersPage } from "@/components/fire-biz/FireBizListPages";

export const metadata: Metadata = {
  title: "Suppliers | FIRE Biz | FIRE Nepal",
  description: "Manage supplier contacts and payables.",
};

export default function Page() {
  return <FireBizSuppliersPage />;
}
