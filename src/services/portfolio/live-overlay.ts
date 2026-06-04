import { computeWealthTotals } from "@/components/portfolio/calculations";
import type { WealthPortfolioStateV2 } from "@/components/portfolio/types";
import type { LivePortfolioOverlay } from "@/types/portfolio/live";
import type { MarketSnapshot } from "@/types/market";

export function buildLivePortfolioOverlay(
  state: WealthPortfolioStateV2,
  krwPerNpr: number,
  usdPerNpr: number,
  snapshot: MarketSnapshot,
  bullionGramRatesNpr?: { goldNprPerGram: number; silverNprPerGram: number } | null,
): LivePortfolioOverlay {
  const bullionOpts = { bullionGramRatesNpr: bullionGramRatesNpr ?? null };
  const totalsBase = computeWealthTotals(state, krwPerNpr, usdPerNpr, bullionOpts);
  const totalsLive = computeWealthTotals(state, krwPerNpr, usdPerNpr, { ...bullionOpts, liveMarket: snapshot });
  return {
    snapshot,
    totalsLive,
    totalsBase,
    deltaNetWorthNpr: totalsLive.netWorthNpr - totalsBase.netWorthNpr,
    deltaInvestmentsPnlNpr: totalsLive.investmentsPnlNpr - totalsBase.investmentsPnlNpr,
  };
}
