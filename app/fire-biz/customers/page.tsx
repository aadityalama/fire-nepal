import type { Metadata } from "next";
import { FireBizCustomersPage } from "@/components/fire-biz/FireBizListPages";

export const metadata: Metadata = {
  title: "Customers | FIRE Biz | FIRE Nepal",
  description: "Manage customer contacts and outstanding balances.",
};

export default function Page() {
  return <FireBizCustomersPage />;
}
