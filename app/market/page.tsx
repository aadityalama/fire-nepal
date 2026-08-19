import type { Metadata } from "next";
import { NepseHubDashboard } from "@/components/market/NepseHubDashboard";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

export const metadata: Metadata = {
  title: "NEPSE Hub | FIRE Nepal",
  description: NEPSE_HUB_TEMPORARILY_DISABLED
    ? "We are working on it. Premium NEPSE Hub is temporarily unavailable."
    : "Live NEPSE market intelligence, charts, market breadth, watchlists, portfolio insights and professional research tools.",
};

export default function MarketPage() {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  return <NepseHubDashboard />;
}
