import type { MarketSnapshot } from "@/types/market";

const TROY_OZ_GRAMS = 31.1034768;

export function metalsNprPerGramFromSnapshot(snap: MarketSnapshot, usdPerNpr: number): {
  goldNprPerGram: number;
  silverNprPerGram: number;
} {
  const nprPerUsd = 1 / Math.max(usdPerNpr, 1e-12);
  const gUsd = snap.metalsUsdOz.goldUsdPerOz;
  const sUsd = snap.metalsUsdOz.silverUsdPerOz;
  return {
    goldNprPerGram: (gUsd * nprPerUsd) / TROY_OZ_GRAMS,
    silverNprPerGram: (sUsd * nprPerUsd) / TROY_OZ_GRAMS,
  };
}

export function mergePartialSnapshots(base: MarketSnapshot, patch: Partial<MarketSnapshot>): MarketSnapshot {
  return {
    ...base,
    ...patch,
    sourceStatus: { ...base.sourceStatus, ...patch.sourceStatus },
    nepseTerminal: patch.nepseTerminal ?? base.nepseTerminal,
    nepseBySymbol: { ...base.nepseBySymbol, ...patch.nepseBySymbol },
    usdEquities: { ...base.usdEquities, ...patch.usdEquities },
    krEquities: { ...base.krEquities, ...patch.krEquities },
    crypto: { ...base.crypto, ...patch.crypto },
    metalsUsdOz: { ...base.metalsUsdOz, ...patch.metalsUsdOz },
    partial: base.partial || Boolean(patch.partial),
  };
}
