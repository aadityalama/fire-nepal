import type { Metadata } from "next";
import { NepseHubMaintenanceScreen } from "@/components/market/NepseHubMaintenanceScreen";

export const metadata: Metadata = {
  title: "NEPSE Hub | FIRE Nepal",
  description: "We are working on it. Premium NEPSE Hub is temporarily unavailable.",
  robots: { index: false, follow: false },
};

/**
 * Premium NEPSE Hub is temporarily offline.
 *
 * Intentionally does NOT mount:
 * - WealthPortfolioProvider / RealtimeMarketProvider (Hub live polling)
 * - NepseMarketShell / bottom nav (Hub terminal, screener, watchlist, AI)
 * - Child Hub pages (dashboard, company, 52-week scans)
 *
 * NEPSE Portfolio and My NEPSE Holdings live under `/portfolio/*` and keep their
 * own layout providers. Shared market APIs stay enabled for those pages.
 */
export default function MarketLayout({ children }: { children: React.ReactNode }) {
  void children;
  return <NepseHubMaintenanceScreen />;
}
