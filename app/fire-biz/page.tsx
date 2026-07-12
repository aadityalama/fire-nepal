import type { Metadata } from "next";
import { FireBizDashboard } from "@/components/fire-biz/FireBizDashboard";
import { buildCanonicalAlternates } from "@/lib/brand/site-seo";

export const metadata: Metadata = {
  title: "FIRE Biz Dashboard | FIRE Nepal",
  description: "Business management dashboard for Nepali entrepreneurs — sales, purchases, inventory, and reports.",
  alternates: buildCanonicalAlternates("/fire-biz"),
};

export default function Page() {
  return <FireBizDashboard />;
}
