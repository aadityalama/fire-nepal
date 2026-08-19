import type { Metadata } from "next";
import { NepseScreenerPage } from "@/components/market/NepseScreenerPage";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

export const metadata: Metadata = {
  title: "Stock Screener | FIRE Nepal NEPSE Hub",
  description: NEPSE_HUB_TEMPORARILY_DISABLED
    ? "We are working on it. Premium NEPSE Hub is temporarily unavailable."
    : "Filter every NEPSE company by sector, price, change, volume and turnover with live data.",
};

export default function ScreenerRoute() {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  return <NepseScreenerPage />;
}
