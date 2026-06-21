import type { Metadata } from "next";
import { FireBizSettingsPage } from "@/components/fire-biz/FireBizSettingsPage";

export const metadata: Metadata = {
  title: "Settings | FIRE Biz | FIRE Nepal",
  description: "Configure your business profile and preferences.",
};

export default function Page() {
  return <FireBizSettingsPage />;
}
