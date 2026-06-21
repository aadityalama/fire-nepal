import type { Metadata } from "next";
import { FireBizMoreHubPage } from "@/components/fire-biz/FireBizMobileHubPages";

export const metadata: Metadata = {
  title: "More | FIRE Biz",
  description: "Reports, settings, and FIRE Biz shortcuts.",
};

export default function Page() {
  return <FireBizMoreHubPage />;
}
