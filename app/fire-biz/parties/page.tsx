import type { Metadata } from "next";
import { FireBizPartiesHubPage } from "@/components/fire-biz/FireBizMobileHubPages";

export const metadata: Metadata = {
  title: "Parties | FIRE Biz",
  description: "Customers and suppliers for your business.",
};

export default function Page() {
  return <FireBizPartiesHubPage />;
}
