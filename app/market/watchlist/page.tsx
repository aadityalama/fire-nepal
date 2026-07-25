import type { Metadata } from "next";
import { NepseWatchlistPage } from "@/components/market/NepseWatchlistPage";

export const metadata: Metadata = {
  title: "Watchlist | FIRE Nepal NEPSE Hub",
  description: "Track NEPSE companies with live prices, daily change and cloud-synced watchlist.",
};

export default function WatchlistRoute() {
  return <NepseWatchlistPage />;
}
