import type { Metadata } from "next";
import { NepseWatchlistPage } from "@/components/market/NepseWatchlistPage";
import { NEPSE_HUB_TEMPORARILY_DISABLED } from "@/lib/market/nepse-hub-maintenance";

export const metadata: Metadata = {
  title: "Watchlist | FIRE Nepal NEPSE Hub",
  description: NEPSE_HUB_TEMPORARILY_DISABLED
    ? "We are working on it. Premium NEPSE Hub is temporarily unavailable."
    : "Track NEPSE companies with live prices, daily change and cloud-synced watchlist.",
};

export default function WatchlistRoute() {
  if (NEPSE_HUB_TEMPORARILY_DISABLED) return null;
  return <NepseWatchlistPage />;
}
