import type { Metadata } from "next";
import { NepseHubDashboard } from "@/components/market/NepseHubDashboard";

export const metadata: Metadata = {
  title: "NEPSE Hub | FIRE Nepal",
  description:
    "Live NEPSE market intelligence, charts, market breadth, watchlists, portfolio insights and professional research tools.",
};

export default function MarketPage() {
  return <NepseHubDashboard />;
}
