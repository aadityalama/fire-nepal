import type { InvestmentKind } from "@/components/portfolio/types";

/** Deterministic mock “live” multiplier vs buy (placeholder until real feed). */
export function mockLiveMultiplier(id: string, kind: InvestmentKind): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const kindBias: Record<InvestmentKind, number> = {
    crypto: 0.18,
    nepse: 0.08,
    us_stock: 0.1,
    etf: 0.06,
    sip: 0.05,
    closed_end_mf: 0.06,
  };
  const spread = 0.12 + kindBias[kind];
  const t = (h % 1000) / 1000;
  return 1 - spread / 2 + t * spread;
}

/** Mock NPR per gram (placeholder live rates). */
export function mockMetalRateNprPerGram(metal: "gold" | "silver"): number {
  return metal === "gold" ? 12850 : 152;
}
