import type { Metadata } from "next";
import { FireBizCustomerFormPage } from "@/components/fire-biz/FireBizFormPages";

export const metadata: Metadata = {
  title: "Add Customer | FIRE Biz | FIRE Nepal",
  description: "Add a new customer to your business.",
};

export default function Page() {
  return <FireBizCustomerFormPage />;
}
