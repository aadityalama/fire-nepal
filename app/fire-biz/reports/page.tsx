import type { Metadata } from "next";
import { FireBizReportsPage } from "@/components/fire-biz/FireBizReportsPage";

export const metadata: Metadata = {
  title: "Reports | FIRE Biz | FIRE Nepal",
  description: "Sales trends, purchase breakdown, and profit overview.",
};

export default function Page() {
  return <FireBizReportsPage />;
}
